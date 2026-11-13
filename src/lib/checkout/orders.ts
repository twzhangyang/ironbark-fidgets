/**
 * Order + stock-hold transactions. Takes the db as a parameter (no `server-only`), so the
 * race-test script can call the exact same code.
 *
 * Stock rules (Phase 3 D3): starting checkout takes stock off the shelf with a `reserved`
 * movement per variant; paying keeps it off (that's the sale); cancelling or expiry puts it
 * back with `released` movements. The conditional UPDATE plus the `stock >= 0` check make
 * overselling impossible, even for simultaneous checkouts.
 */
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { CartLine } from "@/lib/checkout/cart";
import { formatOrderNumber, melbourneDateKey } from "@/lib/checkout/order-number";
import {
  buildOrderPlan,
  scopeError,
  type PlanError,
  type PlanItem,
  type PlanLabels,
  type PlanVariant,
} from "@/lib/checkout/plan";
import { fill, messages } from "@/content/messages";
import { gstIncluded, shippingFor } from "@/lib/checkout/pricing";
import * as schema from "@/lib/db/schema";
import { HOLD_MINUTES } from "@/lib/site";
import type { ProductScope } from "@/lib/test-mode";
import type { Bundle } from "@/lib/types";

type Db = PostgresJsDatabase<typeof schema>;

/** How order lines are labelled in the cart, Stripe, emails and the invoice (Phase 11). */
const ORDER_LABELS: PlanLabels = {
  random: messages.cart.randomColour,
  fullBox: (count) => fill(messages.cart.fullBox, { count }),
};
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const {
  bundleItems,
  bundlePool,
  bundles,
  orderItemContents,
  orderItems,
  orders,
  products,
  stockMovements,
  variants,
} = schema;

export type ReservedOrder = {
  id: string;
  orderNumber: string;
  subtotalCents: number;
  shippingCents: number;
  expiresAt: Date;
  items: PlanItem[];
};

export type ReserveResult = { ok: true; order: ReservedOrder } | { ok: false; error: PlanError };

class OutOfStock extends Error {
  constructor(readonly variantId: string) {
    super("out of stock");
  }
}

/** Loads exactly what the plan needs (active items only), inside the transaction. */
async function loadPlanCatalog(tx: Tx, lines: readonly CartLine[]) {
  const boxIds = lines.filter((l) => l.type === "box").map((l) => l.id);
  const boxRows = boxIds.length
    ? await tx
        .select()
        .from(bundles)
        .where(and(inArray(bundles.id, boxIds), eq(bundles.active, true)))
    : [];
  const ids = boxRows.map((b) => b.id);
  const [itemRows, poolRows] = ids.length
    ? [
        await tx.select().from(bundleItems).where(inArray(bundleItems.bundleId, ids)),
        await tx.select().from(bundlePool).where(inArray(bundlePool.bundleId, ids)),
      ]
    : [[], []];

  const variantIds = [
    ...new Set([
      ...lines.filter((l) => l.type !== "box").map((l) => l.id),
      ...itemRows.map((r) => r.variantId),
      ...poolRows.map((r) => r.variantId),
    ]),
  ];
  const variantRows = variantIds.length
    ? await tx
        .select({
          id: variants.id,
          name: variants.name,
          priceCents: variants.priceCents,
          stock: variants.stock,
          imagePath: variants.imagePath,
          productName: products.name,
          productImages: products.images,
          sellBox: products.sellBox,
          boxQty: products.boxQty,
          boxPriceCents: products.boxPriceCents,
          mixedBox: products.mixedBox,
          isTest: products.isTest,
          designs: sql<number>`(select count(*)::int from ${variants} v2 where v2.product_id = ${products.id} and v2.active)`,
        })
        .from(variants)
        .innerJoin(products, eq(products.id, variants.productId))
        .where(
          and(
            inArray(variants.id, variantIds),
            eq(variants.active, true),
            eq(products.active, true),
          ),
        )
    : [];

  const planVariants = new Map<string, PlanVariant>(
    variantRows.map((v) => [
      v.id,
      {
        id: v.id,
        productName: v.productName,
        variantName: v.designs > 1 ? v.name : null,
        priceCents: v.priceCents,
        stock: v.stock,
        image: v.imagePath ?? v.productImages[0] ?? null,
        box:
          v.sellBox && v.boxQty && v.boxPriceCents
            ? { qty: v.boxQty, priceCents: v.boxPriceCents }
            : null,
        mixedBox: v.mixedBox,
      },
    ]),
  );
  const planBundles = new Map<string, Bundle>(
    boxRows.map((b): [string, Bundle] => {
      const base = {
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: b.description,
        priceCents: b.priceCents,
        images: b.images,
        sortOrder: b.sortOrder,
        active: b.active,
      };
      return [
        b.id,
        b.type === "mystery"
          ? {
              ...base,
              type: "mystery",
              pickCount: b.pickCount ?? 1,
              pool: poolRows.filter((r) => r.bundleId === b.id).map((r) => r.variantId),
            }
          : {
              ...base,
              type: "fixed",
              items: itemRows
                .filter((r) => r.bundleId === b.id)
                .map((r) => ({ variantId: r.variantId, qty: r.qty })),
            },
      ];
    }),
  );
  return {
    variants: planVariants,
    bundles: planBundles,
    testVariants: new Set(variantRows.filter((v) => v.isTest).map((v) => v.id)),
  };
}

