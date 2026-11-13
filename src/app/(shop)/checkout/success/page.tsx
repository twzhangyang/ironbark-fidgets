import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ClearCart } from "@/components/checkout/clear-cart";
import { Confirming } from "@/components/checkout/confirming";
import { Container } from "@/components/site/container";
import { buttonVariants } from "@/components/ui/button";
import { fill, messages } from "@/content/messages";
import { getOrderBySession } from "@/lib/checkout/queries";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";

const t = messages.checkout;

export const metadata: Metadata = { title: "Order", robots: { index: false } };

export default function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <Container className="max-w-2xl py-12 md:py-16">
      <Suspense fallback={<p className="text-muted-foreground">{t.confirmingText}</p>}>
        <OrderStatus searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function OrderStatus({ searchParams }: Pick<PageProps<"/checkout/success">, "searchParams">) {
  const { session_id } = await searchParams;
  if (typeof session_id !== "string" || !session_id.startsWith("cs_")) notFound();
  const order = await getOrderBySession(session_id);
  if (!order) notFound();

  if (order.status === "pending") return <Confirming />;
  if (order.status === "cancelled") {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">{t.expiredTitle}</h1>
        <p className="text-muted-foreground">{t.expiredText}</p>
        <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "rounded-full")}>
          {t.keepShopping}
        </Link>
      </div>
    );
  }

  const a = order.shippingAddress;
  return (
    <div className="space-y-8">
      <ClearCart />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">
          {fill(t.successTitle, { number: order.orderNumber })}
        </h1>
        <p className="text-muted-foreground">{t.successText}</p>
      </div>
      <section className="space-y-3 rounded-3xl bg-card p-6">
        <h2 className="font-heading text-lg font-semibold">{t.items}</h2>
        <ul className="divide-y">
          {order.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-4 py-2">
              <span>
                {i.qty} × {i.name}
                {i.variantName && <span className="text-muted-foreground"> ({i.variantName})</span>}
              </span>
              <span className="tabular-nums">{formatAud(i.unitPriceCents * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t pt-3 text-sm">
          <Row label={t.subtotal} value={formatAud(order.subtotalCents)} />
          {order.discountCents > 0 && (
            <Row
              label={order.promoCode ? `${t.discount} (${order.promoCode})` : t.discount}
              value={`−${formatAud(order.discountCents)}`}
            />
          )}
          <Row
            label={order.shippingMethod === "express" ? messages.cart.shippingExpress : t.shipping}
            value={
              order.shippingCents === 0
                ? messages.cart.shippingFree
                : formatAud(order.shippingCents)
            }
          />
          <Row label={t.total} value={formatAud(order.totalCents)} strong />
        </dl>
      </section>
      {a && (
        <section className="space-y-1 rounded-3xl bg-card p-6">
          <h2 className="font-heading text-lg font-semibold">{t.shipTo}</h2>
          <p>{order.customerName}</p>
          <p className="text-muted-foreground">
            {[a.line1, a.line2].filter(Boolean).join(", ")}
            <br />
            {a.city} {a.state} {a.postcode}
          </p>
        </section>
      )}
      {order.customerNote && (
        <section className="space-y-1 rounded-3xl bg-card p-6">
          <h2 className="font-heading text-lg font-semibold">{t.note.yours}</h2>
          <p className="whitespace-pre-wrap text-muted-foreground">{order.customerNote}</p>
        </section>
      )}
      <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "rounded-full")}>
        {t.keepShopping}
      </Link>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong && "pt-1 text-base font-bold")}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
