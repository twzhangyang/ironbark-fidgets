import type { Metadata } from "next";
import Link from "next/link";

import { Card, PageTitle, TextLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getDashboard } from "@/lib/admin/queries";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Home" };

export default async function AdminHome() {
  await requireAdmin();
  const { counts, attention, lowStock, photos } = await getDashboard();
  const tiles = [
    { label: "To pack", value: counts.toPack, href: "/admin/orders?tab=pack" },
    { label: "Packed, not shipped", value: counts.packed, href: "/admin/orders?tab=packed" },
    { label: "Low or sold out", value: lowStock, href: "/admin/stock?filter=low" },
  ];
  return (
    <>
      <PageTitle>Today</PageTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-2xl bg-card p-4 ring-1 ring-border hover:ring-primary"
          >
            <p className="text-sm text-muted-foreground">{t.label}</p>
            <p className="font-heading text-3xl font-semibold tabular-nums">{t.value}</p>
          </Link>
        ))}
      </div>

      <Card className="mt-5">
        <h2 className="mb-3 font-semibold">Needs attention</h2>
        {attention.length === 0 && photos === 0 ? (
          <p className="text-sm text-muted-foreground">All good. Nothing waiting on you.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {photos > 0 && (
              <li className="flex flex-wrap gap-x-2">
                <TextLink href="/admin/reviews?filter=photos">Reviews</TextLink>
                <span>{photos} customer photo(s) waiting for a check</span>
              </li>
            )}
            {attention.map((a, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                {a.orderId ? (
                  <TextLink href={`/admin/orders/${a.orderId}`}>{a.orderNumber}</TextLink>
                ) : (
                  <TextLink href="/admin/stock">Stock</TextLink>
                )}
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-5 text-sm text-muted-foreground">
        Sales numbers: <TextLink href="/admin/sales">Sales</TextLink>. Refunds and payouts are also
        in the{" "}
        <a
          href="https://dashboard.stripe.com"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Stripe dashboard
        </a>
        .
      </p>
    </>
  );
}
