"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { getCustomer } from "@/lib/account/auth";
import { checkoutLinesSchema } from "@/lib/checkout/cart";
import { releaseOrder, releaseStaleHolds, reserveOrder } from "@/lib/checkout/orders";
import { createCheckoutSession } from "@/lib/checkout/stripe-session";
import { db } from "@/lib/db/client";
import { requestOrigin } from "@/lib/request-origin";
import { getStripe } from "@/lib/stripe";
import { checkoutScope, stripeTestMode } from "@/lib/test-mode";
import { getOrderForCancel, saveStripeSession } from "@/lib/checkout/queries";

export type StartCheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      error: "sold_out" | "unavailable" | "test_only" | "limit" | "stripe" | "generic";
      /** Index of the cart line the error is about, when there is one. */
      index?: number;
    };

/** Checks the cart, holds the stock and returns the Stripe Checkout URL (Phase 3 §3). */
export async function startCheckout(raw: unknown): Promise<StartCheckoutResult> {
  const parsed = checkoutLinesSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "limit" };

  try {
    await releaseStaleHolds(db);
    const reserved = await reserveOrder(db, parsed.data, {
      scope: checkoutScope(),
      test: stripeTestMode(),
    });
    if (!reserved.ok) return { ok: false, error: reserved.error.code, index: reserved.error.index };
    updateTag("catalog");

    try {
      // Never let a sign-in hiccup block a sale: guests check out without it.
      const customer = await getCustomer().catch(() => null);
      const session = await createCheckoutSession(
        reserved.order,
        await requestOrigin(),
        customer?.email,
      );
      if (!session.url) throw new Error("Stripe returned no URL");
      await saveStripeSession(reserved.order.id, session.id);
      return { ok: true, url: session.url };
    } catch (error) {
      console.error("stripe session failed", reserved.order.orderNumber, (error as Error).message);
      await releaseOrder(db, reserved.order.id, "Stripe error");
      return { ok: false, error: "stripe" };
    }
  } catch (error) {
    console.error("startCheckout failed", (error as Error).message);
    return { ok: false, error: "generic" };
  }
}

/** "Back" from Stripe: expire the session and put the stock back. Safe to call twice. */
export async function cancelCheckout(orderId: unknown): Promise<void> {
  const id = z.uuid().safeParse(orderId);
  if (!id.success) return;
  const order = await getOrderForCancel(id.data);
  if (!order || order.status !== "pending") return;
  if (order.stripeSessionId) {
    try {
      await getStripe().checkout.sessions.expire(order.stripeSessionId);
    } catch {
      // Already expired or completed; the webhook has the final say.
    }
  }
  if (await releaseOrder(db, order.id, "Back from checkout")) updateTag("catalog");
}
