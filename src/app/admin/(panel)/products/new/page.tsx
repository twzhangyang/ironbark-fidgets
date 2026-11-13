import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/catalog-forms";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getProductEdit } from "@/lib/admin/queries";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const { collections, tags } = await getProductEdit(null);
  return (
    <>
      <PageTitle>New product</PageTitle>
      <Card>
        <ProductForm
          collections={collections}
          tags={tags}
          values={{
            name: "",
            slug: "",
            collectionId: collections[0]?.id ?? "",
            description: "",
            material: "",
            sizeLabel: "",
            ageMin: 8,
            badges: ["new"],
            images: [],
            sortOrder: 0,
            active: false,
            isTest: false,
            tagIds: [],
            designSource: "original",
            licenceNote: "",
            youtubeId: null,
            videoVertical: true,
            sellBox: false,
            boxQty: null,
            boxPriceCents: null,
            mixedBox: false,
            singlePriceCents: null,
          }}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          New products start hidden. Add designs and stock, then tick “Show in the shop”.
        </p>
      </Card>
    </>
  );
}
