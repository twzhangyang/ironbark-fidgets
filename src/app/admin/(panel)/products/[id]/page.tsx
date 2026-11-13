import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DesignForm, ProductForm } from "@/components/admin/catalog-forms";
import { Card, linkButton, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getProductEdit } from "@/lib/admin/queries";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { found, collections, tags } = await getProductEdit(/^[0-9a-f-]{36}$/.test(id) ? id : null);
  if (!found) notFound();
  const { product: p, designs } = found;
  return (
    <>
      <PageTitle
        actions={
          <a href={`/products/${p.slug}`} target="_blank" rel="noreferrer" className={linkButton}>
            View in shop
          </a>
        }
      >
        {p.name}
      </PageTitle>
      <div className="space-y-5">
        <Card>
          <ProductForm
            collections={collections}
            tags={tags}
            values={{
              id: p.id,
              name: p.name,
              slug: p.slug,
              collectionId: p.collectionId,
              description: p.description,
              material: p.material,
              sizeLabel: p.sizeLabel,
              ageMin: p.ageMin,
              badges: p.badges,
              images: p.images,
              sortOrder: p.sortOrder,
              active: p.active,
              isTest: p.isTest,
              boxes: found.boxes,
              tagIds: found.tagIds,
              designSource: p.designSource,
              licenceNote: p.licenceNote,
              youtubeId: p.youtubeId,
              videoVertical: p.videoVertical,
              sellBox: p.sellBox,
              boxQty: p.boxQty,
              boxPriceCents: p.boxPriceCents,
              mixedBox: p.mixedBox,
              singlePriceCents: designs.filter((d) => d.active).length
                ? Math.min(...designs.filter((d) => d.active).map((d) => d.priceCents))
                : null,
            }}
          />
        </Card>
        <h2 className="font-heading text-xl font-semibold">Designs</h2>
        {designs.map((d) => (
          <Card key={d.id}>
            <DesignForm
              productId={p.id}
              values={{
                id: d.id,
                name: d.name,
                sku: d.sku,
                priceCents: d.priceCents,
                compareAtCents: d.compareAtCents,
                lowStockAt: d.lowStockAt,
                weightGrams: d.weightGrams,
                imagePath: d.imagePath,
                sortOrder: d.sortOrder,
                active: d.active,
                stock: d.stock,
              }}
            />
          </Card>
        ))}
        <Card className="border-2 border-dashed bg-transparent">
          <h3 className="mb-3 font-semibold">Add a design</h3>
          <DesignForm
            productId={p.id}
            values={{
              name: designs.length ? "" : "Default",
              sku: "",
              priceCents: designs[0]?.priceCents ?? null,
              compareAtCents: null,
              lowStockAt: 3,
              weightGrams: designs[0]?.weightGrams ?? 0,
              imagePath: null,
              sortOrder: designs.length,
              active: true,
            }}
          />
        </Card>
      </div>
    </>
  );
}
