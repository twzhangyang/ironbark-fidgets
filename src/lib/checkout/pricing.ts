import {
  EXPRESS_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
} from "@/lib/site";

export type ShippingMethod = "standard" | "express";

/**
 * Standard: flat rate, free at or over the threshold (subtotal before promo codes).
 * Express: one price for any order.
 */
export function shippingFor(subtotalCents: number, method: ShippingMethod = "standard"): number {
  if (method === "express") return EXPRESS_SHIPPING_CENTS;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
}

/** The method Stripe reports (from our shipping rate's metadata); anything else is standard. */
export const parseShippingMethod = (value: unknown): ShippingMethod =>
  value === "express" ? "express" : "standard";

/** How much more to spend for free shipping (0 when already free). */
export function freeShippingGap(subtotalCents: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
}

/** GST included in a GST-inclusive amount (1/11th), rounded to the cent. */
export function gstIncluded(totalCents: number): number {
  return Math.round(totalCents / 11);
}
