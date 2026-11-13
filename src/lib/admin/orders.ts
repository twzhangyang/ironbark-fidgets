/**
 * Order handling for the admin (Phase 5 D4–D6, D13). Takes `db` (and Stripe where needed) as
 * parameters, so scripts can run the same code. Every status change matches the expected
 * current status only, so a double tap or a retry does nothing.
 */
import { and, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type Stripe from "stripe";

import { businessDaysBetween } from "@/lib/admin/dates";
import * as schema from "@/lib/db/schema";
import { stripeTestMode } from "@/lib/test-mode";

type Db = PostgresJsDatabase<typeof schema>;
export type OrderStatus = schema.OrderRow["status"];
type Status = OrderStatus;
const { orderItemContents, orderItems, orders, stockMovements, variants } = schema;

export const ORDER_TABS = {
  pack: { label: "To pack", statuses: ["paid"] },
  packed: { label: "Packed", statuses: ["packed"] },
  shipped: { label: "Shipped", statuses: ["shipped"] },
  all: { label: "All", statuses: ["paid", "packed", "shipped", "refunded", "cancelled"] },
} as const satisfies Record<string, { label: string; statuses: readonly Status[] }>;
export type OrderTab = keyof typeof ORDER_TABS;

export const REFUNDABLE: readonly Status[] = ["paid", "packed", "shipped"];
/** Not sent yet: the items are still with us, so a refund puts them back by default. */
export const UNSENT: readonly Status[] = ["paid", "packed"];

export type OrderListRow = {
  id: string;
  orderNumber: string;
  shippingMethod: "standard" | "express";
  status: Status;
  customerName: string | null;
  postcode: string | null;
  state: string | null;
  totalCents: number;
  paidAt: Date | null;
  isTest: boolean;
  /** Phase 14: the customer left a note. */
  hasNote: boolean;
  items: number;
};

/** Orders for one tab, optionally searched by number, name, email or postcode. */
export async function listOrders(
  db: Db,
  { tab, q }: { tab: OrderTab; q?: string },
): Promise<OrderListRow[]> {
  const statuses = [...ORDER_TABS[tab].statuses];
  const term = q?.trim();
  const search = term
    ? or(
        ilike(orders.orderNumber, `%${term}%`),
        ilike(orders.customerName, `%${term}%`),
        ilike(orders.email, `%${term.toLowerCase()}%`),
        sql`${orders.shippingAddress}->>'postcode' = ${term}`,
      )
    : undefined;
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      shippingMethod: orders.shippingMethod,
      status: orders.status,
      customerName: orders.customerName,
      address: orders.shippingAddress,
      totalCents: orders.totalCents,
      paidAt: orders.paidAt,
      isTest: orders.isTest,
      hasNote: sql<boolean>`${orders.customerNote} is not null`,
      items: sql<number>`(select coalesce(sum(c.qty), 0)::int from ${orderItems} i join ${orderItemContents} c on c.order_item_id = i.id where i.order_id = "orders"."id")` /* qualified: one-table queries render bare column names */,
    })
    .from(orders)
    .where(and(inArray(orders.status, statuses), search))
    // To pack: oldest first. Everything else: newest first.
    .orderBy(tab === "pack" ? orders.paidAt : desc(orders.paidAt), desc(orders.createdAt))
    .limit(200);
  return rows.map(({ address, ...r }) => ({
    ...r,
    postcode: address?.postcode ?? null,
    state: address?.state ?? null,
  }));
}

export type Attention = { orderId: string | null; orderNumber: string | null; text: string };

/** Things the owner should look at (D13). */
export async function needsAttention(db: Db, now = new Date()): Promise<Attention[]> {
  const out: Attention[] = [];
  const open = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      paidAt: orders.paidAt,
      confirmationSentAt: orders.confirmationSentAt,
      ownerAlertSentAt: orders.ownerAlertSentAt,
      email: orders.email,
      shippedEmailSentAt: orders.shippedEmailSentAt,
    })
    .from(orders)
    .where(inArray(orders.status, ["paid", "packed", "shipped"]))
    .orderBy(orders.paidAt);

  for (const o of open) {
    const ref = { orderId: o.id, orderNumber: o.orderNumber };
    const settled = o.paidAt && now.getTime() - o.paidAt.getTime() > 10 * 60_000;
    if (o.status !== "shipped" && o.paidAt && businessDaysBetween(o.paidAt, now) >= 2) {
      out.push({ ...ref, text: "Paid 2+ business days ago and not shipped yet" });
    }
    if (settled && ((!o.confirmationSentAt && o.email) || !o.ownerAlertSentAt)) {
      out.push({ ...ref, text: "Order emails didn't all send" });
    }
    if (o.status === "shipped" && !o.shippedEmailSentAt && o.email) {
      out.push({ ...ref, text: "Shipped email didn't send" });
    }
  }

  // Paid in Stripe after the hold was released (should never happen; Phase 3).
  const late = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(
      and(
        eq(orders.status, "cancelled"),
        isNotNull(orders.stripePaymentIntentId),
        isNull(orders.refundedAt),
      ),
    );
  for (const o of late) {
    out.push({
      orderId: o.id,
      orderNumber: o.orderNumber,
      text: "Paid in Stripe after the order was cancelled: refund it, or pack it if the stock is there",
    });
  }

  const drift = await db.execute<{ sku: string }>(sql`
    select v.sku from ${variants} v left join ${stockMovements} m on m.variant_id = v.id
    group by v.id having v.stock <> coalesce(sum(m.delta), 0)`);
  for (const d of drift) {
    out.push({ orderId: null, orderNumber: null, text: `Stock record mismatch for ${d.sku}` });
  }
  return out;
}

