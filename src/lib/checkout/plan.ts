/**
 * Turns cart lines into an order plan: prices, names and exactly which variants to take off
 * the shelf. Pure, so it's unit-tested; `reserveOrder()` runs it inside the transaction.
 *
 * - A single takes its own variant.
 * - A full box (Phase 11) takes `box.qty` pieces of its variant per box, at the box price.
 * - A fixed box takes each component × qty.
 * - A blind box picks `pickCount` designs per box at random from the pool, only from designs
 *   still in stock after everything else in the cart, and different designs where possible.
 */
import type { CartLine } from "@/lib/checkout/cart";
import type { Bundle } from "@/lib/types";
import type { ProductScope } from "@/lib/test-mode";

export type PlanVariant = {
  id: string;
  /** Product name, e.g. "Cat Keycap Keychain". */
  productName: string;
  /** Design name, or null for one-design products. */
  variantName: string | null;
  priceCents: number;
  stock: number;
  image: string | null;
  /** The product's full box, when it's sold by the box (Phase 11). */
  box: { qty: number; priceCents: number } | null;
  /** Mixed box: a single is a random colour/design. */
  mixedBox: boolean;
};

/** Labels for order lines ("Random design", "Pack of 12"); the caller passes the copy. */
export type PlanLabels = { random: string; fullBox: (count: number) => string };

const PLAIN_LABELS: PlanLabels = {
  random: "Random design",
  fullBox: (count) => `Pack of ${count}`,
};

export type PlanCatalog = {
  variants: ReadonlyMap<string, PlanVariant>;
  bundles: ReadonlyMap<string, Bundle>;
};

export type PlanItem = {
  line: CartLine;
  name: string;
  variantName: string | null;
  unitPriceCents: number;
  qty: number;
  /** Pieces per unit of `qty` (1, or the box size for a full box). */
  boxQty: number;
  image: string | null;
  /** What to pack for this line. */
  contents: { variantId: string; qty: number }[];
};

/** `test_only` (Phase 12): a real product in a checkout on preview / the laptop. */
export type PlanError = { code: "unavailable" | "sold_out" | "test_only"; index: number };

export type OrderPlan =
  | { ok: true; items: PlanItem[]; need: Map<string, number>; subtotalCents: number }
  | { ok: false; error: PlanError };

export function buildOrderPlan(
  lines: readonly CartLine[],
  catalog: PlanCatalog,
  random: () => number = Math.random,
  labels: PlanLabels = PLAIN_LABELS,
): OrderPlan {
  const need = new Map<string, number>();
  const remaining = (id: string) => (catalog.variants.get(id)?.stock ?? 0) - (need.get(id) ?? 0);
  const take = (id: string, qty: number) => need.set(id, (need.get(id) ?? 0) + qty);
  const items: (PlanItem | undefined)[] = new Array(lines.length);

  // Singles and fixed boxes first: their contents are set. Blind boxes then pick from what's left.
  const order = lines
    .map((line, index) => ({ line, index }))
    .sort((a, b) => Number(isMystery(a.line, catalog)) - Number(isMystery(b.line, catalog)));

  for (const { line, index } of order) {
    if (line.type === "variant" || line.type === "fullbox") {
      const v = catalog.variants.get(line.id);
      if (!v) return fail("unavailable", index);
      const box = line.type === "fullbox" ? v.box : null;
      if (line.type === "fullbox" && !box) return fail("unavailable", index);
      const pieces = line.qty * (box?.qty ?? 1);
      if (remaining(v.id) < pieces) return fail("sold_out", index);
      take(v.id, pieces);
      const label = box ? labels.fullBox(box.qty) : v.mixedBox ? labels.random : null;
      items[index] = {
        line,
        name: v.productName,
        variantName: [v.variantName, label].filter(Boolean).join(" · ") || null,
        unitPriceCents: box?.priceCents ?? v.priceCents,
        qty: line.qty,
        boxQty: box?.qty ?? 1,
        image: v.image,
        contents: [{ variantId: v.id, qty: pieces }],
      };
      continue;
    }

    const bundle = catalog.bundles.get(line.id);
    if (!bundle) return fail("unavailable", index);
    const contents = new Map<string, number>();

    if (bundle.type === "fixed") {
      if (bundle.items.length === 0) return fail("unavailable", index);
      for (const item of bundle.items) {
        if (!catalog.variants.has(item.variantId)) return fail("unavailable", index);
        const qty = item.qty * line.qty;
        if (remaining(item.variantId) < qty) return fail("sold_out", index);
        take(item.variantId, qty);
        contents.set(item.variantId, (contents.get(item.variantId) ?? 0) + qty);
      }
    } else {
      const pool = bundle.pool.filter((id) => catalog.variants.has(id));
      if (pool.length === 0 || bundle.pickCount <= 0) return fail("unavailable", index);
      for (let box = 0; box < line.qty; box++) {
        const inThisBox = new Set<string>();
        for (let k = 0; k < bundle.pickCount; k++) {
          const inStock = pool.filter((id) => remaining(id) > 0);
          const fresh = inStock.filter((id) => !inThisBox.has(id));
          const choices = fresh.length > 0 ? fresh : inStock;
          if (choices.length === 0) return fail("sold_out", index);
          const id = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
          inThisBox.add(id);
          take(id, 1);
          contents.set(id, (contents.get(id) ?? 0) + 1);
        }
      }
    }

    items[index] = {
      line,
      name: bundle.name,
      variantName: null,
      unitPriceCents: bundle.priceCents,
      qty: line.qty,
      boxQty: 1,
      image: bundle.images[0] ?? null,
      contents: [...contents].map(([variantId, qty]) => ({ variantId, qty })),
    };
  }

  const planned = items as PlanItem[];
  return {
    ok: true,
    items: planned,
    need,
    subtotalCents: planned.reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0),
  };
}

function isMystery(line: CartLine, catalog: PlanCatalog) {
  return line.type === "box" && catalog.bundles.get(line.id)?.type === "mystery";
}

function fail(code: PlanError["code"], index: number): OrderPlan {
  return { ok: false, error: { code, index } };
}

/** Small seeded random (mulberry32) for tests and the race script. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Phase 12: the first cart line the scope doesn't allow, or null. "real" (production) treats a
 * test product as gone; "test" (preview, laptop) refuses real products so real stock is safe.
 */
export function scopeError(
  contents: readonly (readonly string[])[],
  testVariants: ReadonlySet<string>,
  scope: ProductScope,
): PlanError | null {
  if (scope === "any") return null;
  for (const [index, ids] of contents.entries()) {
    const tests = ids.map((id) => testVariants.has(id));
    if (scope === "real" && tests.some(Boolean)) return { code: "unavailable", index };
    if (scope === "test" && !tests.every(Boolean)) return { code: "test_only", index };
  }
  return null;
}
