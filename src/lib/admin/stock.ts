/**
 * Stock for the admin (Phase 5 D7, D9). Every change writes a `stock_movements` row in the same
 * transaction; the database keeps stock ≥ 0. Takes `db`, so scripts can use it.
 */
import { aliasedTable, and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/lib/db/schema";

type Db = PostgresJsDatabase<typeof schema>;
const { collections, orderItemContents, orderItems, orders, products, stockMovements, variants } =
  schema;

export type StockRow = {
  id: string;
  sku: string;
  productName: string;
  productSlug: string;
  variantName: string;
  designs: number;
  stock: number;
  lowStockAt: number;
  active: boolean;
  sold30: number;
  /** Pieces per full box when the product is sold by the box (Phase 11), else null. */
  boxQty: number | null;
  /** The product's category, with its parent first when it has one ("Food › Fruit"). */
  category: string;
  /** Phase 12: a test product (own stock; never in the reorder list). */
  isTest: boolean;
};

/** Every design with its stock and units sold in the last 30 days. */
export async function stockList(db: Db, now = new Date()): Promise<StockRow[]> {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const sold = db
    .select({
      variantId: orderItemContents.variantId,
      qty: sql<number>`sum(${orderItemContents.qty})::int`.as("qty"),
    })
    .from(orderItemContents)
    .innerJoin(orderItems, eq(orderItems.id, orderItemContents.orderItemId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        inArray(orders.status, ["paid", "packed", "shipped"]),
        gte(orders.paidAt, since),
        eq(orders.isTest, false),
      ),
    )
    .groupBy(orderItemContents.variantId)
    .as("sold");
  const parent = aliasedTable(collections, "parent");

  const rows = await db
    .select({
      id: variants.id,
      sku: variants.sku,
      productName: products.name,
      productSlug: products.slug,
      variantName: variants.name,
      designs: sql<number>`(select count(*)::int from ${variants} v2 where v2.product_id = ${products.id})`,
      stock: variants.stock,
      lowStockAt: variants.lowStockAt,
      active: sql<boolean>`${variants.active} and ${products.active}`,
      sold30: sql<number>`coalesce(${sold.qty}, 0)::int`,
      boxQty: sql<number | null>`case when ${products.sellBox} then ${products.boxQty} end`,
      category: sql<string>`concat_ws(' › ', ${parent.name}, ${collections.name})`,
      isTest: products.isTest,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .innerJoin(collections, eq(collections.id, products.collectionId))
    .leftJoin(parent, eq(parent.id, collections.parentId))
    .leftJoin(sold, eq(sold.variantId, variants.id))
    .orderBy(asc(products.sortOrder), asc(products.name), asc(variants.sortOrder));
  return rows;
}

export const stockLabel = (r: Pick<StockRow, "productName" | "variantName" | "designs">) =>
  r.designs > 1 ? `${r.productName} (${r.variantName})` : r.productName;

/** Active real designs at or below their low-stock level, best sellers first (D9). */
export function reorderList(rows: StockRow[]): StockRow[] {
  return rows
    .filter((r) => r.active && !r.isTest && r.stock <= r.lowStockAt)
    .sort((a, b) => b.sold30 - a.sold30 || a.stock - b.stock);
}

export function reorderText(rows: StockRow[]): string {
  return rows
    .map((r) => `${r.sku}  ${stockLabel(r)}  (${r.stock} left, ${r.sold30} sold in 30 days)`)
    .join("\n");
}

export type ReceiveLine = { variantId: string; qty: number };

/** A supplier shipment arrived: add many designs at once (reason `received`). */
export async function receiveStock(
  db: Db,
  lines: ReceiveLine[],
  { note, actor }: { note: string; actor: string },
): Promise<number> {
  const merged = new Map<string, number>();
  for (const l of lines)
    if (l.qty > 0) merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.qty);
  if (merged.size === 0) return 0;
  const sorted = [...merged].sort(([a], [b]) => a.localeCompare(b));
  return db.transaction(async (tx) => {
    let units = 0;
    for (const [variantId, qty] of sorted) {
      const updated = await tx
        .update(variants)
        .set({ stock: sql`${variants.stock} + ${qty}` })
        .where(eq(variants.id, variantId))
        .returning({ id: variants.id });
      if (!updated.length) throw new Error("Unknown design");
      units += qty;
    }
    await tx.insert(stockMovements).values(
      sorted.map(([variantId, qty]) => ({
        variantId,
        delta: qty,
        reason: "received" as const,
        note: note || null,
        createdBy: actor,
      })),
    );
    return units;
  });
}

export type AdjustResult = { ok: true; stock: number } | { ok: false; error: "below_zero" };

/** + or − with a reason (damaged, count fix, giveaway, sample). Never below 0. */
export async function adjustStock(
  db: Db,
  {
    variantId,
    delta,
    note,
    actor,
  }: { variantId: string; delta: number; note: string; actor: string },
): Promise<AdjustResult> {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("delta must be a non-zero integer");
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(variants)
      .set({ stock: sql`${variants.stock} + ${delta}` })
      .where(and(eq(variants.id, variantId), sql`${variants.stock} + ${delta} >= 0`))
      .returning({ stock: variants.stock });
    if (!updated.length) return { ok: false as const, error: "below_zero" as const };
    await tx
      .insert(stockMovements)
      .values({ variantId, delta, reason: "adjusted", note, createdBy: actor });
    return { ok: true as const, stock: updated[0].stock };
  });
}

/** Movement history for one design, newest first. */
export async function stockHistory(db: Db, variantId: string, limit = 200) {
  return db
    .select({
      id: stockMovements.id,
      delta: stockMovements.delta,
      reason: stockMovements.reason,
      note: stockMovements.note,
      createdBy: stockMovements.createdBy,
      createdAt: stockMovements.createdAt,
      orderId: stockMovements.orderId,
      orderNumber: orders.orderNumber,
    })
    .from(stockMovements)
    .leftJoin(orders, eq(orders.id, stockMovements.orderId))
    .where(eq(stockMovements.variantId, variantId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);
}

export async function getStockVariant(db: Db, variantId: string) {
  const rows = await stockList(db);
  return rows.find((r) => r.id === variantId) ?? null;
}
