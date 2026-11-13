/**
 * Catalogue types. Shaped like the Phase 2 database tables, so pages written against them
 * keep working when `src/lib/catalog.ts` switches from sample data to Supabase.
 */

export type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Card image for "shop by collection". */
  image: string;
  /** Null for a top-level category; else the category this subcategory sits in. */
  parentId: string | null;
  sortOrder: number;
};

/** A filter label shared across categories (Phase 8 D3). */
export type Tag = {
  id: string;
  slug: string;
  name: string;
  /** Filter section, e.g. "Size", "Feel", "Extras". */
  group: string;
  sortOrder: number;
};

/** "test": a Phase 12 test product (only ever seen on preview / the laptop). */
export type ProductBadge = "new" | "bestseller" | "test";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  collectionId: string;
  /** Shown in the safety block, e.g. "PU foam (slow-rise)". */
  material: string;
  /** e.g. "About 20 cm long". */
  sizeLabel: string;
  /** Minimum recommended age. Always 14 (Ironbark rules: adult desk/EDC products). */
  ageMin: number;
  badges: ProductBadge[];
  /** Slugs of active tags. */
  tags: string[];
  images: string[];
  /** YouTube video shown above the reviews (Phase 10), or null. */
  video: ProductVideo | null;
  /** Full supplier box customers can buy (Phase 11), or null when not sold by the box. */
  box: ProductBox | null;
  /** The box holds mixed colours/designs, so a single is picked at random (Phase 11). */
  mixedBox: boolean;
  /** Lower comes first in "Featured" sort. */
  sortOrder: number;
  active: boolean;
};

export type ProductVideo = {
  youtubeId: string;
  /** A Short (9:16); otherwise wide (16:9). */
  vertical: boolean;
};

export type ProductBox = {
  /** Pieces in one box, e.g. 12. */
  qty: number;
  priceCents: number;
};

export type Variant = {
  id: string;
  productId: string;
  /** URL key for the variant picker (`?v=`), unique within its product. */
  slug: string;
  sku: string;
  /** Design/colour name. Products with one variant use "Default". */
  name: string;
  priceCents: number;
  /** Previous price, shown struck through. Null when not on sale. */
  compareAtCents: number | null;
  stock: number;
  weightGrams: number;
  /** Optional image for this design; falls back to the product images. */
  image: string | null;
};

export type BundleItem = { variantId: string; qty: number };

type BundleBase = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  images: string[];
  sortOrder: number;
  active: boolean;
  /** Phase 12: holds test designs, so only on preview / the laptop. */
  isTest?: boolean;
};

/** A combo with set contents. It has no stock of its own. */
export type FixedBundle = BundleBase & { type: "fixed"; items: BundleItem[] };

/** A blind box: `pickCount` items picked from `pool` when the order is packed. */
export type MysteryBundle = BundleBase & { type: "mystery"; pool: string[]; pickCount: number };

export type Bundle = FixedBundle | MysteryBundle;

export type StockState = "in_stock" | "low" | "sold_out";
