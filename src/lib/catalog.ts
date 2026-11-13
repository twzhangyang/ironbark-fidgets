/**
 * The only way pages read the catalogue. One cached snapshot of the database (tag
 * `catalog`; anything that changes products or stock calls `revalidateTag("catalog")`),
 * mapped to `src/lib/types.ts` with image URLs. Checkout must re-read stock fresh, never
 * from here.
 */
import { cacheLife, cacheTag } from "next/cache";

import {
  allPublicReviews,
  allRatings,
  type PublicReview,
  toPublic,
  type Rating,
  type ReviewTarget,
} from "@/lib/account/reviews";
import {
  applyFilters,
  type Facets,
  facets,
  NO_FILTERS,
  type ShopFilters,
} from "@/lib/catalog-filters";
import { search } from "@/lib/catalog-search";
import { loadCatalogSnapshot } from "@/lib/db/catalog-snapshot";
import { showTestProducts } from "@/lib/test-mode";
import { db } from "@/lib/db/client";
import { imageUrl } from "@/lib/images";
import {
  bundleAvailable,
  bundleSaving,
  priceRange,
  productStockState,
  stockState,
} from "@/lib/stock";
import type { Bundle, Collection, Product, StockState, Tag, Variant } from "@/lib/types";

export type ProductSort = "featured" | "price-asc" | "price-desc";
export const PRODUCT_SORTS: readonly ProductSort[] = ["featured", "price-asc", "price-desc"];

export type ProductSummary = {
  product: Product;
  collection: Collection;
  variants: Variant[];
  minPriceCents: number;
  maxPriceCents: number;
  /** "Was" price, when every variant shares one (single-variant sale items). */
  compareAtCents: number | null;
  stock: StockState;
  /** Published reviews; null when none yet. */
  rating: Rating | null;
};

export type BundleContent = { product: Product; variant: Variant; qty: number };

export type BundleSummary = {
  bundle: Bundle;
  /** Boxes that can be sold right now. */
  available: number;
  stock: StockState;
  savingCents: number;
  /** Fixed: the set contents. Mystery: every design in the pool (qty 1 each). */
  contents: BundleContent[];
  rating: Rating | null;
};

type Catalog = {
  collections: Collection[];
  tags: Tag[];
  products: Product[];
  variants: Variant[];
  bundles: Bundle[];
  variantsById: ReadonlyMap<string, Variant>;
  productsById: ReadonlyMap<string, Product>;
  collectionsById: ReadonlyMap<string, Collection>;
  productRatings: ReadonlyMap<string, Rating>;
  boxRatings: ReadonlyMap<string, Rating>;
};

async function loadSnapshot() {
  "use cache";
  cacheTag("catalog", "reviews");
  cacheLife("minutes");
  const [s, ratings] = await Promise.all([
    loadCatalogSnapshot(db, { includeTest: showTestProducts() }),
    allRatings(db),
  ]);
  // A product with no active variants can't be shown or bought.
  const withVariants = new Set(s.variants.map((v) => v.productId));
  // A collection without its own picture uses its first product's (incl. subcategories).
  const firstImage = (id: string) =>
    s.products.find(
      (p) =>
        p.images[0] &&
        withVariants.has(p.id) &&
        (p.collectionId === id ||
          s.collections.some((c) => c.id === p.collectionId && c.parentId === id)),
    )?.images[0] ?? "";
  return {
    collections: s.collections.map((c) => ({
      ...c,
      image: imageUrl(c.image || firstImage(c.id)),
    })),
    tags: s.tags,
    products: s.products
      .filter((p) => withVariants.has(p.id))
      .map((p) => ({ ...p, images: p.images.map(imageUrl) })),
    variants: s.variants.map((v) => ({ ...v, image: v.image ? imageUrl(v.image) : null })),
    bundles: s.bundles.map((b) => ({ ...b, images: b.images.map(imageUrl) })),
    productRatings: [...ratings.products],
    boxRatings: [...ratings.boxes],
  };
}

async function getCatalog(): Promise<Catalog> {
  const s = await loadSnapshot();
  return {
    ...s,
    variantsById: new Map(s.variants.map((v) => [v.id, v])),
    productsById: new Map(s.products.map((p) => [p.id, p])),
    collectionsById: new Map(s.collections.map((c) => [c.id, c])),
    productRatings: new Map(s.productRatings),
    boxRatings: new Map(s.boxRatings),
  };
}

