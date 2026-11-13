/**
 * Checks review eligibility and moderation against the real database. Uses a temporary shipped
 * order for a test email and removes it (and its reviews) afterwards. Stock is not touched.
 *   pnpm review:check
 */
import { eq } from "drizzle-orm";

import {
  allRatings,
  decidePhoto,
  deleteReview,
  hideReview,
  publicReviews,
  reviewableItems,
  saveReview,
  unhideReview,
} from "../src/lib/account/reviews";
import { emailOptouts, orderItems, orders, reviews, variants } from "../src/lib/db/schema";
import type { OutgoingEmail } from "../src/lib/email/client";
import { findDueReviewRequests, sendReviewRequests } from "../src/lib/email/review-requests";
import { connect, errorMessage } from "./_db";

const EMAIL = "review-check@example.com";
const PHOTO = "reviews/00000000-0000-4000-8000-000000000000.webp";

async function main() {
  const { sql, db } = connect();
  const problems: string[] = [];
  const expect = (ok: boolean, msg: string) => ok || problems.push(msg);
  let orderId: string | undefined;
  const [variant] = await db
    .select()
    .from(variants)
    .where(eq(variants.active, true))
    .orderBy(variants.sku)
    .limit(1);
  const target = { type: "product" as const, id: variant.productId };
  const who = { email: EMAIL, displayName: "Test C." };
  const input = { target, rating: 4, title: "", body: "Lovely slow rise.", photo: null };

  try {
    [{ id: orderId }] = await db
      .insert(orders)
      .values({
        orderNumber: `IB-TEST-${Date.now()}`,
        status: "paid",
        email: EMAIL,
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
        confirmationSentAt: new Date(),
        ownerAlertSentAt: new Date(),
        reviewRequestSentAt: new Date(),
      })
      .returning({ id: orders.id });
    await db.insert(orderItems).values({
      orderId,
      variantId: variant.id,
      name: "Test item",
      unitPriceCents: variant.priceCents,
      qty: 1,
    });

    // Not shipped yet → nothing to review, and saving is refused (D9).
    expect((await reviewableItems(db, EMAIL)).length === 0, "paid order isn't reviewable");
    expect(!(await saveReview(db, who, input)).ok, "can't review before shipping");

    await db
      .update(orders)
      .set({ status: "shipped", shippedAt: new Date() })
      .where(eq(orders.id, orderId));
    const items = await reviewableItems(db, EMAIL);
    expect(items.length === 1 && items[0].target.id === target.id, "shipped item is reviewable");
    expect(
      (await reviewableItems(db, "someone-else@example.com")).every((i) => i.orderId !== orderId),
      "other emails can't review it",
    );

    const saved = await saveReview(db, who, { ...input, photo: PHOTO });
    expect(saved.ok && saved.photoPending, "review saved, photo pending");
    if (!saved.ok) throw new Error("review not saved");
    expect((await reviewableItems(db, EMAIL)).length === 0, "reviewed once → not listed again");

    let pub = await publicReviews(db, target);
    const mine = () => pub.find((r) => r.id === saved.id);
    expect(!!mine() && mine()!.photoPath === null, "text live straight away, photo hidden");
    expect(!!(await decidePhoto(db, saved.id, true)), "photo approved");
    pub = await publicReviews(db, target);
    expect(mine()?.photoPath === PHOTO, "approved photo shows");
    const rated = (await allRatings(db)).products.get(target.id);
    expect(!!rated && rated.count >= 1 && rated.avg >= 1, "rating counts the review");

    // Editing keeps the approval if the photo is the same, resets it if it changes.
    const edit = await saveReview(db, who, { ...input, rating: 2, photo: PHOTO });
    expect(edit.ok && !edit.photoPending, "edit keeps approved photo");
    const swap = await saveReview(db, who, {
      ...input,
      photo: "reviews/00000000-0000-4000-8000-000000000001.webp",
    });
    expect(swap.ok && swap.photoPending, "new photo needs approval again");
    const count = await db.select().from(reviews).where(eq(reviews.email, EMAIL));
    expect(count.length === 1, "edits don't create a second review");

    expect(await hideReview(db, saved.id, "Spam or advertising"), "hide");
    pub = await publicReviews(db, target);
    expect(!mine(), "hidden review isn't public");
    await saveReview(db, who, input);
    const [afterEdit] = await db.select().from(reviews).where(eq(reviews.id, saved.id));
    expect(afterEdit.status === "hidden", "editing a hidden review keeps it hidden");
    expect(await unhideReview(db, saved.id), "unhide");

    expect(!(await deleteReview(db, "someone-else@example.com", saved.id)), "can't delete others'");
    expect(!!(await deleteReview(db, EMAIL, saved.id)), "delete own review");

    // Review request email (D13): 7+ days after shipping, once, never after an opt-out.
    const mineDue = async (now = new Date()) =>
      (await findDueReviewRequests(db, now, EMAIL)).find((d) => d.orderId === orderId);
    await db
      .update(orders)
      .set({ reviewRequestSentAt: null, shippedAt: new Date(Date.now() - 2 * 86_400_000) })
      .where(eq(orders.id, orderId));
    expect(!(await mineDue()), "not due 2 days after shipping");
    await db
      .update(orders)
      .set({ shippedAt: new Date(Date.now() - 8 * 86_400_000) })
      .where(eq(orders.id, orderId));
    const due = await mineDue();
    expect(due?.items.length === 1 && due.firstName === "Test", "due after 7 days, lists the item");
    await db.insert(emailOptouts).values({ email: EMAIL }).onConflictDoNothing();
    expect(!(await mineDue()), "opted-out email isn't asked");
    await db.delete(emailOptouts).where(eq(emailOptouts.email, EMAIL));

    const outbox: OutgoingEmail[] = [];
    const fake = async (m: OutgoingEmail) => void outbox.push(m);
    await sendReviewRequests(db, fake, { delayMs: 0, onlyEmail: EMAIL });
    const ours = outbox.filter((m) => m.to === EMAIL);
    expect(
      ours.length === 1 && ours[0].idempotencyKey === `review-request/${orderId}`,
      "sent once",
    );
    expect(!!ours[0]?.headers?.["List-Unsubscribe"], "carries one-click unsubscribe");
    await sendReviewRequests(db, fake, { delayMs: 0, onlyEmail: EMAIL });
    expect(outbox.filter((m) => m.to === EMAIL).length === 1, "never sent twice");
  } catch (e) {
    problems.push(errorMessage(e));
  } finally {
    await db.delete(reviews).where(eq(reviews.email, EMAIL));
    if (orderId) await db.delete(orders).where(eq(orders.id, orderId));
    await sql.end();
  }
  console.log(problems.length ? `✗ ${problems.join("\n✗ ")}` : "✓ review rules work");
  process.exitCode = problems.length ? 1 : 0;
}

void main();
