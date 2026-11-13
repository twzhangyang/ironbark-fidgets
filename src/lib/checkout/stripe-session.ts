import "server-only";

import type Stripe from "stripe";

import type { ReservedOrder } from "@/lib/checkout/orders";
import { shippingFor } from "@/lib/checkout/pricing";
import { imageUrl } from "@/lib/images";
import { GST_REGISTERED, getSiteUrl, STRIPE_SESSION_MINUTES } from "@/lib/site";
import { getStripe } from "@/lib/stripe";
import { noteFieldParams } from "@/lib/checkout/order-note";

let gstRateId: string | undefined;

/** The inclusive 10% GST rate (only used when GST_REGISTERED). Created once if missing. */
async function getGstRateId(stripe: Stripe): Promise<string> {
  if (gstRateId) return gstRateId;
  const rates = await stripe.taxRates.list({ active: true, inclusive: true, limit: 100 });
  const found = rates.data.find(
    (r) => r.display_name === "GST" && r.percentage === 10 && r.country === "AU",
  );
  gstRateId =
    found?.id ??
    (
      await stripe.taxRates.create({
        display_name: "GST",
        percentage: 10,
        inclusive: true,
        country: "AU",
        tax_type: "gst",
      })
    ).id;
  return gstRateId;
}

/** Stripe Checkout for a reserved order (Phase 3 §3). */
export async function createCheckoutSession(
  order: ReservedOrder,
  site: string = getSiteUrl(),
  /** Signed-in customer's verified email: pre-filled and locked, so the order lands in their account. */
  customerEmail?: string,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const taxRates = GST_REGISTERED ? [await getGstRateId(stripe)] : undefined;
  const metadata = { order_id: order.id, order_number: order.orderNumber };
  const blindCount = (i: ReservedOrder["items"][number]) =>
    i.contents.reduce((n, c) => n + c.qty, 0) / i.qty;

  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      currency: "aud",
      line_items: order.items.map((i) => {
        const image = i.image ? imageUrl(i.image) : null;
        return {
          quantity: i.qty,
          tax_rates: taxRates,
          price_data: {
            currency: "aud",
            unit_amount: i.unitPriceCents,
            product_data: {
              name: i.variantName ? `${i.name} – ${i.variantName}` : i.name,
              images: image?.startsWith("https://") ? [image] : undefined,
              description: i.line.type === "box" ? `Gift box · ${blindCount(i)} items` : undefined,
            },
          },
        };
      }),
      shipping_address_collection: { allowed_countries: ["AU"] },
      // Standard first (Stripe pre-selects it); the webhook reads `metadata.method` back.
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: order.shippingCents, currency: "aud" },
            display_name:
              order.shippingCents === 0
                ? "Free standard shipping (Australia Post)"
                : "Standard (Australia Post)",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 2 },
              maximum: { unit: "business_day", value: 7 },
            },
            metadata: { method: "standard" },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: shippingFor(order.subtotalCents, "express"),
              currency: "aud",
            },
            display_name: "Express Post (Australia Post)",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 3 },
            },
            metadata: { method: "express" },
          },
        },
      ],
      allow_promotion_codes: true,
      // Phase 14: optional order note.
      ...noteFieldParams(),
      // Card only (includes Apple Pay / Google Pay): payment is confirmed straight away.
      allowed_payment_method_types: ["card"],
      expires_at: Math.floor(Date.now() / 1000) + STRIPE_SESSION_MINUTES * 60,
      client_reference_id: order.id,
      customer_email: customerEmail,
      metadata,
      payment_intent_data: {
        description: `Ironbark Fidgets ${order.orderNumber}`,
        metadata,
      },
      success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/checkout/cancelled?order=${order.id}`,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );
}
