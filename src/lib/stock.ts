import type { Bundle, StockState, Variant } from "@/lib/types";

/** At or below this many units a variant shows "Only N left". */
export const LOW_STOCK_THRESHOLD = 3;

export function stockState(stock: number): StockState {
  if (stock <= 0) return "sold_out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "in_stock";
}

/** A product's state across its variants: sold out only when every variant is. */
export function productStockState(variants: Variant[]): StockState {
  const total = variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
  return stockState(total);
}

export function priceRange(variants: Variant[]): { min: number; max: number } {
  if (variants.length === 0) throw new Error("Product has no variants");
  const prices = variants.map((v) => v.priceCents);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

type VariantLookup = ReadonlyMap<string, Variant>;

/**
 * How many of this box can be sold right now.
 * - Fixed: limited by the scarcest component, `min(floor(stock / qty))`. A missing component
 *   means 0, never "unlimited".
 * - Mystery: total stock across the pool, in whole boxes.
 */
export function bundleAvailable(bundle: Bundle, variants: VariantLookup): number {
  if (bundle.type === "fixed") {
    if (bundle.items.length === 0) return 0;
    let available = Infinity;
    for (const item of bundle.items) {
      const variant = variants.get(item.variantId);
      if (!variant || item.qty <= 0) return 0;
      available = Math.min(available, Math.floor(Math.max(0, variant.stock) / item.qty));
    }
    return available;
  }
  if (bundle.pickCount <= 0) return 0;
  const poolStock = bundle.pool.reduce(
    (sum, id) => sum + Math.max(0, variants.get(id)?.stock ?? 0),
    0,
  );
  return Math.floor(poolStock / bundle.pickCount);
}

/**
 * What the box saves vs buying singly, in cents (never negative).
 * Mystery boxes compare against the **cheapest** design in the pool, so the advertised
 * saving is always true whichever items get picked (Australian Consumer Law).
 */
export function bundleSaving(bundle: Bundle, variants: VariantLookup): number {
  let singles: number;
  if (bundle.type === "fixed") {
    singles = 0;
    for (const item of bundle.items) {
      const variant = variants.get(item.variantId);
      if (!variant) return 0;
      singles += variant.priceCents * item.qty;
    }
  } else {
    const prices = bundle.pool
      .map((id) => variants.get(id)?.priceCents)
      .filter((p): p is number => p !== undefined);
    if (prices.length === 0) return 0;
    singles = Math.min(...prices) * bundle.pickCount;
  }
  return Math.max(0, singles - bundle.priceCents);
}
