/** First supplier batch import (scripts/first-batch.ts): CSV parsing and photo paths. */
export const PHOTO_PREFIX = "catalog/my";

export type Row = {
  sku: string;
  name: string;
  pieces: number;
  randomSingle: boolean;
  packQty: number | null;
  packCents: number | null;
  photos: number;
};

export function parseCsv(text: string): Row[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const want = "sku,name,pieces_received,random_single,pack_qty,pack_price,photos";
  if (header.trim() !== want) throw new Error(`CSV header must be: ${want}`);
  return lines
    .filter((l) => l.trim())
    .map((line, i) => {
      const [sku, name, pieces, random, packQty, packPrice, photos] = line
        .split(",")
        .map((c) => c.trim());
      const where = `line ${i + 2} (${sku})`;
      const int = (v: string, what: string) => {
        if (!/^\d+$/.test(v)) throw new Error(`${where}: ${what} must be a whole number`);
        return Number(v);
      };
      if (!/^MY-\d{2}$/.test(sku)) throw new Error(`${where}: bad SKU`);
      if (!["yes", "no"].includes(random))
        throw new Error(`${where}: random_single must be yes or no`);
      if (!packQty !== !packPrice) throw new Error(`${where}: pack_qty and pack_price go together`);
      const qty = packQty ? int(packQty, "pack_qty") : null;
      if (qty !== null && qty < 2) throw new Error(`${where}: pack_qty must be at least 2`);
      if (packPrice && !/^\d+(\.\d{1,2})?$/.test(packPrice))
        throw new Error(`${where}: pack_price like 64.95`);
      return {
        sku,
        name,
        pieces: int(pieces, "pieces_received"),
        randomSingle: random === "yes",
        packQty: qty,
        packCents: packPrice ? Math.round(Number(packPrice) * 100) : null,
        photos: int(photos, "photos"),
      };
    });
}

export const photoPaths = (sku: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${PHOTO_PREFIX}/${sku.toLowerCase()}-${i + 2}.webp`);

/** Main photo stays first; new paths are appended once. */
export const mergeImages = (current: string[], add: string[]) => [
  ...current,
  ...add.filter((p) => !current.includes(p)),
];
