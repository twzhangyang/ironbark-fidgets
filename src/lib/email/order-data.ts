/** Loads everything the order emails need. Takes `db` so scripts can use it. */
import { asc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/lib/db/schema";

const { bundles, orderItemContents, orderItems, orders, products, variants } = schema;
type Db = PostgresJsDatabase<typeof schema>;

export type EmailOrderLine = {
  name: string;
  variantName: string | null;
  qty: number;
  unitPriceCents: number;
  /** Fixed box: what's inside (per box). */
  contents: string[] | null;
  /** Blind box: designs per box. */
  surpriseCount: number | null;
};

export type EmailOrder = schema.OrderRow & {
  lines: EmailOrderLine[];
  /** What to pack, summed per design (owner alert). */
  pack: PackRow[];
};

/** One design to pack. `boxes` of `boxQty` are whole display boxes (Phase 11); the rest loose. */
export type PackRow = { name: string; sku: string; qty: number; boxes: number; boxQty: number };

/** "2 packs of 6 (one of each design) + 3 loose", or null when nothing goes as a pack. */
export function packNote(p: PackRow): string | null {
  if (p.boxes === 0) return null;
  const loose = p.qty - p.boxes * p.boxQty;
  const boxes = `${p.boxes} pack${p.boxes === 1 ? "" : "s"} of ${p.boxQty} (one of each design)`;
  return loose > 0 ? `${boxes} + ${loose} loose` : boxes;
}

export async function loadEmailOrder(db: Db, orderId: string): Promise<EmailOrder | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;

  const items = await db
    .select({
      id: orderItems.id,
      name: orderItems.name,
      variantName: orderItems.variantName,
      qty: orderItems.qty,
      unitPriceCents: orderItems.unitPriceCents,
      boxQty: orderItems.boxQty,
      boxType: bundles.type,
    })
    .from(orderItems)
    .leftJoin(bundles, eq(bundles.id, orderItems.bundleId))
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.sortOrder));

  const contents = items.length
    ? await db
        .select({
          orderItemId: orderItemContents.orderItemId,
          qty: orderItemContents.qty,
          sku: variants.sku,
          variantName: variants.name,
          productName: products.name,
        })
        .from(orderItemContents)
        .innerJoin(variants, eq(variants.id, orderItemContents.variantId))
        .innerJoin(products, eq(products.id, variants.productId))
        .where(
          inArray(
            orderItemContents.orderItemId,
            items.map((i) => i.id),
          ),
        )
    : [];

  const label = (c: (typeof contents)[number]) =>
    c.variantName === "Default" ? c.productName : `${c.productName} (${c.variantName})`;

  const lines = items.map((i): EmailOrderLine => {
    const own = contents.filter((c) => c.orderItemId === i.id);
    const total = own.reduce((n, c) => n + c.qty, 0);
    return {
      name: i.name,
      variantName: i.variantName,
      qty: i.qty,
      unitPriceCents: i.unitPriceCents,
      contents:
        i.boxType === "fixed"
          ? own.map((c) => {
              const perBox = c.qty / i.qty;
              return perBox > 1 ? `${perBox} × ${label(c)}` : label(c);
            })
          : null,
      surpriseCount: i.boxType === "mystery" ? total / i.qty : null,
    };
  });

  const boxQtyOf = new Map(items.map((i) => [i.id, i.boxQty]));
  const packMap = new Map<string, PackRow>();
  for (const c of contents) {
    const boxQty = boxQtyOf.get(c.orderItemId) ?? 1;
    const row = packMap.get(c.sku) ?? { name: label(c), sku: c.sku, qty: 0, boxes: 0, boxQty: 1 };
    row.qty += c.qty;
    if (boxQty > 1) {
      row.boxes += c.qty / boxQty;
      row.boxQty = boxQty;
    }
    packMap.set(c.sku, row);
  }

  return {
    ...order,
    lines,
    pack: [...packMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
