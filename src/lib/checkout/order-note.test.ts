import { render } from "@react-email/components";
import { createElement } from "react";
import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { NOTE_FIELD_KEY, noteFieldParams, noteFromSession } from "@/lib/checkout/order-note";
import type { EmailOrder } from "@/lib/email/order-data";
import { OrderAlertEmail } from "@/lib/email/templates/order-alert";
import { OrderConfirmationEmail } from "@/lib/email/templates/order-confirmation";

const session = (value: string | null, key = NOTE_FIELD_KEY) =>
  ({
    custom_fields: [{ key, type: "text", text: { value } }],
  }) as unknown as Pick<Stripe.Checkout.Session, "custom_fields">;

describe("order note (Phase 14)", () => {
  it("asks Stripe for one optional text field of up to 255 characters, with a hint", () => {
    const p = noteFieldParams();
    expect(p.custom_fields).toEqual([
      expect.objectContaining({
        key: NOTE_FIELD_KEY,
        type: "text",
        optional: true,
        text: { maximum_length: 255 },
      }),
    ]);
    const label = p.custom_fields?.[0].label;
    expect(label?.type === "custom" && label.custom.length).toBeLessThanOrEqual(50);
    const submit = p.custom_text?.submit;
    expect(submit && submit.message).toMatch(/can't promise/);
  });

  it("reads the note: trimmed, spaces tidied, null when empty or missing", () => {
    expect(noteFromSession(session("  It's a gift,\n  no price   please "))).toBe(
      "It's a gift, no price please",
    );
    expect(noteFromSession(session("   "))).toBeNull();
    expect(noteFromSession(session(null))).toBeNull();
    expect(noteFromSession(session("hi", "other"))).toBeNull();
    expect(noteFromSession({ custom_fields: [] })).toBeNull();
    expect(noteFromSession(session("x".repeat(300)))?.length).toBe(255);
  });

  it("shows the note in both order emails, escaped, and nothing when there's none", async () => {
    const order = {
      id: "o1",
      orderNumber: "IB-261113-0001",
      status: "paid",
      email: "a@example.com",
      customerName: "Mia K",
      phone: null,
      shippingAddress: null,
      subtotalCents: 1095,
      discountCents: 0,
      shippingCents: 995,
      shippingMethod: "standard",
      totalCents: 2090,
      gstCents: 190,
      promoCode: null,
      stripePaymentIntentId: null,
      customerNote: "Gift for <b>Mia</b> & no receipt",
      lines: [],
      pack: [],
    } as unknown as EmailOrder;
    const alert = await render(
      createElement(OrderAlertEmail, { order, siteUrl: "https://x.test", stripeUrl: null }),
    );
    const confirm = await render(
      createElement(OrderConfirmationEmail, {
        order,
        siteUrl: "https://x.test",
        invoiceUrl: null,
        taxInvoice: true,
      }),
    );
    for (const html of [alert, confirm]) {
      expect(html).toContain("Gift for &lt;b&gt;Mia&lt;/b&gt; &amp; no receipt");
      expect(html).not.toContain("<b>Mia</b>");
    }
    expect(alert).toContain("Customer note");
    expect(confirm).toContain("Your note");

    const none = await render(
      createElement(OrderConfirmationEmail, {
        order: { ...order, customerNote: null },
        siteUrl: "https://x.test",
        invoiceUrl: null,
        taxInvoice: true,
      }),
    );
    expect(none).not.toContain("Your note");
  });
});
