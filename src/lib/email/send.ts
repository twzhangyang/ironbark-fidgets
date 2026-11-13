/**
 * Every email the shop sends. Each function takes the db and a sender, so the webhook uses
 * Resend while scripts and checks can pass a fake. Never logs addresses or content.
 *
 * Exactly once (Phase 4 D5): an order email is sent only while its timestamp column is empty,
 * with a Resend idempotency key; the column is set after a successful send. A failure throws,
 * the webhook returns 500, and Stripe's retry sends only what's still missing.
 */
import { render, toPlainText } from "@react-email/components";
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ReactElement } from "react";

import { fill, messages } from "@/content/messages";
import { loadCatalogSnapshot } from "@/lib/db/catalog-snapshot";
import * as schema from "@/lib/db/schema";
import { type EmailSender, type OutgoingEmail, pause } from "@/lib/email/client";
import { getEmailConfig } from "@/lib/email/config";
import { loadEmailOrder } from "@/lib/email/order-data";
import { BackInStockEmail, type BackInStockItem } from "@/lib/email/templates/back-in-stock";
import { LaunchEmail, type LaunchItem } from "@/lib/email/templates/launch";
import { OrderAlertEmail } from "@/lib/email/templates/order-alert";
import { OrderConfirmationEmail } from "@/lib/email/templates/order-confirmation";
import { ShippedEmail } from "@/lib/email/templates/shipped";
import { createUnsubscribeToken } from "@/lib/email/unsubscribe";
import { invoicePath } from "@/lib/invoice/token";
import { imageUrl } from "@/lib/images";
import { formatAud } from "@/lib/money";
import { GST_REGISTERED, getSiteUrl } from "@/lib/site";
import { bundleAvailable, LOW_STOCK_THRESHOLD } from "@/lib/stock";

type Db = PostgresJsDatabase<typeof schema>;
const { orders, subscribers } = schema;

const SENT_STATUSES = new Set(["paid", "packed", "shipped"]);

export async function renderEmail(element: ReactElement) {
  const html = await render(element);
  return { html, text: toPlainText(html) };
}

export function stripeDashboardUrl(paymentIntentId: string | null) {
  if (!paymentIntentId) return null;
  const test = process.env.STRIPE_SECRET_KEY?.includes("_test_") ? "test/" : "";
  return `https://dashboard.stripe.com/${test}payments/${paymentIntentId}`;
}

