import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdjustForm } from "@/components/admin/stock-forms";
import { Card, PageTitle, TextLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDateTime } from "@/lib/admin/dates";
import { getStockDetail } from "@/lib/admin/queries";
import { stockLabel } from "@/lib/admin/stock";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Stock history" };

const reasonLabel: Record<string, string> = {
  received: "Received",
  sold: "Sold",
  refunded: "Refund, put back",
  adjusted: "Adjusted",
  mystery_pick: "Blind-box pick",
  reserved: "Checkout",
  released: "Checkout released",
};

export default async function StockDetailPage({ params }: PageProps<"/admin/stock/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const detail = /^[0-9a-f-]{36}$/.test(id) ? await getStockDetail(id) : null;
  if (!detail) notFound();
  const { row, history } = detail;
  return (
    <>
      <PageTitle>{stockLabel(row)}</PageTitle>
      <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <Card>
          <h2 className="mb-2 font-semibold">History</h2>
          <ul className="divide-y text-sm">
            {history.map((m) => (
              <li key={m.id} className="flex gap-3 py-2">
                <span
                  className={
                    m.delta > 0
                      ? "w-12 font-semibold text-success tabular-nums"
                      : "w-12 font-semibold text-destructive tabular-nums"
                  }
                >
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
                <span className="min-w-0 flex-1">
                  {reasonLabel[m.reason] ?? m.reason}
                  {m.orderId && m.orderNumber && (
                    <>
                      {" "}
                      <TextLink href={`/admin/orders/${m.orderId}`}>{m.orderNumber}</TextLink>
                    </>
                  )}
                  {m.note && !m.orderId && (
                    <span className="block text-muted-foreground">{m.note}</span>
                  )}
                </span>
                <span className="text-right text-xs text-muted-foreground">
                  {formatDateTime(m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-muted-foreground">On the shelf</p>
            <p className="font-heading text-4xl font-semibold tabular-nums">{row.stock}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-mono">{row.sku}</span> · low at {row.lowStockAt} · {row.sold30}{" "}
              sold in 30 days
            </p>
          </Card>
          <Card>
            <h2 className="mb-2 font-semibold">Adjust</h2>
            <AdjustForm variantId={row.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
