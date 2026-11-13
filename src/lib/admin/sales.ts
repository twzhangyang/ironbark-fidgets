/**
 * Sales summary (Phase 5 Milestone D). A quick look, not the books: BASK's records are in Xero.
 * Revenue counts orders paid in the period that weren't refunded; refunds are listed by the
 * date they were refunded.
 */
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/lib/db/schema";

type Db = PostgresJsDatabase<typeof schema>;
const { orderItems, orders } = schema;
const SOLD = ["paid", "packed", "shipped"] as const;
/** Phase 12: test orders (Stripe test keys) never count as sales. */
const real = eq(orders.isTest, false);

export type SalesSummary = {
  orders: number;
  revenueCents: number;
  gstCents: number;
  shippingCents: number;
  discountCents: number;
  promoOrders: number;
  /** Phase 12: test orders paid in the period (not in any number above). */
  testOrders: number;
  refunds: number;
  refundedCents: number;
  top: { name: string; units: number; revenueCents: number }[];
};

export async function salesSummary(db: Db, start: Date, end: Date): Promise<SalesSummary> {
  const inPeriod = and(gte(orders.paidAt, start), lt(orders.paidAt, end));
  const [totals] = await db
    .select({
      orders: sql<number>`count(*)::int`,
      revenueCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
      gstCents: sql<number>`coalesce(sum(${orders.gstCents}), 0)::int`,
      shippingCents: sql<number>`coalesce(sum(${orders.shippingCents}), 0)::int`,
      discountCents: sql<number>`coalesce(sum(${orders.discountCents}), 0)::int`,
      promoOrders: sql<number>`count(*) filter (where ${orders.discountCents} > 0)::int`,
    })
    .from(orders)
    .where(and(inArray(orders.status, [...SOLD]), inPeriod, real));

  const [refunds] = await db
    .select({
      refunds: sql<number>`count(*)::int`,
      refundedCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
    })
    .from(orders)
    .where(and(gte(orders.refundedAt, start), lt(orders.refundedAt, end), real));

  const label = sql<string>`${orderItems.name} || coalesce(' (' || ${orderItems.variantName} || ')', '')`;
  const top = await db
    .select({
      name: label,
      units: sql<number>`sum(${orderItems.qty})::int`,
      revenueCents: sql<number>`sum(${orderItems.qty} * ${orderItems.unitPriceCents})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
    .where(and(inArray(orders.status, [...SOLD]), inPeriod, real))
    .groupBy(label)
    .orderBy(desc(sql`sum(${orderItems.qty})`))
    .limit(10);

  const [{ testOrders }] = await db
    .select({ testOrders: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.isTest, true), inPeriod));

  return { ...totals, ...refunds, testOrders, top };
}

/** Orders paid in the period, one row each, for checking against Xero. */
export async function salesRows(db: Db, start: Date, end: Date) {
  return db
    .select({
      orderNumber: orders.orderNumber,
      status: orders.status,
      paidAt: orders.paidAt,
      subtotalCents: orders.subtotalCents,
      discountCents: orders.discountCents,
      promoCode: orders.promoCode,
      shippingCents: orders.shippingCents,
      totalCents: orders.totalCents,
      gstCents: orders.gstCents,
      refundedAt: orders.refundedAt,
      stripePaymentIntentId: orders.stripePaymentIntentId,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.status, [...SOLD, "refunded"]),
        real,
        gte(orders.paidAt, start),
        lt(orders.paidAt, end),
      ),
    )
    .orderBy(orders.paidAt);
}

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const cents = (n: number) => (n / 100).toFixed(2);

/** CSV without customer names or addresses (order numbers link back to the admin). */
export function salesCsv(
  rows: Awaited<ReturnType<typeof salesRows>>,
  formatDate: (d: Date | null) => string,
) {
  const head = [
    "Order",
    "Status",
    "Paid (Melbourne)",
    "Subtotal",
    "Discount",
    "Promo code",
    "Shipping",
    "Total",
    "GST included",
    "Refunded (Melbourne)",
    "Stripe payment",
  ];
  const lines = rows.map((r) =>
    [
      r.orderNumber,
      r.status,
      formatDate(r.paidAt),
      cents(r.subtotalCents),
      cents(r.discountCents),
      r.promoCode ?? "",
      cents(r.shippingCents),
      cents(r.totalCents),
      cents(r.gstCents),
      r.refundedAt ? formatDate(r.refundedAt) : "",
      r.stripePaymentIntentId ?? "",
    ]
      .map((v) => cell(String(v)))
      .join(","),
  );
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}
