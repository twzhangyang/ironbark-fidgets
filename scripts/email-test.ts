/**
 * Sends one sample of an email with real data, through Resend (redirected to the owner while
 * EMAIL_REDIRECT_TO is set). Changes nothing in the database.
 *   pnpm email:test confirmation|alert|shipped [IB-…]   (default: latest paid order)
 *   pnpm email:test back-in-stock|launch
 */
import { desc, eq, inArray } from "drizzle-orm";

import { fill, messages } from "../src/content/messages";
import { orders } from "../src/lib/db/schema";
import { resendSender } from "../src/lib/email/client";
import { getEmailConfig } from "../src/lib/email/config";
import { loadEmailOrder } from "../src/lib/email/order-data";
import { buildLaunchEmail, buildShippedEmail, renderEmail } from "../src/lib/email/send";
import { BackInStockEmail } from "../src/lib/email/templates/back-in-stock";
import { OrderAlertEmail } from "../src/lib/email/templates/order-alert";
import { OrderConfirmationEmail } from "../src/lib/email/templates/order-confirmation";
import { getSiteUrl } from "../src/lib/site";
import { connect, errorMessage } from "./_db";

async function main() {
  const [kind, number] = process.argv.slice(2);
  const { sql, db } = connect();
  const owner = getEmailConfig().ORDER_ALERT_EMAIL;
  const siteUrl = getSiteUrl();
  try {
    if (kind === "back-in-stock" || kind === "launch") {
      const email =
        kind === "launch"
          ? await buildLaunchEmail(db, owner, "ARVO10")
          : {
              ...(await renderEmail(
                BackInStockEmail({
                  item: {
                    name: "Cat Keycap Keychain (Siamese)",
                    priceCents: 995,
                    image: null,
                    url: `${siteUrl}/products/cat-keycap-keychain?v=siamese`,
                    lowCount: 2,
                  },
                  siteUrl,
                  unsubscribeUrl: `${siteUrl}/unsubscribe?t=sample`,
                }),
              )),
            };
      const subject =
        kind === "launch"
          ? messages.email.launch.subject
          : fill(messages.email.backInStock.subject, { name: "Cat Keycap Keychain (Siamese)" });
      await resendSender({ from: "hello", to: owner, subject: `[test] ${subject}`, ...email });
      console.log(`✓ sent ${kind} sample`);
      return;
    }

    const [row] = number
      ? await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNumber, number))
      : await db
          .select({ id: orders.id })
          .from(orders)
          .where(inArray(orders.status, ["paid", "packed", "shipped"]))
          .orderBy(desc(orders.paidAt))
          .limit(1);
    if (!row) throw new Error("no paid order found");
    const order = await loadEmailOrder(db, row.id);
    if (!order) throw new Error("order not found");
    const to = order.email ?? owner;

    if (kind === "shipped") {
      const email = await buildShippedEmail(order, "TEST1234567890");
      await resendSender({ ...email, to, subject: `[test] ${email.subject}` });
    } else if (kind === "alert") {
      const { html, text } = await renderEmail(
        OrderAlertEmail({ order, siteUrl, stripeUrl: null }),
      );
      await resendSender({
        from: "orders",
        to: owner,
        subject: `[test] ${fill(messages.email.alert.subject, { number: order.orderNumber, total: "" })}`,
        html,
        text,
      });
    } else if (kind === "confirmation") {
      const { html, text } = await renderEmail(
        OrderConfirmationEmail({ order, siteUrl, invoiceUrl: null, taxInvoice: false }),
      );
      await resendSender({
        from: "orders",
        to,
        subject: `[test] ${fill(messages.email.order.subject, { number: order.orderNumber })}`,
        html,
        text,
      });
    } else {
      throw new Error("kind must be confirmation | alert | shipped | back-in-stock | launch");
    }
    console.log(`✓ sent ${kind} sample for ${order.orderNumber}`);
  } catch (e) {
    console.error("✗", errorMessage(e));
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