function summarise(cat: Catalog, product: Product): ProductSummary {
  const own = cat.variants.filter((v) => v.productId === product.id);
  const { min, max } = priceRange(own);
  const compareAts = new Set(own.map((v) => v.compareAtCents));
  const collection = cat.collectionsById.get(product.collectionId);
  if (!collection) throw new Error(`Product ${product.slug} has no collection`);
  return {
    product,
    collection,
    variants: own,
    minPriceCents: min,
    maxPriceCents: max,
    compareAtCents: compareAts.size === 1 ? [...compareAts][0] : null,
    stock: productStockState(own),
    rating: cat.productRatings.get(product.id) ?? null,
  };
}

function sortProducts(list: ProductSummary[], sort: ProductSort): ProductSummary[] {
  const sorted = [...list];
  if (sort === "price-asc") sorted.sort((a, b) => a.minPriceCents - b.minPriceCents);
  else if (sort === "price-desc") sorted.sort((a, b) => b.minPriceCents - a.minPriceCents);
  else sorted.sort((a, b) => a.product.sortOrder - b.product.sortOrder);
  // Sold-out items sink to the end, whatever the sort.
  return sorted.sort((a, b) => Number(a.stock === "sold_out") - Number(b.stock === "sold_out"));
}

export async function getCollections(): Promise<Collection[]> {
  return (await getCatalog()).collections;
}

/**
 * The categories customers see, in sort order: every subcategory, and a top-level category on
 * its own when it has none. A category with subcategories (Food) only groups them in the admin;
 * the shop never shows it, so there is one flat level to pick from.
 */
export async function getShopCategories(): Promise<Collection[]> {
  return shopCategories((await getCatalog()).collections);
}

function shopCategories(all: Collection[]): Collection[] {
  return all
    .filter((c) => !c.parentId)
    .flatMap((category) => {
      const children = all.filter((c) => c.parentId === category.id);
      return children.length ? children : [category];
    });
}

export async function getTags(): Promise<Tag[]> {
  return (await getCatalog()).tags;
}

/** The collection and, for a category, all its subcategories. */
function collectionScope(cat: Catalog, collection: Collection): Set<string> {
  return new Set([
    collection.id,
    ...cat.collections.filter((c) => c.parentId === collection.id).map((c) => c.id),
  ]);
}

export async function getProducts({
  collectionSlug,
  sort = "featured",
}: { collectionSlug?: string; sort?: ProductSort } = {}): Promise<ProductSummary[]> {
  const cat = await getCatalog();
  const collection = collectionSlug
    ? (cat.collections.find((c) => c.slug === collectionSlug) ?? null)
    : null;
  if (collectionSlug && !collection) return [];
  const scope = collection ? collectionScope(cat, collection) : null;
  const list = cat.products
    .filter((p) => !scope || scope.has(p.collectionId))
    .map((p) => summarise(cat, p));
  return sortProducts(list, sort);
}

export type Listing = {
  products: ProductSummary[];
  facets: Facets;
  /** Products before filters. */
  total: number;
};

function filtered(cat: Catalog, list: ProductSummary[], filters: ShopFilters): Listing {
  const view = list.map((s) => ({
    s,
    tags: s.product.tags,
    minPriceCents: s.minPriceCents,
    stock: s.stock,
  }));
  return {
    products: applyFilters(view, filters, cat.tags).map((v) => v.s),
    facets: facets(view, filters, cat.tags),
    total: list.length,
  };
}

/** A shop page: products in a collection (or all), filtered and sorted, with filter counts. */
export async function getListing({
  collectionSlug,
  sort = "featured",
  filters = NO_FILTERS,
}: {
  collectionSlug?: string;
  sort?: ProductSort;
  filters?: ShopFilters;
}): Promise<Listing> {
  const cat = await getCatalog();
  return filtered(cat, await getProducts({ collectionSlug, sort }), filters);
}

