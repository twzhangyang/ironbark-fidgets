/**
 * Checks the admin's order and stock logic against the real database, with a fake Stripe and a
 * fake email sender (nothing is charged or emailed). Uses a temporary paid order and test stock
 * movements, and removes them afterwards (stock ends where it started).
 *   pnpm admin:check
 */
import { and, eq, like, sql as dsql } from "drizzle-orm";
import type Stripe from "stripe";

import {
  markPacked,
  markRefundedByPaymentIntent,
  markShipped,
  needsAttention,
  refundOrder,
  undoStep,
} from "../src/lib/admin/orders";
import { adjustStock, receiveStock } from "../src/lib/admin/stock";
import {
  orderItemContents,
  orderItems,
  orders,
  stockMovements,
  variants,
} from "../src/lib/db/schema";
import type { EmailSender, OutgoingEmail } from "../src/lib/email/client";
import { sendShippedEmail } from "../src/lib/email/send";
import { connect, errorMessage } from "./_db";

const NOTE = "admin-check";

async function main() {
  const { sql, db } = connect();
  let orderId: string | undefined;
  const problems: string[] = [];
  const expect = (ok: boolean, msg: string) => ok || problems.push(msg);
  const [variant] = await db
    .select()
    .from(variants)
    .where(eq(variants.active, true))
    .orderBy(variants.sku)
    .limit(1);
  const stockOf = async () =>
    (await db.select({ s: variants.stock }).from(variants).where(eq(variants.id, variant.id)))[0].s;
  const startStock = variant.stock;

  try {
    const pi = `pi_test_admincheck_${Date.now()}`;
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
        subtotalCents: variant.priceCents * 2,
        shippingCents: 995,
        totalCents: variant.priceCents * 2 + 995,
        gstCents: Math.round((variant.priceCents * 2 + 995) / 11),
        expiresAt: new Date(),
        paidAt: new Date(),
        stripePaymentIntentId: pi,
        confirmationSentAt: new Date(),
        ownerAlertSentAt: new Date(),
      })
      .returning({ id: orders.id });
    const [item] = await db
      .insert(orderItems)
      .values({
        orderId,
        variantId: variant.id,
        name: "Test item",
        unitPriceCents: variant.priceCents,
        qty: 2,
      })
      .returning({ id: orderItems.id });
    await db
      .insert(orderItemContents)
      .values({ orderItemId: item.id, variantId: variant.id, qty: 2 });
    const status = async () => (await db.select().from(orders).where(eq(orders.id, orderId!)))[0];

    // Packed → undo → shipped (D4).
    expect(await markPacked(db, orderId), "paid → packed");
    expect(!(await markPacked(db, orderId)), "packing twice does nothing");
    expect(await undoStep(db, orderId), "undo packed");
    expect((await status()).status === "paid", "undo goes back to paid");
    expect(await markShipped(db, orderId, "33TEST1234567"), "paid → shipped");
    const shipped = await status();
    expect(
      !!shipped.packedAt && shipped.trackingNumber === "33TEST1234567",
      "shipping fills packed + tracking",
    );

    const sent: OutgoingEmail[] = [];
    const fake: EmailSender = async (e) => void sent.push(e);
    expect(await sendShippedEmail(db, orderId, fake), "shipped email sends");
    expect(!(await sendShippedEmail(db, orderId, fake)), "shipped email sends once");
    expect(
      sent.length === 1 && sent[0].text.includes("33TEST1234567"),
      "email has the tracking number",
    );
    expect(!(await undoStep(db, orderId)), "no undo after the shipped email");

    // Refund with stock put back (D6), via a fake Stripe.
    let refundCalls = 0;
    const stripe = {
      refunds: {
        create: async (params: { payment_intent: string }, opts: { idempotencyKey: string }) => {
          refundCalls++;
          if (params.payment_intent !== pi || opts.idempotencyKey !== `refund/${orderId}`)
            throw new Error("bad refund call");
          return { id: "re_test_admincheck" };
        },
      },
    } as unknown as Stripe;
    const before = await stockOf();
    const refunded = await refundOrder(db, stripe, orderId, { putBack: true, actor: NOTE });
    expect(
      refunded.ok && refunded.putBack === 2,
      `refund puts 2 back, got ${JSON.stringify(refunded)}`,
    );
    expect((await stockOf()) === before + 2, "stock +2 after put-back");
    expect((await status()).status === "refunded", "order refunded");
    const again = await refundOrder(db, stripe, orderId, { putBack: true, actor: NOTE });
    expect(!again.ok && refundCalls === 1, "a second refund is refused");
    expect((await stockOf()) === before + 2, "put-back happens once");
    expect(
      (await markRefundedByPaymentIntent(db, pi, "re_x")) === null,
      "webhook echo does nothing",
    );

    // Stock (D7): receive, adjust, never below zero.
    const s0 = await stockOf();
    expect(
      (await receiveStock(
        db,
        [
          { variantId: variant.id, qty: 3 },
          { variantId: variant.id, qty: 0 },
        ],
        { note: NOTE, actor: NOTE },
      )) === 3,
      "receive 3",
    );
    const adj = await adjustStock(db, {
      variantId: variant.id,
      delta: -3,
      note: NOTE,
      actor: NOTE,
    });
    expect(adj.ok && adj.stock === s0, "adjust −3 back");
    const below = await adjustStock(db, {
      variantId: variant.id,
      delta: -(s0 + 1),
      note: NOTE,
      actor: NOTE,
    });
    expect(!below.ok, "can't go below 0");

    const attention = await needsAttention(db);
    expect(
      !attention.some((a) => a.text.startsWith("Stock record mismatch")),
      "stock matches movements",
    );
  } catch (e) {
    problems.push(errorMessage(e));
  } finally {
    // Undo everything: put-back movements for the test order and the receive/adjust pair.
    await db.transaction(async (tx) => {
      const own = orderId
        ? await tx.select().from(stockMovements).where(eq(stockMovements.orderId, orderId))
        : [];
      const test = await tx
        .select()
        .from(stockMovements)
        .where(and(eq(stockMovements.variantId, variant.id), like(stockMovements.note, NOTE)));
      // Net change per design, applied once (one row at a time could dip below 0 midway).
      const net = new Map<string, number>();
      for (const m of [...own, ...test]) {
        net.set(m.variantId, (net.get(m.variantId) ?? 0) + m.delta);
        await tx.delete(stockMovements).where(eq(stockMovements.id, m.id));
      }
      for (const [id, delta] of net) {
        if (delta)
          await tx
            .update(variants)
            .set({ stock: dsql`${variants.stock} - ${delta}` })
            .where(eq(variants.id, id));
      }
      if (orderId) await tx.delete(orders).where(eq(orders.id, orderId));
    });
    const end = await stockOf();
    if (end !== startStock) problems.push(`stock ended at ${end}, started at ${startStock}`);
    await sql.end();
  }
  console.log(
    problems.length ? `✗ ${problems.join("\n✗ ")}` : "✓ admin orders, refunds and stock work",
  );
  process.exitCode = problems.length ? 1 : 0;
}

void main();
