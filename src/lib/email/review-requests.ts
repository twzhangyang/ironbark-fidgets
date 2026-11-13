/**
 * Review request email (Phase 7 D13): one per order, 7 days after it was shipped, listing the
 * items not reviewed yet. Marketing rules apply: skipped for anyone who opted out, and it
 * carries the unsubscribe link. Orders shipped over 30 days ago are never asked (no surprise
 * emails after a long pause). Exactly once: `review_request_sent_at` + idempotency key.
 */
import { and, desc, eq, inArray, isNotNull, isNull, lte, gt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { messages } from "@/content/messages";
import * as schema from "@/lib/db/schema";
import { type EmailSender, pause } from "@/lib/email/client";
import { renderEmail, unsubscribeLinks } from "@/lib/email/send";
import { ReviewRequestEmail, type ReviewRequestItem } from "@/lib/email/templates/review-request";
import { imageUrl } from "@/lib/images";
import { getSiteUrl } from "@/lib/site";

type Db = PostgresJsDatabase<typeof schema>;
const { bundles, emailOptouts, orderItems, orders, products, reviews, subscribers, variants } =
  schema;

export const REQUEST_AFTER_DAYS = 7;
export const REQUEST_UNTIL_DAYS = 30;

const DAY = 86_400_000;

export type DueRequest = {
  orderId: string;
  orderNumber: string;
  email: string;
  firstName: string | null;
  items: ReviewRequestItem[];
};

/** "mia kelly" → "Mia". */
export function firstName(name: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first.charAt(0).toLocaleUpperCase("en-AU") + first.slice(1) : null;
}

/** Orders due a request, with what's left to review. An empty `items` = nothing to ask. */
export async function findDueReviewRequests(
  db: Db,
  now = new Date(),
  /** Checks only: limit to one email so real orders are never touched. */
  onlyEmail?: string,
): Promise<DueRequest[]> {
  const due = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      email: orders.email,
      customerName: orders.customerName,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "shipped"),
        eq(orders.isTest, false), // Phase 12: no review requests for test orders
        isNull(orders.reviewRequestSentAt),
        isNotNull(orders.email),
        onlyEmail ? eq(orders.email, onlyEmail) : undefined,
        lte(orders.shippedAt, new Date(now.getTime() - REQUEST_AFTER_DAYS * DAY)),
        gt(orders.shippedAt, new Date(now.getTime() - REQUEST_UNTIL_DAYS * DAY)),
        sql`not exists (select 1 from ${emailOptouts} o where o.email = "orders"."email")`,
        sql`not exists (select 1 from ${subscribers} s where s.email = "orders"."email" and s.unsubscribed_at is not null)`,
      ),
    )
    .orderBy(desc(orders.shippedAt));
  if (due.length === 0) return [];

  const lines = await db
    .select({
      orderId: orderItems.orderId,
      productId: products.id,
      productName: products.name,
      productImage: sql<string | null>`${products.images}[1]`,
      bundleId: bundles.id,
      bundleName: bundles.name,
      bundleImage: sql<string | null>`${bundles.images}[1]`,
    })
    .from(orderItems)
    .leftJoin(variants, eq(variants.id, orderItems.variantId))
    .leftJoin(products, eq(products.id, variants.productId))
    .leftJoin(bundles, eq(bundles.id, orderItems.bundleId))
    .where(
      inArray(
        orderItems.orderId,
        due.map((d) => d.id),
      ),
    );
  const emails = [...new Set(due.map((d) => d.email!))];
  const done = await db
    .select({ email: reviews.email, productId: reviews.productId, bundleId: reviews.bundleId })
    .from(reviews)
    .where(inArray(reviews.email, emails));
  const reviewed = new Set(done.map((d) => `${d.email}|${d.productId ?? d.bundleId}`));

  return due.map((d) => {
    const seen = new Set<string>();
    const items: ReviewRequestItem[] = [];
    for (const l of lines) {
      const id = l.productId ?? l.bundleId;
      if (l.orderId !== d.id || !id || seen.has(id) || reviewed.has(`${d.email}|${id}`)) continue;
      seen.add(id);
      const image = l.productId ? l.productImage : l.bundleImage;
      items.push({
        name: (l.productId ? l.productName : l.bundleName) ?? "",
        image: image ? imageUrl(image) : null,
      });
    }
    return {
      orderId: d.id,
      orderNumber: d.orderNumber,
      email: d.email!,
      firstName: firstName(d.customerName),
      items,
    };
  });
}

/** Sends due requests. Orders with nothing left to review are marked done without an email. */
export async function sendReviewRequests(
  db: Db,
  send: EmailSender,
  {
    dryRun = false,
    delayMs = 600,
    now = new Date(),
    onlyEmail,
  }: { dryRun?: boolean; delayMs?: number; now?: Date; onlyEmail?: string } = {},
): Promise<{ due: number; sent: number }> {
  const due = await findDueReviewRequests(db, now, onlyEmail);
  const toSend = due.filter((d) => d.items.length > 0);
  if (dryRun) return { due: toSend.length, sent: 0 };
  const siteUrl = getSiteUrl();
  let sent = 0;
  for (const d of due) {
    if (d.items.length > 0) {
      const unsub = unsubscribeLinks(d.email, siteUrl);
      const { html, text } = await renderEmail(
        ReviewRequestEmail({
          firstName: d.firstName,
          orderNumber: d.orderNumber,
          items: d.items,
          reviewUrl: `${siteUrl}/account/reviews`,
          siteUrl,
          unsubscribeUrl: unsub.page,
        }),
      );
      await send({
        from: "hello",
        to: d.email,
        subject: messages.email.reviewRequest.subject,
        html,
        text,
        headers: unsub.headers,
        idempotencyKey: `review-request/${d.orderId}`,
      });
      sent++;
    }
    await db
      .update(orders)
      .set({ reviewRequestSentAt: new Date() })
      .where(eq(orders.id, d.orderId));
    if (delayMs && d.items.length > 0) await pause(delayMs);
  }
  return { due: toSend.length, sent };
}
