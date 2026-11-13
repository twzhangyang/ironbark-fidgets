import "server-only";

import Stripe from "stripe";
import { z } from "zod";

const env = z.object({
  STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/, "not a Stripe secret key"),
});

let client: Stripe | undefined;

/** Server-only Stripe client. Test keys until launch (Phase 6). */
export function getStripe(): Stripe {
  if (!client) {
    const parsed = env.safeParse(process.env);
    if (!parsed.success)
      throw new Error("STRIPE_SECRET_KEY is missing or invalid. See .env.example.");
    client = new Stripe(parsed.data.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });
  }
  return client;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) throw new Error("STRIPE_WEBHOOK_SECRET is missing.");
  return secret;
}
