import type { Metadata } from "next";

import { ReceiveForm } from "@/components/admin/stock-forms";
import { PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getStock } from "@/lib/admin/queries";
import { stockLabel } from "@/lib/admin/stock";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Receive shipment" };

export default async function ReceivePage() {
  await requireAdmin();
  const rows = await getStock();
  return (
    <>
      <PageTitle>Receive shipment</PageTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        Type how many pieces of each design arrived (a supplier box of 12 = 12). Leave the rest
        empty. You&apos;ll see a summary before anything is saved. People waiting for a sold-out
        design get their back-in-stock email straight away.
      </p>
      <ReceiveForm
        designs={rows.map((r) => ({
          id: r.id,
          label: stockLabel(r),
          sku: r.sku,
          category: r.category,
          stock: r.stock,
          active: r.active,
          isTest: r.isTest,
          boxQty: r.boxQty,
        }))}
      />
    </>
  );
}