/** Search results, best first (sold out last), with filters applied (Phase 8 D5). */
export async function searchProducts(q: string, filters = NO_FILTERS): Promise<Listing> {
  const cat = await getCatalog();
  const tagNames = new Map(cat.tags.map((t) => [t.slug, t.name]));
  const docs = cat.products.map((p) => {
    const trail = [cat.collectionsById.get(p.collectionId)];
    const parentId = trail[0]?.parentId;
    if (parentId) trail.push(cat.collectionsById.get(parentId));
    const designs = cat.variants.filter((v) => v.productId === p.id);
    return {
      id: p.id,
      name: p.name,
      related: [
        ...trail.flatMap((c) => (c ? [c.name] : [])),
        ...p.tags.map((t) => tagNames.get(t) ?? t),
        ...designs.flatMap((v) => (v.name === "Default" ? [v.sku] : [v.name, v.sku])),
      ],
      description: p.description,
    };
  });
  const list = search(docs, q).map((id) => summarise(cat, cat.productsById.get(id)!));
  list.sort((a, b) => Number(a.stock === "sold_out") - Number(b.stock === "sold_out"));
  return filtered(cat, list, filters);
}

export async function getProductBySlug(slug: string): Promise<ProductSummary | null> {
  const cat = await getCatalog();
  const product = cat.products.find((p) => p.slug === slug);
  return product ? summarise(cat, product) : null;
}

export async function getNewArrivals(limit = 4): Promise<ProductSummary[]> {
  const all = await getProducts();
  const fresh = all.filter((s) => s.product.badges.includes("new") && s.stock !== "sold_out");
  const rest = all.filter((s) => !fresh.includes(s) && s.stock !== "sold_out");
  return [...fresh, ...rest].slice(0, limit);
}

/**
 * "You might also like" (Phase 8 D8): same subcategory, then same category, then shared tags,
 * then anything else in stock.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<ProductSummary[]> {
  const cat = await getCatalog();
  const own = cat.collectionsById.get(product.collectionId);
  const categoryId = own?.parentId ?? own?.id;
  const categoryOf = (p: Product) => {
    const c = cat.collectionsById.get(p.collectionId);
    return c?.parentId ?? c?.id;
  };
  const rank = (p: Product) => {
    if (p.collectionId === product.collectionId) return 0;
    if (categoryOf(p) === categoryId) return 1;
    if (p.tags.some((t) => product.tags.includes(t))) return 2;
    return 3;
  };
  return (await getProducts())
    .filter((s) => s.product.id !== product.id && s.stock !== "sold_out")
    .map((s, i) => ({ s, r: rank(s.product), i }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.s);
}

function summariseBundle(cat: Catalog, bundle: Bundle): BundleSummary {
  const lines =
    bundle.type === "fixed"
      ? bundle.items.map((i) => ({ variantId: i.variantId, qty: i.qty }))
      : bundle.pool.map((variantId) => ({ variantId, qty: 1 }));
  const contents: BundleContent[] = lines.flatMap(({ variantId, qty }) => {
    const variant = cat.variantsById.get(variantId);
    const product = variant && cat.productsById.get(variant.productId);
    return variant && product ? [{ product, variant, qty }] : [];
  });
  const available = bundleAvailable(bundle, cat.variantsById);
  return {
    bundle,
    available,
    stock: stockState(available),
    savingCents: bundleSaving(bundle, cat.variantsById),
    contents,
    rating: cat.boxRatings.get(bundle.id) ?? null,
  };
}

export async function getBundles(): Promise<BundleSummary[]> {
  const cat = await getCatalog();
  return cat.bundles
    .map((b) => summariseBundle(cat, b))
    .sort((a, b) => Number(a.stock === "sold_out") - Number(b.stock === "sold_out"));
}

export async function getBundleBySlug(slug: string): Promise<BundleSummary | null> {
  const cat = await getCatalog();
  const bundle = cat.bundles.find((b) => b.slug === slug);
  return bundle ? summariseBundle(cat, bundle) : null;
}

/** Boxes that contain a given product (for "Also in these gift boxes"). */
export async function getBundlesContaining(productId: string): Promise<BundleSummary[]> {
  return (await getBundles()).filter((s) => s.contents.some((c) => c.product.id === productId));
}

async function loadReviews() {
  "use cache";
  cacheTag("reviews");
  cacheLife("minutes");
  const list = await allPublicReviews(db);
  return list.map((r) => ({ ...r, photoPath: r.photoPath ? imageUrl(r.photoPath) : null }));
}

/** Published reviews for a product or box page (tag `reviews`; photos only once approved). */
export async function getReviews(target: ReviewTarget): Promise<PublicReview[]> {
  const all = await loadReviews();
  return all
    .filter((r) => (target.type === "product" ? r.productId : r.bundleId) === target.id)
    .slice(0, 100)
    .map(toPublic);
}