/** Prices the cart, takes the stock off the shelf and creates a `pending` order. */
export async function reserveOrder(
  db: Db,
  lines: readonly CartLine[],
  {
    now = new Date(),
    random = Math.random,
    scope = "any",
    test = false,
  }: {
    now?: Date;
    random?: () => number;
    /** Phase 12: which products may be bought here (see `checkoutScope()`). */
    scope?: ProductScope;
    /** Phase 12: Stripe test keys, so a `TEST-…` test order. */
    test?: boolean;
  } = {},
): Promise<ReserveResult> {
  let failedPlanItems: PlanItem[] = [];
  try {
    return await db.transaction(async (tx) => {
      const catalog = await loadPlanCatalog(tx, lines);
      const plan = buildOrderPlan(lines, catalog, random, ORDER_LABELS);
      if (!plan.ok) return plan;
      const wrong = scopeError(
        plan.items.map((i) => i.contents.map((c) => c.variantId)),
        catalog.testVariants,
        scope,
      );
      if (wrong) return { ok: false as const, error: wrong };
      failedPlanItems = plan.items;

      // Take stock in a fixed order (by id) so simultaneous checkouts can't deadlock.
      const need = [...plan.need].sort(([a], [b]) => a.localeCompare(b));
      for (const [variantId, qty] of need) {
        const updated = await tx
          .update(variants)
          .set({ stock: sql`${variants.stock} - ${qty}` })
          .where(and(eq(variants.id, variantId), sql`${variants.stock} >= ${qty}`))
          .returning({ id: variants.id });
        if (updated.length === 0) throw new OutOfStock(variantId);
      }

      // Order number: one at a time, so the daily sequence never repeats.
      const dateKey = melbourneDateKey(now);
      const prefix = test ? "TEST" : "IB";
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('order_number'))`);
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(sql`${orders.orderNumber} like ${`${prefix}-${dateKey}-%`}`);
      const orderNumber = formatOrderNumber(dateKey, count + 1, prefix);

      const shippingCents = shippingFor(plan.subtotalCents);
      const totalCents = plan.subtotalCents + shippingCents;
      const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          subtotalCents: plan.subtotalCents,
          shippingCents,
          totalCents,
          gstCents: gstIncluded(totalCents),
          expiresAt,
          isTest: test,
        })
        .returning({ id: orders.id });

      for (const [i, item] of plan.items.entries()) {
        const [row] = await tx
          .insert(orderItems)
          .values({
            orderId: order.id,
            variantId: item.line.type === "box" ? null : item.line.id,
            bundleId: item.line.type === "box" ? item.line.id : null,
            name: item.name,
            variantName: item.variantName,
            unitPriceCents: item.unitPriceCents,
            qty: item.qty,
            boxQty: item.boxQty,
            sortOrder: i,
          })
          .returning({ id: orderItems.id });
        await tx
          .insert(orderItemContents)
          .values(item.contents.map((c) => ({ orderItemId: row.id, ...c })));
      }

      await tx.insert(stockMovements).values(
        need.map(([variantId, qty]) => ({
          variantId,
          delta: -qty,
          reason: "reserved" as const,
          orderId: order.id,
          note: `Checkout ${orderNumber}`,
        })),
      );

      return {
        ok: true as const,
        order: {
          id: order.id,
          orderNumber,
          subtotalCents: plan.subtotalCents,
          shippingCents,
          expiresAt,
          items: plan.items,
        },
      };
    });
  } catch (error) {
    if (error instanceof OutOfStock) {
      // Someone else got there first: point at the first line that needed this variant.
      const index = failedPlanItems.findIndex((i) =>
        i.contents.some((c) => c.variantId === error.variantId),
      );
      return { ok: false, error: { code: "sold_out", index: Math.max(0, index) } };
    }
    throw error;
  }
}

/**
 * Cancels a `pending` order and puts its held stock back. Returns false if the order wasn't
 * pending (already paid, cancelled or missing), so it's safe to call more than once.
 */
export async function releaseOrder(db: Db, orderId: string, note: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const cancelled = await tx
      .update(orders)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
      .returning({ id: orders.id, orderNumber: orders.orderNumber });
    if (cancelled.length === 0) return false;

    const held = await tx
      .select({
        variantId: stockMovements.variantId,
        qty: sql<number>`(-sum(${stockMovements.delta}))::int`,
      })
      .from(stockMovements)
      .where(eq(stockMovements.orderId, orderId))
      .groupBy(stockMovements.variantId)
      .having(sql`sum(${stockMovements.delta}) < 0`);

    for (const { variantId, qty } of held) {
      await tx
        .update(variants)
        .set({ stock: sql`${variants.stock} + ${qty}` })
        .where(eq(variants.id, variantId));
    }
    if (held.length) {
      await tx.insert(stockMovements).values(
        held.map(({ variantId, qty }) => ({
          variantId,
          delta: qty,
          reason: "released" as const,
          orderId,
          note: `${note} ${cancelled[0].orderNumber}`,
        })),
      );
    }
    return true;
  });
}

/** Releases unpaid holds past their expiry (safety net if a webhook was missed). */
export async function releaseStaleHolds(db: Db, now = new Date()): Promise<number> {
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pending"), lt(orders.expiresAt, now)))
    .limit(50);
  let released = 0;
  for (const { id } of stale) if (await releaseOrder(db, id, "Hold expired")) released++;
  return released;
}

export type PaidDetails = {
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  email: string | null;
  customerName: string | null;
  phone: string | null;
  shippingAddress: schema.ShippingAddress | null;
  discountCents: number;
  shippingCents: number;
  shippingMethod: "standard" | "express";
  totalCents: number;
  promoCode: string | null;
  /** Phase 14: optional note typed on Stripe's checkout page. */
  customerNote: string | null;
};

/**
 * Marks a `pending` order paid. "paid" on success; otherwise the order's current status
 * (a Stripe retry finds "paid" and does nothing).
 */
export async function markOrderPaid(
  db: Db,
  orderId: string,
  details: PaidDetails,
): Promise<"paid" | schema.OrderRow["status"] | "missing"> {
  const updated = await db
    .update(orders)
    .set({
      status: "paid",
      paidAt: new Date(),
      ...details,
      gstCents: gstIncluded(details.totalCents),
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  if (updated.length) return "paid";
  const [current] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId));
  return current?.status ?? "missing";
}
