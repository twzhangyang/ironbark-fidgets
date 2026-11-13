/**
 * Price formula (owner, 2026-11-12; vault: MY Supplier Range → Price formula).
 *   single = supplier price in CNY per piece × 4, in AUD, rounded UP to the next .95
 *   pack of all designs = single × pieces × 0.9 (10% off), rounded to the NEAREST .95
 * Whole cents throughout (no floating-point dollars).
 */

/** Smallest x.95 that is ≥ cents. */
function upTo95(cents: number): number {
  return Math.ceil((cents - 95) / 100) * 100 + 95;
}

/** Closest x.95 to cents. */
function nearest95(cents: number): number {
  return Math.round((cents - 95) / 100) * 100 + 95;
}

/** `cny` as written in the supplier list, e.g. "2.8". */
export function cnyToFen(cny: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(cny.trim())) throw new Error(`bad supplier price: ${cny}`);
  const [whole, frac = ""] = cny.trim().split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export const PRICE_MULTIPLIER = 4;
export const PACK_DISCOUNT = 0.1;

export function singlePriceCents(cny: string): number {
  return upTo95(cnyToFen(cny) * PRICE_MULTIPLIER);
}

export function packPriceCents(singleCents: number, pieces: number): number {
  if (!Number.isInteger(pieces) || pieces < 2) throw new Error("a pack has at least 2 pieces");
  return nearest95(Math.round(singleCents * pieces * (1 - PACK_DISCOUNT)));
}