export async function orderCounts(db: Db) {
  const rows = await db
    .select({ status: orders.status, n: sql<number>`count(*)::int` })
    .from(orders)
    .where(inArray(orders.status, ["paid", "packed"]))
    .groupBy(orders.status);
  const n = (s: Status) => rows.find((r) => r.status === s)?.n ?? 0;
  return { toPack: n("paid"), packed: n("packed") };
}

/** Australia Post tracking numbers: letters/digits, 10–40 characters (lenient on purpose). */
export function cleanTrackingNumber(input: string): string | null {
  const value = input.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z0-9]{10,40}$/.test(value) ? value : null;
}

export async function markPacked(db: Db, orderId: string): Promise<boolean> {
  const rows = await db
    .update(orders)
    .set({ status: "packed", packedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "paid")))
    .returning({ id: orders.id });
  return rows.length > 0;
}

/** Paid or packed → shipped with a tracking number. The caller then sends the shipped email. */
export async function markShipped(db: Db, orderId: string, tracking: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .update(orders)
    .set({
      status: "shipped",
      trackingNumber: tracking,
      shippedAt: now,
      packedAt: sql`coalesce(${orders.packedAt}, now())`,
    })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ["paid", "packed"])))
    .returning({ id: orders.id });
  return rows.length > 0;
}

/**
 * One step back after a mis-tap: packed → paid, shipped → packed. Not once the shipped email
 * has gone (the customer already has the tracking number).
 */
export async function undoStep(db: Db, orderId: string): Promise<boolean> {
  const back = await db
    .update(orders)
    .set({ status: "paid", packedAt: null })
    .where(and(eq(orders.id, orderId), eq(orders.status, "packed")))
    .returning({ id: orders.id });
  if (back.length) return true;
  const unship = await db
    .update(orders)
    .set({ status: "packed", trackingNumber: null, shippedAt: null })
    .where(
      and(eq(orders.id, orderId), eq(orders.status, "shipped"), isNull(orders.shippedEmailSentAt)),
    )
    .returning({ id: orders.id });
  return unship.length > 0;
}

export type RefundResult =
  | { ok: true; putBack: number }
  | { ok: false; error: "not_refundable" | "no_payment" | "stripe" | "wrong_mode" };

/**
 * Full refund (D6): Stripe first (idempotency key per order), then the order. Stock is put back
 * only when asked, as `refunded` movements linked to the order. The admin form ticks "put back"
 * for orders not sent yet and leaves it off for sent ones (squishies get damaged in use).
 * The refund is tagged `source: admin` so the webhook leaves the stock decision to this call.
 */
