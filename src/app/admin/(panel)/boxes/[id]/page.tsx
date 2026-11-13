import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { toBoxDesigns } from "@/components/admin/box-designs";
import { BoxForm } from "@/components/admin/catalog-forms";
import { Card, linkButton, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getBoxEdit } from "@/lib/admin/queries";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Edit box" };

export default async function EditBoxPage({ params }: PageProps<"/admin/boxes/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { found, designs } = await getBoxEdit(/^[0-9a-f-]{36}$/.test(id) ? id : null);
  if (!found) notFound();
  const { box: b, items } = found;
  return (
    <>
      <PageTitle
        actions={
          <a href={`/boxes/${b.slug}`} target="_blank" rel="noreferrer" className={linkButton}>
            View in shop
          </a>
        }
      >
        {b.name}
      </PageTitle>
      <Card>
        <BoxForm
          designs={toBoxDesigns(designs)}
          values={{
            id: b.id,
            name: b.name,
            slug: b.slug,
            description: b.description,
            type: b.type,
            priceCents: b.priceCents,
            pickCount: b.pickCount,
            images: b.images,
            sortOrder: b.sortOrder,
            active: b.active,
            items,
          }}
        />
      </Card>
    </>
  );
}
