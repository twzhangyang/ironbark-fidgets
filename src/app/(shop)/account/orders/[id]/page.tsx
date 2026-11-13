import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AccountBar } from "@/components/account/account-bar";
import { BuyAgain } from "@/components/account/buy-again";
import { Container } from "@/components/site/container";
import { buttonVariants } from "@/components/ui/button";
import { fill, messages } from "@/content/messages";
import { requireCustomer } from "@/lib/account/auth";
import { getMyOrder } from "@/lib/account/queries";
import { formatDateTime } from "@/lib/admin/dates";
import { invoicePath } from "@/lib/invoice/token";
import { formatAud } from "@/lib/money";
import { GST_REGISTERED } from "@/lib/site";
import { cn } from "@/lib/utils";

const t = messages.account;
const c = messages.checkout;

// Reads the session: always per request.
export const instant = false;

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

export default function AccountOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  return (
    <Container className="py-10">
      <Suspense fallback={<div className="h-96" aria-hidden />}>
        <Order params={params} />
      </Suspense>
    </Container>
  );
}

async function Order({ params }: { params: PageProps<"/account/orders/[id]">["params"] }) {
  const { id } = await params;
  const customer = await requireCustomer(`/account/orders/${id}`);
  const order = /^[0-9a-f-]{36}$/.test(id) ? await getMyOrder(id) : null;
  // Someone else's order looks exactly like a missing one.
  if (!order) notFound();

  const a = order.shippingAddress;
  const steps: [string, Date | null][] = [
    [t.order.timeline.paid, order.paidAt],
    [t.order.timeline.packed, order.packedAt],
    [t.order.timeline.shipped, order.shippedAt],
    [t.order.timeline.refunded, order.refundedAt],
  ];
  const help = `mailto:${messages.brand.email}?subject=${encodeURIComponent(
    fill(t.order.helpSubject, { number: order.orderNumber }),
  )}`;

  return (
    <div className="mx-auto max-w-3xl">
      <AccountBar email={customer.email} />
      <Link href="/account" className="text-sm font-semibold hover:underline">
        ← {t.order.back}
      </Link>
      <div className="mt-2 mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-heading text-3xl font-semibold">
          {fill(t.order.title, { number: order.orderNumber })}
        </h1>
        <span className="rounded-full bg-butter px-3 py-1 text-sm font-semibold">
          {t.status[order.status]}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <section className="space-y-3 rounded-3xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-semibold">{c.items}</h2>
          <ul className="space-y-3">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  {l.qty} × {l.name}
                  {l.variantName ? ` (${l.variantName})` : ""}
                  {l.contents && (
                    <span className="block text-sm text-muted-foreground">
                      {l.contents.join(" · ")}
                    </span>
                  )}
                  {l.surpriseCount && (
                    <span className="block text-sm text-muted-foreground">
                      {fill(t.order.surprise, { count: l.surpriseCount })}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">{formatAud(l.unitPriceCents * l.qty)}</span>
              </li>
            ))}
          </ul>
          {order.customerNote && (
            <div className="rounded-xl bg-muted p-3 text-sm">
              <p className="font-semibold">{messages.checkout.note.yours}</p>
              <p className="whitespace-pre-wrap">{order.customerNote}</p>
            </div>
          )}
          {order.picks && (
            <p className="rounded-xl bg-butter/50 p-3 text-sm">
              {fill(t.order.picks, { names: order.picks.join(", ") })}
            </p>
          )}
          <dl className="space-y-1 border-t pt-3 text-sm">
            <Row label={c.subtotal} value={formatAud(order.subtotalCents)} />
            {order.discountCents > 0 && (
              <Row
                label={`${c.discount}${order.promoCode ? ` (${order.promoCode})` : ""}`}
                value={`−${formatAud(order.discountCents)}`}
              />
            )}
            <Row
              label={
                order.shippingMethod === "express" ? messages.cart.shippingExpress : c.shipping
              }
              value={
                order.shippingCents ? formatAud(order.shippingCents) : messages.cart.shippingFree
              }
            />
            <Row label={c.total} value={formatAud(order.totalCents)} bold />
          </dl>
        </section>

        <aside className="space-y-4">
          <section className="space-y-2 rounded-3xl bg-card p-5 text-sm ring-1 ring-border">
            {order.trackingNumber ? (
              <>
                <p>{fill(t.order.trackingNumber, { number: order.trackingNumber })}</p>
                <a
                  href={`https://auspost.com.au/mypost/track/details/${order.trackingNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full")}
                >
                  {t.order.tracking}
                </a>
              </>
            ) : (
              order.status !== "refunded" && <p>{t.order.notShipped}</p>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-2">
              {steps
                .filter(([, at]) => at)
                .map(([label, at]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>{formatDateTime(at)}</dd>
                  </div>
                ))}
            </dl>
          </section>
          {a && (
            <section className="rounded-3xl bg-card p-5 text-sm ring-1 ring-border">
              <h2 className="mb-1 font-semibold">{c.shipTo}</h2>
              <p>
                {order.customerName}
                <br />
                {a.line1}
                {a.line2 && (
                  <>
                    <br />
                    {a.line2}
                  </>
                )}
                <br />
                {a.city} {a.state} {a.postcode}
              </p>
            </section>
          )}
          {order.paidAt && (
            <a
              href={invoicePath(order.id)}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full rounded-full",
              )}
            >
              {GST_REGISTERED ? messages.invoice.download : messages.invoice.downloadPlain}
            </a>
          )}
          <BuyAgain lines={order.again} />
          <a href={help} className="block text-sm underline underline-offset-2">
            {t.order.help}
          </a>
        </aside>
      </div>
    </div>
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
