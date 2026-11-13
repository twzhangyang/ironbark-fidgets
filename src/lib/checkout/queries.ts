import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { orderItems, orders } from "@/lib/db/schema";

export async function saveStripeSession(orderId: string, sessionId: string) {
  await db.update(orders).set({ stripeSessionId: sessionId }).where(eq(orders.id, orderId));
}

export async function getOrderForCancel(orderId: string) {
  const [order] = await db
    .select({ id: orders.id, status: orders.status, stripeSessionId: orders.stripeSessionId })
    .from(orders)
    .where(eq(orders.id, orderId));
  return order ?? null;
}

/** For the success page. Looked up by Stripe session id (only the payer has it). */
export async function getOrderBySession(sessionId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId));
  if (!order) return null;
  const items = await db
    .select({
      name: orderItems.name,
      variantName: orderItems.variantName,
      qty: orderItems.qty,
      unitPriceCents: orderItems.unitPriceCents,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.sortOrder));
  return { ...order, items };
}
