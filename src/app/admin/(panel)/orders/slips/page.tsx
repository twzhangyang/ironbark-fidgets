import type { Metadata } from "next";

import { PrintButton } from "@/components/admin/action-button";
import { PackingSlip } from "@/components/admin/packing-slip";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getOrdersToPack } from "@/lib/admin/queries";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Slips to pack" };

export default async function AllSlipsPage() {
  await requireAdmin();
  const orders = await getOrdersToPack();
  return (
    <>
      <PageTitle actions={orders.length ? <PrintButton label={`Print ${orders.length}`} /> : null}>
        Slips to pack
      </PageTitle>
      {orders.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">Nothing to pack.</p>
        </Card>
      ) : (
        <div className="space-y-6 print:space-y-0">
          {orders.map((o) => (
            <PackingSlip key={o.id} order={o} />
          ))}
        </div>
      )}
    </>
  );
}
