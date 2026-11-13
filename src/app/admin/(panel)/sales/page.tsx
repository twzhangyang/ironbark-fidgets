import type { Metadata } from "next";
import Link from "next/link";

import { Card, linkButton, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate, type Period } from "@/lib/admin/dates";
import { getSales } from "@/lib/admin/queries";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Sales" };

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
];

export default async function SalesPage({ searchParams }: PageProps<"/admin/sales">) {
  await requireAdmin();
  const { period: raw } = await searchParams;
  const period = PERIODS.find((p) => p.key === raw)?.key ?? "week";
  const { start, end, summary: s } = await getSales(period);
  const last = new Date(end.getTime() - 1);
  const tiles = [
    { label: "Orders", value: String(s.orders) },
    { label: "Revenue (incl. GST)", value: formatAud(s.revenueCents) },
    {
      label: "Average order",
      value: s.orders ? formatAud(Math.round(s.revenueCents / s.orders)) : "–",
    },
    { label: "GST included", value: formatAud(s.gstCents) },
    { label: "Shipping charged", value: formatAud(s.shippingCents) },
    { label: `Discounts (${s.promoOrders} orders)`, value: formatAud(s.discountCents) },
    { label: `Refunds (${s.refunds})`, value: formatAud(s.refundedCents) },
  ];
  return (
    <>
      <PageTitle
        actions={
          <a href={`/admin/sales/export?period=${period}`} className={linkButton}>
            Download CSV
          </a>
        }
      >
        Sales
      </PageTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/sales?period=${p.key}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-border",
              p.key === period
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card hover:bg-muted",
            )}
          >
            {p.label}
          </Link>
        ))}
        <span className="text-sm text-muted-foreground">
          {formatDate(start)} – {formatDate(last)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="font-heading text-xl font-semibold tabular-nums">{t.value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <h2 className="mb-2 font-semibold">Best sellers</h2>
        {s.top.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales in this period.</p>
        ) : (
          <ol className="divide-y text-sm">
            {s.top.map((t, i) => (
              <li key={t.name} className="flex gap-3 py-2">
                <span className="w-5 text-muted-foreground">{i + 1}</span>
                <span className="flex-1">{t.name}</span>
                <span className="tabular-nums">{t.units} sold</span>
                <span className="w-20 text-right tabular-nums">{formatAud(t.revenueCents)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        Revenue = orders paid in this period that weren&apos;t refunded. A quick look only:
        BASK&apos;s books are kept in Xero.
        {s.testOrders > 0 &&
          ` ${s.testOrders} test ${s.testOrders === 1 ? "order" : "orders"} (Stripe test mode) not counted.`}
      </p>
    </>
  );
}
