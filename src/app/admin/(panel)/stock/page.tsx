import type { Metadata } from "next";
import Link from "next/link";

import { sendDueAlerts } from "@/actions/admin/stock";
import { ActionButton, CopyButton } from "@/components/admin/action-button";
import { StockList } from "@/components/admin/stock-list";
import { Card, linkButton, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getStock } from "@/lib/admin/queries";
import { reorderList, reorderText, stockLabel } from "@/lib/admin/stock";
import { cn } from "@/lib/utils";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage({ searchParams }: PageProps<"/admin/stock">) {
  await requireAdmin();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const initial = {
    filter: one(params.filter) === "low" ? ("low" as const) : ("all" as const),
    q: one(params.q).slice(0, 100),
    hidden: one(params.hidden) === "1",
  };
  const received = receivedBanner(params);
  const all = await getStock();
  const reorder = reorderList(all);

  return (
    <>
      <PageTitle
        actions={
          <Link
            href="/admin/stock/receive"
            className={cn(linkButton, "bg-primary text-primary-foreground")}
          >
            Receive shipment
          </Link>
        }
      >
        Stock
      </PageTitle>

      {received && (
        <p
          role="status"
          className="mb-4 rounded-2xl bg-success/10 p-3 text-sm font-medium text-success"
        >
          {received}
        </p>
      )}

      {reorder.length > 0 && (
        <Card className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Reorder ({reorder.length})</h2>
            <CopyButton text={reorderText(reorder)} label="Copy list" />
          </div>
          <p className="text-sm text-muted-foreground">
            At or below their low-stock level, best sellers first. Copy the list into the supplier
            chat.
          </p>
        </Card>
      )}

      <div className="mb-3 flex justify-end">
        <ActionButton action={sendDueAlerts} variant="ghost" pendingText="Sending…">
          Send due back-in-stock alerts
        </ActionButton>
      </div>

      <StockList
        // A new address from a link (e.g. the dashboard's "low stock") starts fresh.
        key={JSON.stringify(initial)}
        initial={initial}
        reorderIds={reorder.map((r) => r.id)}
        rows={all.map((r) => ({
          id: r.id,
          label: stockLabel(r),
          sku: r.sku,
          category: r.category,
          stock: r.stock,
          lowStockAt: r.lowStockAt,
          active: r.active,
          sold30: r.sold30,
          isTest: r.isTest,
        }))}
      />
    </>
  );
}

/** "Received 48 pieces across 3 designs." after Receive shipment → Confirm. */
function receivedBanner(params: Record<string, string | string[] | undefined>): string | null {
  const num = (v: unknown) => (typeof v === "string" && /^\d{1,6}$/.test(v) ? Number(v) : null);
  const units = num(params.received);
  const designs = num(params.designs);
  if (!units || !designs) return null;
  const n = (k: number, one: string) => `${k} ${k === 1 ? one : `${one}s`}`;
  const alerts =
    params.alerts === "failed"
      ? " Back-in-stock alerts didn't send: use “Send due back-in-stock alerts” to retry."
      : num(params.alerts)
        ? ` ${n(num(params.alerts)!, "back-in-stock alert")} sent.`
        : "";
  return `Received ${n(units, "piece")} across ${n(designs, "design")}.${alerts}`;
}