export async function refundOrder(
  db: Db,
  stripe: Stripe,
  orderId: string,
  {
    putBack,
    actor,
    testKeys = stripeTestMode(),
  }: { putBack: boolean; actor: string; testKeys?: boolean },
): Promise<RefundResult> {
  const [order] = await db
    .select({
      status: orders.status,
      paymentIntent: orders.stripePaymentIntentId,
      orderNumber: orders.orderNumber,
      isTest: orders.isTest,
    })
    .from(orders)
    .where(eq(orders.id, orderId));
  const lateCancelled = order?.status === "cancelled" && order.paymentIntent;
  if (!order || (!REFUNDABLE.includes(order.status) && !lateCancelled)) {
    return { ok: false, error: "not_refundable" };
  }
  if (!order.paymentIntent) return { ok: false, error: "no_payment" };
  // Phase 12: a test payment only exists with test keys (preview), a real one with live keys.
  if (order.isTest !== testKeys) return { ok: false, error: "wrong_mode" };

  let refundId: string;
  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: order.paymentIntent,
        reason: "requested_by_customer",
        metadata: { source: "admin", putBack: String(putBack) },
      },
      { idempotencyKey: `refund/${orderId}` },
    );
    refundId = refund.id;
  } catch (error) {
    // A refund made earlier in the Stripe dashboard: treat as refunded.
    const code = (error as { code?: string }).code;
    if (code !== "charge_already_refunded") {
      console.error("refund failed", order.orderNumber, (error as Error).message);
      return { ok: false, error: "stripe" };
    }
    refundId = "";
  }

  return db.transaction(async (tx) => {
    // Late-paid cancelled orders already gave their stock back; just record the refund.
    if (lateCancelled) {
      await tx
        .update(orders)
        .set({ refundedAt: new Date(), stripeRefundId: refundId || null })
        .where(and(eq(orders.id, orderId), isNull(orders.refundedAt)));
      return { ok: true as const, putBack: 0 };
    }
    const updated = await tx
      .update(orders)
      .set({ status: "refunded", refundedAt: new Date(), stripeRefundId: refundId || null })
      .where(and(eq(orders.id, orderId), inArray(orders.status, [...REFUNDABLE])))
      .returning({ id: orders.id });
    // Already refunded (e.g. by the webhook a moment ago): stock can still be put back once.
    const putBackCount = putBack ? await putBackStock(tx, orderId, order.orderNumber, actor) : 0;
    if (!updated.length && !putBackCount) {
      const [now] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, orderId));
      if (now?.status !== "refunded")
        return { ok: false as const, error: "not_refundable" as const };
    }
    return { ok: true as const, putBack: putBackCount };
  });
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Puts an order's items back on the shelf, once (skips if already done). Returns units. */
async function putBackStock(tx: Tx, orderId: string, orderNumber: string, actor: string) {
  const done = await tx
    .select({ id: stockMovements.id })
    .from(stockMovements)
    .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.reason, "refunded")))
    .limit(1);
  if (done.length) return 0;
  const items = await tx
    .select({
      variantId: orderItemContents.variantId,
      qty: sql<number>`sum(${orderItemContents.qty})::int`,
    })
    .from(orderItemContents)
    .innerJoin(orderItems, eq(orderItems.id, orderItemContents.orderItemId))
    .where(eq(orderItems.orderId, orderId))
    .groupBy(orderItemContents.variantId)
    .orderBy(orderItemContents.variantId);
  let units = 0;
  for (const { variantId, qty } of items) {
    await tx
      .update(variants)
      .set({ stock: sql`${variants.stock} + ${qty}` })
      .where(eq(variants.id, variantId));
    units += qty;
  }
  if (items.length) {
    await tx.insert(stockMovements).values(
      items.map(({ variantId, qty }) => ({
        variantId,
        delta: qty,
        reason: "refunded" as const,
        orderId,
        note: `Refund ${orderNumber}, put back`,
        createdBy: actor,
      })),
    );
  }
  return units;
}

/** Put back stock for an order that's already refunded (e.g. refunded in Stripe, then returned). */
export async function putBackRefundedStock(db: Db, orderId: string, actor: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ status: orders.status, orderNumber: orders.orderNumber })
      .from(orders)
      .where(eq(orders.id, orderId));
    if (order?.status !== "refunded") return 0;
    return putBackStock(tx, orderId, order.orderNumber, actor);
  });
}

/** Has this order's stock already been put back? */
export async function stockPutBack(db: Db, orderId: string): Promise<boolean> {
  const rows = await db
    .select({ id: stockMovements.id })
    .from(stockMovements)
    .where(and(eq(stockMovements.orderId, orderId), eq(stockMovements.reason, "refunded")))
    .limit(1);
  return rows.length > 0;
}

/**
 * `charge.refunded` from Stripe (a refund made in the dashboard, or ours echoing back). Full
 * refunds only; stock is left to the owner. Returns the order number if something changed.
 */
export async function markRefundedByPaymentIntent(
  db: Db,
  paymentIntentId: string,
  refundId: string | null,
  { putBackUnsent = false }: { putBackUnsent?: boolean } = {},
): Promise<string | null> {
  // A refund made in the Stripe dashboard: an order not sent yet still has its items with us,
  // so they go back on the shelf. Sent orders don't (the owner can still put them back).
  const marked = await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ id: orders.id, status: orders.status, orderNumber: orders.orderNumber })
      .from(orders)
      .where(
        and(
          eq(orders.stripePaymentIntentId, paymentIntentId),
          inArray(orders.status, [...REFUNDABLE]),
        ),
      )
      .for("update");
    if (!before) return null;
    await tx
      .update(orders)
      .set({
        status: "refunded",
        refundedAt: new Date(),
        stripeRefundId: sql`coalesce(${orders.stripeRefundId}, ${refundId})`,
      })
      .where(eq(orders.id, before.id));
    if (putBackUnsent && UNSENT.includes(before.status))
      await putBackStock(tx, before.id, before.orderNumber, "Stripe dashboard refund");
    return before.orderNumber;
  });
  if (marked) return marked;
  // Late-paid cancelled order refunded in the dashboard.
  const late = await db
    .update(orders)
    .set({ refundedAt: new Date(), stripeRefundId: refundId })
    .where(
      and(
        eq(orders.stripePaymentIntentId, paymentIntentId),
        eq(orders.status, "cancelled"),
        isNull(orders.refundedAt),
      ),
    )
    .returning({ orderNumber: orders.orderNumber });
  return late[0]?.orderNumber ?? null;
}
