/**
 * Stripe webhook (Phase 3 §4). The only thing that marks orders paid. Idempotent: every
 * update matches `pending` rows only, so Stripe's retries do nothing.
 */
import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import type Stripe from "stripe";

import { markRefundedByPaymentIntent } from "@/lib/admin/orders";
import { markOrderPaid, releaseOrder } from "@/lib/checkout/orders";
import { parseShippingMethod } from "@/lib/checkout/pricing";
import { db } from "@/lib/db/client";
import { resendSender } from "@/lib/email/client";
import { sendOrderEmails } from "@/lib/email/send";
import { orders } from "@/lib/db/schema";
import { getStripe, getWebhookSecret } from "@/lib/stripe";
import { noteFromSession } from "@/lib/checkout/order-note";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature ?? "", getWebhookSecret());
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handlePaid(event.data.object);
        break;
      case "charge.refunded":
        await handleRefunded(event.data.object);
        break;
      case "checkout.session.expired": {
        const orderId = event.data.object.metadata?.order_id;
        if (orderId && (await releaseOrder(db, orderId, "Checkout expired"))) {
          revalidateTag("catalog", "max");
        }
        break;
      }
    }
  } catch (error) {
    // 500 makes Stripe retry later.
    console.error("webhook failed", event.type, event.id, (error as Error).message);
    return new Response("Webhook handler failed", { status: 500 });
  }
  return Response.json({ received: true });
}

async function handlePaid(eventSession: Stripe.Checkout.Session) {
  if (eventSession.payment_status !== "paid") return;
  const orderId = eventSession.metadata?.order_id;
  if (!orderId) return;

  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      subtotalCents: orders.subtotalCents,
      shippingCents: orders.shippingCents,
    })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!order) {
    console.warn("webhook: unknown order", orderId);
    return;
  }

  const session = await getStripe().checkout.sessions.retrieve(eventSession.id, {
    expand: ["discounts.promotion_code", "shipping_cost.shipping_rate"],
  });
  if (session.currency !== "aud" || session.amount_subtotal !== order.subtotalCents) {
    console.error("webhook: amount mismatch, left pending for review", order.orderNumber);
    return;
  }

  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  const promo = session.discounts?.[0]?.promotion_code;
  // Which option the customer picked (our rates carry `metadata.method`).
  const rate = session.shipping_cost?.shipping_rate;
  const shippingMethod = parseShippingMethod(
    rate && typeof rate !== "string" ? rate.metadata?.method : undefined,
  );
  const result = await markOrderPaid(db, order.id, {
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentOf(session),
    email: session.customer_details?.email?.toLowerCase() ?? null,
    customerName: shipping?.name ?? session.customer_details?.name ?? null,
    phone: session.customer_details?.phone ?? null,
    shippingAddress: address
      ? {
          line1: address.line1 ?? "",
          line2: address.line2 ?? null,
          city: address.city ?? "",
          state: address.state ?? "",
          postcode: address.postal_code ?? "",
          country: address.country ?? "AU",
        }
      : null,
    discountCents: session.total_details?.amount_discount ?? 0,
    shippingCents: session.total_details?.amount_shipping ?? order.shippingCents,
    shippingMethod,
    totalCents: session.amount_total ?? 0,
    promoCode: promo && typeof promo !== "string" ? promo.code : null,
    customerNote: noteFromSession(session),
  });

  if (result === "paid") {
    // First delivery or a retry: sends only the emails not yet sent. Throws → 500 → Stripe retries.
    await sendOrderEmails(db, order.id, resendSender);
  }

  if (result === "cancelled") {
    // Should never happen (the hold outlives the session). Record the payment so the admin's
    // "Needs attention" shows it; the owner refunds or fulfils by hand.
    await db
      .update(orders)
      .set({ stripeSessionId: session.id, stripePaymentIntentId: paymentIntentOf(session) })
      .where(and(eq(orders.id, order.id), eq(orders.status, "cancelled")));
    console.error("webhook: PAID AFTER CANCEL, needs attention", order.orderNumber);
  }
}

function paymentIntentOf(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent?.id ?? null);
}

/** Full refunds (from the admin or the Stripe dashboard) mark the order refunded (D6). */
async function handleRefunded(charge: Stripe.Charge) {
  if (!charge.refunded) return; // partial refund: handled in the Stripe dashboard only
  const paymentIntent =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent) return;
  // Refunds made in our admin carry `source: admin` and decide the stock themselves; refunds
  // made in the Stripe dashboard put an unsent order's items back on the shelf.
  let refundId = charge.refunds?.data[0]?.id ?? null;
  let fromAdmin = false;
  try {
    const { data } = await getStripe().refunds.list({ payment_intent: paymentIntent, limit: 1 });
    refundId ??= data[0]?.id ?? null;
    fromAdmin = data[0]?.metadata?.source === "admin";
  } catch {
    fromAdmin = true; // can't tell: leave the stock alone (the admin can put it back)
  }
  await markRefundedByPaymentIntent(db, paymentIntent, refundId, { putBackUnsent: !fromAdmin });
  revalidateTag("catalog", "max");
}
