import type { Metadata } from "next";

import { toBoxDesigns } from "@/components/admin/box-designs";
import { BoxForm } from "@/components/admin/catalog-forms";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getBoxEdit } from "@/lib/admin/queries";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "New box" };

export default async function NewBoxPage() {
  await requireAdmin();
  const { designs } = await getBoxEdit(null);
  return (
    <>
      <PageTitle>New box</PageTitle>
      <Card>
        <BoxForm
          designs={toBoxDesigns(designs)}
          values={{
            name: "",
            slug: "",
            description: "",
            type: "fixed",
            priceCents: null,
            pickCount: 3,
            images: [],
            sortOrder: 0,
            active: false,
            items: [],
          }}
        />
      </Card>
    </>
  );
}
