/**
 * Reads the whole active catalogue and maps rows to the types in `src/lib/types.ts`.
 * Pure (no Next.js imports) so `scripts/db-check.ts` can use it too. Images stay as
 * Storage paths here; `src/lib/catalog.ts` turns them into URLs.
 *
 * One snapshot per cache entry is simpler and faster than a query per page, and stays fine up
 * to a few thousand products (search and filters run over it in memory, Phase 8).
 */
import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/lib/db/schema";
import type { Bundle, Collection, Product, ProductBadge, Tag, Variant } from "@/lib/types";

export type CatalogSnapshot = {
  collections: Collection[];
  /** Active tags, by group then sort order. */
  tags: Tag[];
  products: Product[];
  variants: Variant[];
  bundles: Bundle[];
};

type Db = PostgresJsDatabase<typeof schema>;

const BADGES: readonly ProductBadge[] = ["new", "bestseller"];
const isBadge = (b: string): b is ProductBadge => (BADGES as readonly string[]).includes(b);

/**
 * `includeTest` (Phase 12): test products, their designs and any box holding them are left
 * out unless asked for. Only the shop on preview / the laptop and back-in-stock alerts ask.
 */
export async function loadCatalogSnapshot(
  db: Db,
  { includeTest = false }: { includeTest?: boolean } = {},
): Promise<CatalogSnapshot> {
  const { collections, products, variants, bundles, bundleItems, bundlePool, tags, productTags } =
    schema;
  // One query at a time: running these in parallel hangs inside Next's build workers
  // (seen with Next 16.4.3 + postgres.js). The result is cached, so the extra ~100 ms
  // only happens on a cache miss.
  const collectionRows = await db
    .select()
    .from(collections)
    .where(eq(collections.active, true))
    .orderBy(asc(collections.sortOrder));
  const allProductRows = await db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.sortOrder));
  const productRows = includeTest ? allProductRows : allProductRows.filter((p) => !p.isTest);
  const testProducts = new Set(allProductRows.filter((p) => p.isTest).map((p) => p.id));
  const variantRows = (
    await db
      .select()
      .from(variants)
      .where(eq(variants.active, true))
      .orderBy(asc(variants.sortOrder), asc(variants.createdAt))
  ).filter((v) => includeTest || !testProducts.has(v.productId));
  const testVariants = new Set(
    (await db.select({ id: variants.id, productId: variants.productId }).from(variants))
      .filter((v) => testProducts.has(v.productId))
      .map((v) => v.id),
  );
  const itemRows = await db.select().from(bundleItems);
  const poolRows = await db.select().from(bundlePool);
  // A box holding test designs is a test box (the admin keeps it all-test, never mixed).
  const testBundles = new Set(
    [...itemRows, ...poolRows].filter((r) => testVariants.has(r.variantId)).map((r) => r.bundleId),
  );
  const bundleRows = (
    await db.select().from(bundles).where(eq(bundles.active, true)).orderBy(asc(bundles.sortOrder))
  ).filter((b) => includeTest || !testBundles.has(b.id));
  const tagRows = await db
    .select()
    .from(tags)
    .where(eq(tags.active, true))
    .orderBy(asc(tags.groupName), asc(tags.sortOrder), asc(tags.name));
  const productTagRows = await db.select().from(productTags);

  // A subcategory under a hidden category is hidden too.
  const activeIds = new Set(collectionRows.map((c) => c.id));
  const visibleCollections = collectionRows.filter((c) => !c.parentId || activeIds.has(c.parentId));
  // A category with nothing to show is left out (e.g. one holding only test products, on
  // production). A category stays if it or one of its subcategories has a product.
  const withProducts = new Set(
    productRows.filter((p) => activeIds.has(p.collectionId)).map((p) => p.collectionId),
  );
  const shownCollections = visibleCollections.filter(
    (c) =>
      withProducts.has(c.id) ||
      visibleCollections.some((k) => k.parentId === c.id && withProducts.has(k.id)),
  );
  const activeCollections = new Set(visibleCollections.map((c) => c.id));
  const tagSlugById = new Map(tagRows.map((t) => [t.id, t.slug]));
  const tagsByProduct = new Map<string, string[]>();
  for (const r of productTagRows) {
    const tagSlug = tagSlugById.get(r.tagId);
    if (!tagSlug) continue;
    tagsByProduct.set(r.productId, [...(tagsByProduct.get(r.productId) ?? []), tagSlug]);
  }

  return {
    collections: shownCollections.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      image: c.imagePath ?? "",
      parentId: c.parentId,
      sortOrder: c.sortOrder,
    })),
    tags: tagRows.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      group: t.groupName,
      sortOrder: t.sortOrder,
    })),
    products: productRows
      .filter((p) => activeCollections.has(p.collectionId))
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        collectionId: p.collectionId,
        material: p.material,
        sizeLabel: p.sizeLabel,
        ageMin: p.ageMin,
        badges: p.isTest
          ? ["test" as const, ...p.badges.filter(isBadge)]
          : p.badges.filter(isBadge),
        tags: tagsByProduct.get(p.id) ?? [],
        images: p.images,
        video: p.youtubeId ? { youtubeId: p.youtubeId, vertical: p.videoVertical } : null,
        box:
          p.sellBox && p.boxQty && p.boxPriceCents
            ? { qty: p.boxQty, priceCents: p.boxPriceCents }
            : null,
        mixedBox: p.mixedBox,
        sortOrder: p.sortOrder,
        active: p.active,
      })),
    variants: variantRows.map((v) => ({
      id: v.id,
      productId: v.productId,
      slug: v.slug,
      sku: v.sku,
      name: v.name,
      priceCents: v.priceCents,
      compareAtCents: v.compareAtCents,
      stock: v.stock,
      weightGrams: v.weightGrams,
      image: v.imagePath,
    })),
    bundles: bundleRows.map((b): Bundle => {
      const base = {
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: b.description,
        priceCents: b.priceCents,
        images: b.images,
        sortOrder: b.sortOrder,
        active: b.active,
        isTest: testBundles.has(b.id),
      };
      return b.type === "mystery"
        ? {
            ...base,
            type: "mystery",
            pickCount: b.pickCount ?? 1,
            pool: poolRows.filter((r) => r.bundleId === b.id).map((r) => r.variantId),
          }
        : {
            ...base,
            type: "fixed",
            items: itemRows
              .filter((r) => r.bundleId === b.id)
              .map((r) => ({ variantId: r.variantId, qty: r.qty })),
          };
    }),
  };
}
