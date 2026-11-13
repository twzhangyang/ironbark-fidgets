import type { Metadata } from "next";

import { CollectionForm } from "@/components/admin/catalog-forms";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getCatalogLists } from "@/lib/admin/queries";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Categories" };

type Row = Awaited<ReturnType<typeof getCatalogLists>>["collections"][number];

/** Categories with their subcategories under them (Phase 8 D1, D9). */
export default async function CollectionsPage() {
  await requireAdmin();
  const { collections } = await getCatalogLists();
  const top = collections.filter((c) => !c.parentId);
  const childrenOf = (id: string) => collections.filter((c) => c.parentId === id);
  const parentsFor = (c: Row) =>
    top.filter((t) => t.id !== c.id).map((t) => ({ id: t.id, name: t.name }));
  const form = (c: Row) => (
    <CollectionForm
      parents={parentsFor(c)}
      hasChildren={childrenOf(c.id).length > 0}
      values={{
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        description: c.description,
        imagePath: c.imagePath,
        sortOrder: c.sortOrder,
        active: c.active,
      }}
    />
  );
  return (
    <>
      <PageTitle>Categories</PageTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        Two levels: a <strong>category</strong> (Animals) holds <strong>subcategories</strong>{" "}
        (Cats, Dogs). Put each product in the most specific one; the category page shows all of
        them.
      </p>
      <div className="space-y-6">
        {top.map((c) => {
          const kids = childrenOf(c.id);
          return (
            <section key={c.id} className="space-y-3">
              <Card>
                <p className="mb-2 text-xs text-muted-foreground">
                  Category · {c.products} products directly
                  {kids.length > 0 && ` · ${kids.length} subcategories`}
                </p>
                {form(c)}
              </Card>
              {kids.length > 0 && (
                <div className="ml-4 space-y-3 border-l-2 pl-4 sm:ml-8">
                  {kids.map((k) => (
                    <Card key={k.id}>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Subcategory of {c.name} · {k.products} products
                      </p>
                      {form(k)}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
        <Card className="border-2 border-dashed bg-transparent">
          <h2 className="mb-3 font-semibold">New category or subcategory</h2>
          <CollectionForm
            parents={top.map((t) => ({ id: t.id, name: t.name }))}
            values={{
              name: "",
              slug: "",
              parentId: null,
              description: "",
              imagePath: null,
              sortOrder: collections.length,
              active: true,
            }}
          />
        </Card>
      </div>
    </>
  );
}
