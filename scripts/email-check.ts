/**
 * Checks the order emails go exactly once, with a fake sender (nothing is emailed):
 * first run sends both, a re-run sends nothing, a failure leaves only the failed one to retry.
 * Uses a temporary paid order and removes it afterwards.
 *   pnpm email:check
 */
import { eq } from "drizzle-orm";

import { orderItemContents, orderItems, orders, variants } from "../src/lib/db/schema";
import type { EmailSender, OutgoingEmail } from "../src/lib/email/client";
import { sendOrderEmails } from "../src/lib/email/send";
import { connect, errorMessage } from "./_db";

async function main() {
  const { sql, db } = connect();
  let orderId: string | undefined;
  const problems: string[] = [];
  const expect = (ok: boolean, msg: string) => ok || problems.push(msg);
  try {
    const [variant] = await db.select().from(variants).limit(1);
    [{ id: orderId }] = await db
      .insert(orders)
      .values({
        orderNumber: `IB-TEST-${Date.now()}`,
        status: "paid",
        email: "test@example.com",
        customerName: "Test Customer",
        shippingAddress: {
          line1: "1 Test St",
          line2: null,
          city: "Melbourne",
          state: "VIC",
          postcode: "3000",
          country: "AU",
        },
        subtotalCents: variant.priceCents,
        shippingCents: 995,
        totalCents: variant.priceCents + 995,
        gstCents: Math.round((variant.priceCents + 995) / 11),
        expiresAt: new Date(),
        paidAt: new Date(),
      })
      .returning({ id: orders.id });
    const [item] = await db
      .insert(orderItems)
      .values({
        orderId,
        variantId: variant.id,
        name: "Test item",
        unitPriceCents: variant.priceCents,
        qty: 1,
      })
      .returning({ id: orderItems.id });
    await db
      .insert(orderItemContents)
      .values({ orderItemId: item.id, variantId: variant.id, qty: 1 });

    const sent: OutgoingEmail[] = [];
    const fake: EmailSender = async (e) => void sent.push(e);
    const failAlert: EmailSender = async (e) => {
      if (e.idempotencyKey?.startsWith("owner-alert/")) throw new Error("fake failure");
      sent.push(e);
    };

    await sendOrderEmails(db, orderId, fake);
    expect(sent.length === 2, `first run should send 2, sent ${sent.length}`);
    expect(
      sent.every((e) => e.text.length > 50 && e.html.includes("<html")),
      "html + text missing",
    );
    await sendOrderEmails(db, orderId, fake);
    expect(sent.length === 2, `re-run should send nothing, total ${sent.length}`);

    await db
      .update(orders)
      .set({ confirmationSentAt: null, ownerAlertSentAt: null })
      .where(eq(orders.id, orderId));
    sent.length = 0;
    let threw = false;
    try {
      await sendOrderEmails(db, orderId, failAlert);
    } catch {
      threw = true;
    }
    const [mid] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(threw, "a failure should throw (so the webhook returns 500)");
    expect(
      !!mid.confirmationSentAt && !mid.ownerAlertSentAt,
      "only the confirmation should be marked sent",
    );
    await sendOrderEmails(db, orderId, fake);
    expect(
      sent.length === 2 && sent[1].idempotencyKey?.startsWith("owner-alert/") === true,
      "retry should send only the alert",
    );
  } catch (e) {
    problems.push(errorMessage(e));
  } finally {
    if (orderId) await db.delete(orders).where(eq(orders.id, orderId));
    await sql.end();
  }
  console.log(problems.length ? `✗ ${problems.join("\n✗ ")}` : "✓ order emails go exactly once");
  process.exitCode = problems.length ? 1 : 0;
}

void main();
