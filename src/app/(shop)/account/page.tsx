import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccountBar } from "@/components/account/account-bar";
import { SignInCard } from "@/components/account/sign-in-card";
import { Container } from "@/components/site/container";
import { buttonVariants } from "@/components/ui/button";
import { fill, messages } from "@/content/messages";
import { getCustomer, safeNext } from "@/lib/account/auth";
import { getMyOrders } from "@/lib/account/queries";
import { formatDate } from "@/lib/admin/dates";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";

const t = messages.account;

// Reads the session: always per request.
export const instant = false;

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Container className="py-10">
      <Suspense fallback={<div className="h-96" aria-hidden />}>
        <Account searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Account({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const params = await searchParams;
  const customer = await getCustomer();
  if (!customer) {
    const next = safeNext(params.next);
    const error = params.error === "google" ? t.signIn.googleFailed : undefined;
    return (
      <div className="space-y-4">
        {params.deleted === "1" && (
          <p role="status" className="mx-auto max-w-md rounded-2xl bg-success/10 p-4 text-sm">
            {t.settingsPage.deleted}
          </p>
        )}
        <SignInCard next={next} error={error} />
      </div>
    );
  }
  const { orders } = await getMyOrders();
  return (
    <div className="mx-auto max-w-3xl">
      <AccountBar email={customer.email} />
      <h1 className="mb-4 font-heading text-3xl font-semibold">{t.orders.title}</h1>
      {orders.length === 0 ? (
        <div className="space-y-4 rounded-3xl bg-card p-6 ring-1 ring-border">
          <p>{fill(t.orders.empty, { email: customer.email })}</p>
          <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "rounded-full")}>
            {t.orders.emptyCta}
          </Link>
        </div>
      ) : (
        <ul className="divide-y rounded-3xl bg-card ring-1 ring-border">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="flex items-center gap-3 p-4 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {fill(t.orders.placed, { date: formatDate(o.paidAt) })} ·{" "}
                    {o.items === 1 ? t.orders.item : fill(t.orders.items, { count: o.items })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatAud(o.totalCents)}</p>
                  <p className="text-sm text-muted-foreground">{t.status[o.status]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-muted-foreground">{t.orders.guestNote}</p>
    </div>
  );
}
