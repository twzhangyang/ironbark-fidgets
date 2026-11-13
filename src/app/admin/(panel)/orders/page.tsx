import type { Metadata } from "next";
import Link from "next/link";

import { Card, linkButton, PageTitle, StatusBadge } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/admin/dates";
import { ORDER_TABS, type OrderTab } from "@/lib/admin/orders";
import { getOrders } from "@/lib/admin/queries";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const params = await searchParams;
  const tab: OrderTab =
    typeof params.tab === "string" && params.tab in ORDER_TABS ? (params.tab as OrderTab) : "pack";
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const rows = await getOrders(tab, q);

  return (
    <>
      <PageTitle
        actions={
          tab === "pack" && rows.length > 0 ? (
            <Link href="/admin/orders/slips" className={linkButton}>
              {rows.length === 1 ? "Print 1 slip" : `Print all ${rows.length} slips`}
            </Link>
          ) : null
        }
      >
        Orders
      </PageTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(ORDER_TABS) as OrderTab[]).map((key) => (
          <Link
            key={key}
            href={`/admin/orders?tab=${key}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-border",
              key === tab
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card hover:bg-muted",
            )}
          >
            {ORDER_TABS[key].label}
          </Link>
        ))}
        <form className="ml-auto flex w-full gap-2 sm:w-auto">
          <input type="hidden" name="tab" value={tab} />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Order, name, email, postcode"
            className="h-9 bg-card sm:w-64"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            {q
              ? "No orders match."
              : tab === "pack"
                ? "Nothing to pack. 🎉"
                : "No orders here yet."}
          </p>
        </Card>
      ) : (
        <ul className="divide-y rounded-2xl bg-card ring-1 ring-border">
          {rows.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {o.orderNumber} <span className="font-normal">· {o.customerName ?? "–"}</span>
                    {o.isTest && (
                      <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
                        Test
                      </span>
                    )}
                    {o.shippingMethod === "express" && (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        Express
                      </span>
                    )}
                    {o.hasNote && (
                      <span
                        className="ml-2 rounded-full bg-butter px-2 py-0.5 text-xs font-semibold"
                        title="The customer left a note"
                      >
                        💬 Note
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(o.paidAt)} · {o.items} items
                    {o.state ? ` · ${o.state} ${o.postcode}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatAud(o.totalCents)}</p>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
