import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/admin/action-button";
import { PackingSlip } from "@/components/admin/packing-slip";
import { PageTitle, TextLink } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getOrder } from "@/lib/admin/queries";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Packing slip" };

export default async function SlipPage({ params }: PageProps<"/admin/orders/[id]/slip">) {
  await requireAdmin();
  const { id } = await params;
  const order = /^[0-9a-f-]{36}$/.test(id) ? await getOrder(id) : null;
  if (!order) notFound();
  return (
    <>
      <PageTitle actions={<PrintButton />}>
        Slip <TextLink href={`/admin/orders/${order.id}`}>{order.orderNumber}</TextLink>
      </PageTitle>
      <PackingSlip order={order} />
    </>
  );
}
