/**
 * Search for the admin stock pages (Stock, Receive shipment). Pure, so it runs in the browser.
 * Every word typed must appear somewhere in the SKU, the item name or the category.
 */
export type Searchable = { sku: string; label: string; category: string };

export function searchWords(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesStockQuery(row: Searchable, q: string): boolean {
  const words = searchWords(q);
  if (!words.length) return true;
  const hay = `${row.sku} ${row.label} ${row.category}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}
