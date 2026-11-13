import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  packOrder,
  putBackStock,
  resendOrderEmails,
  resendShippedEmail,
  undoOrderStep,
} from "@/actions/admin/orders";
import { ActionButton, CopyButton } from "@/components/admin/action-button";
import { RefundForm, ShipForm } from "@/components/admin/order-forms";
import { Card, linkButton, PageTitle, StatusBadge } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/admin/dates";
import { REFUNDABLE } from "@/lib/admin/orders";
import { getOrder } from "@/lib/admin/queries";
import { packNote } from "@/lib/email/order-data";
import { stripeDashboardUrl } from "@/lib/email/send";
import { invoicePath } from "@/lib/invoice/token";
import { formatAud } from "@/lib/money";
import { stripeTestMode } from "@/lib/test-mode";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const order = /^[0-9a-f-]{36}$/.test(id) ? await getOrder(id) : null;
  if (!order) notFound();

  const a = order.shippingAddress;
  const addressText = a
    ? [order.customerName, a.line1, a.line2, `${a.city} ${a.state} ${a.postcode}`]
        .filter(Boolean)
        .join("\n")
    : "";
  const stripeUrl = stripeDashboardUrl(order.stripePaymentIntentId);
  const canShip = order.status === "paid" || order.status === "packed";
  const canUndo =
    order.status === "packed" || (order.status === "shipped" && !order.shippedEmailSentAt);
  const lateCancelled =
    order.status === "cancelled" && order.stripePaymentIntentId && !order.refundedAt;
  const canRefund = REFUNDABLE.includes(order.status) || lateCancelled;
  const emailsMissing =
    order.status !== "pending" &&
    order.status !== "cancelled" &&
    ((!order.confirmationSentAt && order.email) || !order.ownerAlertSentAt);

  const timeline: [string, Date | null][] = [
    ["Paid", order.paidAt],
    ["Confirmation email", order.confirmationSentAt],
    ["Owner alert", order.ownerAlertSentAt],
    ["Packed", order.packedAt],
    ["Shipped", order.shippedAt],
    ["Shipped email", order.shippedEmailSentAt],
    ["Cancelled", order.cancelledAt],
    ["Refunded", order.refundedAt],
  ];

  return (
    <>
      <PageTitle
        actions={
          <>
            <Link href={`/admin/orders/${order.id}/slip`} className={linkButton}>
              Packing slip
            </Link>
            {order.paidAt && order.status !== "cancelled" && (
              <a
                href={invoicePath(order.id)}
                target="_blank"
                rel="noreferrer"
                className={linkButton}
              >
                Invoice PDF
              </a>
            )}
            {stripeUrl && (
              <a href={stripeUrl} target="_blank" rel="noreferrer" className={linkButton}>
                Stripe payment
              </a>
            )}
          </>
        }
      >
        {order.orderNumber} <StatusBadge status={order.status} />
        {order.isTest && (
          <span className="ml-2 rounded-full bg-destructive px-2.5 py-0.5 align-middle text-sm font-semibold text-white">
            Test order
          </span>
        )}
        {order.shippingMethod === "express" && (
          <span className="ml-2 rounded-full bg-primary px-2.5 py-0.5 align-middle text-sm font-semibold text-primary-foreground">
            Express Post
          </span>
        )}
      </PageTitle>

      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {order.customerNote && (
            <Card className="bg-butter/50">
              <h2 className="mb-1 font-semibold">💬 Customer note</h2>
              <p className="text-sm whitespace-pre-wrap">{order.customerNote}</p>
            </Card>
          )}
          <Card>
            <h2 className="mb-2 font-semibold">Pack these</h2>
            <ul className="divide-y">
              {order.pack.map((p) => (
                <li key={p.sku} className="flex gap-3 py-2">
                  <span className="w-8 font-bold tabular-nums">{p.qty}×</span>
                  <span className="flex-1">
                    {p.name}
                    {packNote(p) && (
                      <span className="block text-sm font-semibold text-primary">
                        {packNote(p)}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">As ordered</h2>
            <ul className="space-y-2 text-sm">
              {order.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {l.qty} × {l.name}
                    {l.variantName ? ` (${l.variantName})` : ""}
                    {l.contents && (
                      <span className="block text-muted-foreground">{l.contents.join(" · ")}</span>
                    )}
                    {l.surpriseCount && (
                      <span className="block text-muted-foreground">
                        Blind box: {l.surpriseCount} picks each (listed above)
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">{formatAud(l.unitPriceCents * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
              <Row label="Subtotal" value={formatAud(order.subtotalCents)} />
              {order.discountCents > 0 && (
                <Row
                  label={`Discount${order.promoCode ? ` (${order.promoCode})` : ""}`}
                  value={`−${formatAud(order.discountCents)}`}
                />
              )}
              <Row
                label={order.shippingMethod === "express" ? "Shipping (Express Post)" : "Shipping"}
                value={order.shippingCents ? formatAud(order.shippingCents) : "Free"}
              />
              <Row label="Total" value={formatAud(order.totalCents)} bold />
              <Row label="Includes GST" value={formatAud(order.gstCents)} />
            </dl>
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">Timeline</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {timeline
                .filter(([, at]) => at)
                .map(([label, at]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>{formatDateTime(at)}</dd>
                  </div>
                ))}
            </dl>
            {order.trackingNumber && (
              <p className="mt-2 text-sm">
                Tracking{" "}
                <a
                  className="font-mono underline"
                  href={`https://auspost.com.au/mypost/track/details/${order.trackingNumber}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {order.trackingNumber}
                </a>
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Ship to</h2>
              {addressText && <CopyButton text={addressText} label="Copy address" />}
            </div>
            <p className="text-sm whitespace-pre-line">{addressText || "–"}</p>
            <p className="mt-2 text-sm break-all">
              {order.email && (
                <a href={`mailto:${order.email}`} className="underline">
                  {order.email}
                </a>
              )}
              {order.phone && (
                <>
                  <br />
                  <a href={`tel:${order.phone}`} className="underline">
                    {order.phone}
                  </a>
                </>
              )}
            </p>
          </Card>

          {(order.status === "paid" || canShip || canUndo) && (
            <Card className="space-y-4">
              {order.status === "paid" && (
                <ActionButton action={packOrder.bind(null, order.id)} variant="outline">
                  Mark packed
                </ActionButton>
              )}
              {canShip && <ShipForm orderId={order.id} />}
              {canUndo && (
                <ActionButton action={undoOrderStep.bind(null, order.id)} variant="ghost">
                  Undo {order.status === "packed" ? "packed" : "shipped"}
                </ActionButton>
              )}
            </Card>
          )}

          {order.status === "shipped" && (
            <Card className="space-y-1 bg-success/10 ring-success/30">
              <h2 className="font-semibold text-success">Shipped</h2>
              <p className="text-sm">
                Tracking <span className="font-mono">{order.trackingNumber}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {order.shippedEmailSentAt
                  ? `Customer emailed ${formatDateTime(order.shippedEmailSentAt)}`
                  : "Customer not emailed yet"}
              </p>
            </Card>
          )}

          {(emailsMissing || (order.status === "shipped" && !order.shippedEmailSentAt)) && (
            <Card className="space-y-3">
              <h2 className="font-semibold">Emails</h2>
              {emailsMissing && (
                <ActionButton action={resendOrderEmails.bind(null, order.id)} variant="outline">
                  Send missing order emails
                </ActionButton>
              )}
              {order.status === "shipped" && !order.shippedEmailSentAt && (
                <ActionButton action={resendShippedEmail.bind(null, order.id)} variant="outline">
                  Send shipped email
                </ActionButton>
              )}
            </Card>
          )}

          {canRefund && order.isTest !== stripeTestMode() && (
            <Card>
              <h2 className="mb-2 font-semibold">Refund</h2>
              <p className="text-sm text-muted-foreground">
                {order.isTest
                  ? "A test order: refund it from the preview admin (Stripe test mode)."
                  : "A real order: refund it from the live shop's admin."}
              </p>
            </Card>
          )}

          {canRefund && order.isTest === stripeTestMode() && (
            <Card>
              <h2 className="mb-2 font-semibold">Refund</h2>
              {lateCancelled && (
                <p className="mb-2 text-sm text-destructive">
                  Paid after the order was cancelled. Its stock was already released.
                </p>
              )}
              <RefundForm
                orderId={order.id}
                total={formatAud(order.totalCents)}
                sent={order.status === "shipped"}
                stockReleased={!!lateCancelled}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Partial refunds: use the Stripe payment page.
              </p>
            </Card>
          )}

          {order.status === "refunded" && !order.putBack && (
            <Card className="space-y-2">
              <h2 className="font-semibold">Came back in perfect condition?</h2>
              <ActionButton action={putBackStock.bind(null, order.id)} variant="outline">
                Put the items back on the shelf
              </ActionButton>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={bold ? "flex justify-between font-bold" : "flex justify-between"}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
