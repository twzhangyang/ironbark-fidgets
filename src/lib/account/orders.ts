/**
 * A customer's orders (Phase 7 D3, D6): matched by verified email, so guest orders placed
 * earlier with the same email show too. Takes `db`, like the other order modules.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { CartLine } from "@/lib/checkout/cart";
import * as schema from "@/lib/db/schema";
import { type EmailOrder, loadEmailOrder } from "@/lib/email/order-data";

type Db = PostgresJsDatabase<typeof schema>;
const { orderItemContents, orderItems, orders } = schema;

export const CUSTOMER_STATUSES = ["paid", "packed", "shipped", "refunded"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export async function listCustomerOrders(db: Db, email: string) {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalCents: orders.totalCents,
      paidAt: orders.paidAt,
      trackingNumber: orders.trackingNumber,
      items: sql<number>`(select coalesce(sum(i.qty), 0)::int from ${orderItems} i where i.order_id = "orders"."id")`,
    })
    .from(orders)
    .where(and(eq(orders.email, email), inArray(orders.status, [...CUSTOMER_STATUSES])))
    .orderBy(desc(orders.paidAt))
    .limit(100);
  return rows.map((r) => ({ ...r, status: r.status as CustomerStatus }));
}

export type CustomerOrder = EmailOrder & {
  status: CustomerStatus;
  /** For "Buy again": the same singles and boxes (blind boxes re-pick at checkout). */
  again: CartLine[];
  /** Blind-box picks, shown once the parcel is on its way (keeps the surprise until then). */
  picks: string[] | null;
};

/** One order, only if it belongs to this email. Otherwise null (the page shows 404). */
export async function getCustomerOrder(
  db: Db,
  email: string,
  orderId: string,
): Promise<CustomerOrder | null> {
  const order = await loadEmailOrder(db, orderId);
  if (!order || order.email !== email) return null;
  if (!(CUSTOMER_STATUSES as readonly string[]).includes(order.status)) return null;

  const items = await db
    .select({
      variantId: orderItems.variantId,
      bundleId: orderItems.bundleId,
      boxQty: orderItems.boxQty,
      qty: sql<number>`sum(${orderItems.qty})::int`,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .groupBy(orderItems.variantId, orderItems.bundleId, orderItems.boxQty);
  const again: CartLine[] = items.flatMap((i): CartLine[] =>
    i.variantId
      ? [{ type: i.boxQty > 1 ? "fullbox" : "variant", id: i.variantId, qty: i.qty }]
      : i.bundleId
        ? [{ type: "box", id: i.bundleId, qty: i.qty }]
        : [],
  );

  const blind = order.lines.some((l) => l.surpriseCount);
  const showPicks = blind && (order.status === "shipped" || order.status === "refunded");
  return {
    ...order,
    status: order.status as CustomerStatus,
    again,
    picks: showPicks ? await blindPicks(db, orderId) : null,
  };
}

async function blindPicks(db: Db, orderId: string): Promise<string[]> {
  const rows = await db
    .select({
      product: schema.products.name,
      variant: schema.variants.name,
      qty: orderItemContents.qty,
    })
    .from(orderItemContents)
    .innerJoin(orderItems, eq(orderItems.id, orderItemContents.orderItemId))
    .innerJoin(schema.bundles, eq(schema.bundles.id, orderItems.bundleId))
    .innerJoin(schema.variants, eq(schema.variants.id, orderItemContents.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .where(and(eq(orderItems.orderId, orderId), eq(schema.bundles.type, "mystery")))
    .orderBy(asc(schema.variants.name));
  return rows.map((r) => (r.qty > 1 ? `${r.variant} ×${r.qty}` : r.variant));
}