export function unsubscribeLinks(email: string, siteUrl: string) {
  const token = createUnsubscribeToken(email, getEmailConfig().UNSUBSCRIBE_SECRET);
  const page = `${siteUrl}/unsubscribe?t=${token}`;
  return {
    page,
    // One-click unsubscribe (RFC 8058), required by Gmail and Yahoo for bulk senders.
    headers: {
      "List-Unsubscribe": `<${siteUrl}/api/unsubscribe?t=${token}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

export type OrderEmailsResult = { confirmation: boolean; ownerAlert: boolean };

/** Customer confirmation + owner alert for a paid order. Each sent at most once. */
export async function sendOrderEmails(
  db: Db,
  orderId: string,
  send: EmailSender,
): Promise<OrderEmailsResult> {
  const result = { confirmation: false, ownerAlert: false };
  const order = await loadEmailOrder(db, orderId);
  if (!order || !SENT_STATUSES.has(order.status)) return result;
  const siteUrl = getSiteUrl();
  const t = messages.email;

  if (!order.confirmationSentAt && order.email) {
    const { html, text } = await renderEmail(
      OrderConfirmationEmail({
        order,
        siteUrl,
        invoiceUrl: `${siteUrl}${invoicePath(order.id)}`,
        taxInvoice: GST_REGISTERED,
      }),
    );
    await send({
      from: "orders",
      to: order.email,
      subject: fill(t.order.subject, { number: order.orderNumber }),
      html,
      text,
      idempotencyKey: `order-confirmation/${order.id}`,
    });
    await db
      .update(orders)
      .set({ confirmationSentAt: new Date() })
      .where(and(eq(orders.id, order.id), isNull(orders.confirmationSentAt)));
    result.confirmation = true;
  }

  if (!order.ownerAlertSentAt) {
    const { html, text } = await renderEmail(
      OrderAlertEmail({
        order,
        siteUrl,
        stripeUrl: stripeDashboardUrl(order.stripePaymentIntentId),
      }),
    );
    await send({
      from: "orders",
      to: getEmailConfig().ORDER_ALERT_EMAIL,
      subject:
        (order.isTest ? "[TEST] " : "") +
        fill(order.shippingMethod === "express" ? t.alert.subjectExpress : t.alert.subject, {
          number: order.orderNumber,
          total: formatAud(order.totalCents),
        }),
      html,
      text,
      idempotencyKey: `owner-alert/${order.id}`,
    });
    await db
      .update(orders)
      .set({ ownerAlertSentAt: new Date() })
      .where(and(eq(orders.id, order.id), isNull(orders.ownerAlertSentAt)));
    result.ownerAlert = true;
  }
  return result;
}

/** "It's on its way" with tracking. Phase 5's "Mark shipped" calls this. Once only. */
export async function sendShippedEmail(db: Db, orderId: string, send: EmailSender) {
  const order = await loadEmailOrder(db, orderId);
  if (!order || order.status !== "shipped" || !order.trackingNumber || !order.email) return false;
  if (order.shippedEmailSentAt) return false;
  const email = await buildShippedEmail(order, order.trackingNumber);
  await send({ ...email, to: order.email, idempotencyKey: `shipped/${order.id}` });
  await db
    .update(orders)
    .set({ shippedEmailSentAt: new Date() })
    .where(and(eq(orders.id, order.id), isNull(orders.shippedEmailSentAt)));
  return true;
}

export async function buildShippedEmail(
  order: NonNullable<Awaited<ReturnType<typeof loadEmailOrder>>>,
  trackingNumber: string,
): Promise<Omit<OutgoingEmail, "to">> {
  const { html, text } = await renderEmail(
    ShippedEmail({ order, siteUrl: getSiteUrl(), trackingNumber }),
  );
  return {
    from: "orders",
    subject: fill(messages.email.shipped.subject, { number: order.orderNumber }),
    html,
    text,
  };
}

type Due = { id: string; email: string; item: BackInStockItem };

/** Back-in-stock sign-ups whose item can be bought again (Phase 4 D8). */
export async function findDueBackInStock(db: Db): Promise<Due[]> {
  const rows = await db
    .select()
    .from(subscribers)
    .where(
      and(
        eq(subscribers.kind, "back_in_stock"),
        isNull(subscribers.unsubscribedAt),
        isNull(subscribers.notifiedAt),
      ),
    );
  if (rows.length === 0) return [];
  // Test products too: only the owner can sign up for one (on preview), to test this email.
  const cat = await loadCatalogSnapshot(db, { includeTest: true });
  const siteUrl = getSiteUrl();
  const variants = new Map(cat.variants.map((v) => [v.id, v]));
  const products = new Map(cat.products.map((p) => [p.id, p]));
  const boxes = new Map(cat.bundles.map((b) => [b.id, b]));
  const designs = (productId: string) =>
    cat.variants.filter((v) => v.productId === productId).length;
  const low = (n: number) => (n <= LOW_STOCK_THRESHOLD ? n : null);

  const due: Due[] = [];
  for (const row of rows) {
    if (row.variantId) {
      const v = variants.get(row.variantId);
      const p = v && products.get(v.productId);
      if (!v || !p || v.stock <= 0) continue;
      const multi = designs(p.id) > 1;
      due.push({
        id: row.id,
        email: row.email,
        item: {
          name: multi ? `${p.name} (${v.name})` : p.name,
          priceCents: v.priceCents,
          image: imageUrl(v.image ?? p.images[0] ?? ""),
          url: `${siteUrl}/products/${p.slug}${multi ? `?v=${v.slug}` : ""}`,
          lowCount: low(v.stock),
        },
      });
    } else if (row.bundleId) {
      const b = boxes.get(row.bundleId);
      const available = b ? bundleAvailable(b, variants) : 0;
      if (!b || available <= 0) continue;
      due.push({
        id: row.id,
        email: row.email,
        item: {
          name: b.name,
          priceCents: b.priceCents,
          image: imageUrl(b.images[0] ?? ""),
          url: `${siteUrl}/boxes/${b.slug}`,
          lowCount: low(available),
        },
      });
    }
  }
  return due;
}

/** Sends due back-in-stock alerts, one per sign-up. Phase 5 calls this after a restock. */
export async function sendBackInStockAlerts(
  db: Db,
  send: EmailSender,
  { dryRun = false, delayMs = 600 } = {},
): Promise<{ due: number; sent: number }> {
  const due = await findDueBackInStock(db);
  if (dryRun) return { due: due.length, sent: 0 };
  const siteUrl = getSiteUrl();
  let sent = 0;
  for (const d of due) {
    const unsub = unsubscribeLinks(d.email, siteUrl);
    const { html, text } = await renderEmail(
      BackInStockEmail({ item: d.item, siteUrl, unsubscribeUrl: unsub.page }),
    );
    await send({
      from: "hello",
      to: d.email,
      subject: fill(messages.email.backInStock.subject, { name: d.item.name }),
      html,
      text,
      headers: unsub.headers,
      idempotencyKey: `back-in-stock/${d.id}`,
    });
    await db.update(subscribers).set({ notifiedAt: new Date() }).where(eq(subscribers.id, d.id));
    sent++;
    if (delayMs) await pause(delayMs);
  }
  return { due: due.length, sent };
}

/** Up to four in-stock products for the launch email. */
async function launchItems(db: Db): Promise<LaunchItem[]> {
  const cat = await loadCatalogSnapshot(db);
  const siteUrl = getSiteUrl();
  const items = cat.products.flatMap((p) => {
    const own = cat.variants.filter((v) => v.productId === p.id && v.stock > 0);
    if (own.length === 0) return [];
    const item: LaunchItem = {
      name: p.name,
      priceCents: Math.min(...own.map((v) => v.priceCents)),
      image: imageUrl(p.images[0] ?? ""),
      url: `${siteUrl}/products/${p.slug}`,
    };
    return [{ item, bestseller: p.badges.includes("bestseller") }];
  });
  return items
    .sort((a, b) => Number(b.bestseller) - Number(a.bestseller))
    .slice(0, 4)
    .map((x) => x.item);
}

export async function buildLaunchEmail(db: Db, email: string, promoCode: string | null) {
  const siteUrl = getSiteUrl();
  const unsub = unsubscribeLinks(email, siteUrl);
  const { html, text } = await renderEmail(
    LaunchEmail({ items: await launchItems(db), promoCode, siteUrl, unsubscribeUrl: unsub.page }),
  );
  return { html, text, headers: unsub.headers };
}

/**
 * Launch email to the waitlist (Phase 6). Dry run counts and sends one preview to the owner.
 * Re-running never double-sends (`launch_sent_at`).
 */
export async function sendLaunchEmail(
  db: Db,
  send: EmailSender,
  { dryRun = true, promoCode = null as string | null, delayMs = 600 } = {},
): Promise<{ waiting: number; sent: number }> {
  const rows = await db
    .select({ id: subscribers.id, email: subscribers.email })
    .from(subscribers)
    .where(
      and(
        eq(subscribers.kind, "waitlist"),
        isNull(subscribers.unsubscribedAt),
        isNull(subscribers.launchSentAt),
      ),
    );
  // Unsubscribing marks every row for that email, so the row's own flag is enough.
  const waiting = rows;
  const subject = messages.email.launch.subject;

  if (dryRun) {
    const preview = await buildLaunchEmail(db, getEmailConfig().ORDER_ALERT_EMAIL, promoCode);
    await send({
      from: "hello",
      to: getEmailConfig().ORDER_ALERT_EMAIL,
      subject: `[preview, ${waiting.length} waiting] ${subject}`,
      ...preview,
    });
    return { waiting: waiting.length, sent: 0 };
  }

  let sent = 0;
  for (const r of waiting) {
    await send({
      from: "hello",
      to: r.email,
      subject,
      ...(await buildLaunchEmail(db, r.email, promoCode)),
      idempotencyKey: `launch/${r.id}`,
    });
    await db.update(subscribers).set({ launchSentAt: new Date() }).where(eq(subscribers.id, r.id));
    sent++;
    if (delayMs) await pause(delayMs);
  }
  return { waiting: waiting.length, sent };
}
