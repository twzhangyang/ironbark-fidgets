/**
 * Phase 14: an optional note the customer types on Stripe's checkout page (a Stripe "custom
 * field"). Stored as plain text; shown to the owner (admin, packing slip, new-order email) and
 * back to the customer (confirmation email, account order page).
 */
import type Stripe from "stripe";

import { messages } from "@/content/messages";

export const NOTE_FIELD_KEY = "note";
/** Stripe's maximum for a text custom field. */
export const NOTE_MAX_LENGTH = 255;

/** The custom field and the hint by the pay button, for `checkout.sessions.create`. */
export function noteFieldParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  "custom_fields" | "custom_text"
> {
  const t = messages.checkout.note;
  return {
    custom_fields: [
      {
        key: NOTE_FIELD_KEY,
        label: { type: "custom", custom: t.label },
        type: "text",
        optional: true,
        text: { maximum_length: NOTE_MAX_LENGTH },
      },
    ],
    custom_text: { submit: { message: t.hint } },
  };
}

/** The note from a completed session: trimmed, inner whitespace tidied, null when empty. */
export function noteFromSession(
  session: Pick<Stripe.Checkout.Session, "custom_fields">,
): string | null {
  const field = session.custom_fields?.find((f) => f.key === NOTE_FIELD_KEY);
  const value = field?.text?.value?.replace(/\s+/g, " ").trim() ?? "";
  return value ? value.slice(0, NOTE_MAX_LENGTH) : null;
}
