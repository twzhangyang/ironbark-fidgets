/**
 * Shop filters (Phase 8 D4). Pure: parses the address, filters a product list and counts
 * the options. Within a tag group a product needs any of the chosen tags; across groups, all.
 */
import type { StockState, Tag } from "@/lib/types";

export const PRICE_BANDS = [
  { slug: "under-10", min: 0, max: 1000 },
  { slug: "10-20", min: 1000, max: 2000 },
  { slug: "20-40", min: 2000, max: 4000 },
  { slug: "40-plus", min: 4000, max: Infinity },
] as const;
export type PriceBand = (typeof PRICE_BANDS)[number]["slug"];

export type ShopFilters = {
  /** Tag slugs, sorted, no duplicates. */
  tags: string[];
  price: PriceBand | null;
  inStock: boolean;
};

export const NO_FILTERS: ShopFilters = { tags: [], price: null, inStock: false };

/** What filtering needs from a product. */
export type Filterable = { tags: readonly string[]; minPriceCents: number; stock: StockState };

type Params = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

/** Reads `?tag=a&tag=b&price=10-20&stock=1`. Unknown tags and bands are dropped. */
export function parseFilters(params: Params, known: readonly Tag[]): ShopFilters {
  const slugs = new Set(known.map((t) => t.slug));
  const tags = [...new Set(list(params.tag).filter((t) => slugs.has(t)))].sort();
  const price = PRICE_BANDS.find((b) => b.slug === list(params.price)[0])?.slug ?? null;
  return { tags, price, inStock: list(params.stock)[0] === "1" };
}

export const hasFilters = (f: ShopFilters) => f.tags.length > 0 || f.price !== null || f.inStock;

/** Address for a listing with these filters (stable order, so links are cache friendly). */
export function filterHref(
  basePath: string,
  f: ShopFilters,
  extra: Record<string, string | undefined> = {},
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(extra)) if (v) q.append(k, v);
  for (const t of f.tags) q.append("tag", t);
  if (f.price) q.set("price", f.price);
  if (f.inStock) q.set("stock", "1");
  const s = q.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export function toggleTag(f: ShopFilters, slug: string): ShopFilters {
  const tags = f.tags.includes(slug) ? f.tags.filter((t) => t !== slug) : [...f.tags, slug].sort();
  return { ...f, tags };
}

const inBand = (cents: number, band: PriceBand) => {
  const b = PRICE_BANDS.find((x) => x.slug === band)!;
  return cents >= b.min && cents < b.max;
};

type Check = { tags: boolean; price: boolean; inStock: boolean };
const ALL: Check = { tags: true, price: true, inStock: true };

function matcher(f: ShopFilters, groupOf: ReadonlyMap<string, string>, skipGroup?: string) {
  // Chosen tags by group; the group being counted is left out so its options add up.
  const byGroup = new Map<string, string[]>();
  for (const t of f.tags) {
    const g = groupOf.get(t) ?? "";
    if (g === skipGroup) continue;
    byGroup.set(g, [...(byGroup.get(g) ?? []), t]);
  }
  return (p: Filterable, check: Check = ALL) =>
    (!check.tags || [...byGroup.values()].every((ts) => ts.some((t) => p.tags.includes(t)))) &&
    (!check.price || !f.price || inBand(p.minPriceCents, f.price)) &&
    (!check.inStock || !f.inStock || p.stock !== "sold_out");
}

export const groupMap = (tags: readonly Tag[]) => new Map(tags.map((t) => [t.slug, t.group]));

export function applyFilters<T extends Filterable>(
  items: readonly T[],
  f: ShopFilters,
  tags: readonly Tag[],
): T[] {
  const match = matcher(f, groupMap(tags));
  return items.filter((p) => match(p));
}

export type Facets = {
  /** Tag groups with the tags that would give results, each with its count. */
  groups: { name: string; tags: (Tag & { count: number })[] }[];
  prices: { slug: PriceBand; count: number }[];
  inStock: number;
};

/**
 * Counts for each option given the other chosen filters. Options that would give nothing
 * are left out unless already chosen (so they can still be turned off).
 */
export function facets(items: readonly Filterable[], f: ShopFilters, tags: readonly Tag[]): Facets {
  const groups = groupMap(tags);
  const groupNames = [...new Set(tags.map((t) => t.group))];
  return {
    groups: groupNames
      .map((name) => {
        const match = matcher(f, groups, name);
        const pool = items.filter((p) => match(p));
        return {
          name,
          tags: tags
            .filter((t) => t.group === name)
            .map((t) => ({ ...t, count: pool.filter((p) => p.tags.includes(t.slug)).length }))
            .filter((t) => t.count > 0 || f.tags.includes(t.slug)),
        };
      })
      .filter((g) => g.tags.length > 0),
    prices: (() => {
      const match = matcher(f, groups);
      const pool = items.filter((p) => match(p, { ...ALL, price: false }));
      return PRICE_BANDS.map((b) => ({
        slug: b.slug,
        count: pool.filter((p) => inBand(p.minPriceCents, b.slug)).length,
      })).filter((b) => b.count > 0 || f.price === b.slug);
    })(),
    inStock: (() => {
      const match = matcher(f, groups);
      return items.filter((p) => match(p, { ...ALL, inStock: false }) && p.stock !== "sold_out")
        .length;
    })(),
  };
}
