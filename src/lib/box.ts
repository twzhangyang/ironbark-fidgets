/** Buying a full supplier box (Phase 11): pricing helpers shared by the admin and the shop. */

/** About 10% off the singles, rounded to the nearest .95 (12 × $12.95 → $139.95). */
export function suggestBoxPrice(singleCents: number, boxQty: number): number {
  const target = singleCents * boxQty * 0.9;
  return Math.max(95, Math.round((target + 5) / 100) * 100 - 5);
}

/** What a box saves against buying `boxQty` singles at today's price (never negative). */
export function boxSaving(singleCents: number, box: { qty: number; priceCents: number }): number {
  return Math.max(0, singleCents * box.qty - box.priceCents);
}

/** Whole boxes that can be sold from `stock` pieces. */
export const boxesAvailable = (stock: number, boxQty: number) =>
  boxQty > 0 ? Math.max(0, Math.floor(stock / boxQty)) : 0;
