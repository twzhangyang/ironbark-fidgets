import type { Metadata } from "next";

import { TagForm } from "@/components/admin/catalog-forms";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getTagsList } from "@/lib/admin/queries";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Tags" };

/** Filter labels across categories, grouped (Phase 8 D3, D9). */
export default async function TagsPage() {
  await requireAdmin();
  const tags = await getTagsList();
  const groups = [...new Set(tags.map((t) => t.group))];
  return (
    <>
      <PageTitle>Tags</PageTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        Tags become filters in the shop, one section per group (e.g. <strong>Size</strong>: Mini,
        Jumbo; <strong>Feel</strong>: Slow-rise; <strong>Extras</strong>: Scented, Keychain). Tick
        them on each product. Untick “Show” to hide a tag without losing it.
      </p>
      <div className="space-y-5">
        {groups.map((g) => (
          <Card key={g}>
            <h2 className="mb-3 font-heading text-lg font-semibold">{g}</h2>
            <ul className="divide-y">
              {tags
                .filter((t) => t.group === g)
                .map((t) => (
                  <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="mb-1 text-xs text-muted-foreground">{t.products} products</p>
                    <TagForm
                      groups={groups}
                      values={{
                        id: t.id,
                        name: t.name,
                        slug: t.slug,
                        group: t.group,
                        sortOrder: t.sortOrder,
                        active: t.active,
                      }}
                    />
                  </li>
                ))}
            </ul>
          </Card>
        ))}
        <Card className="border-2 border-dashed bg-transparent">
          <h2 className="mb-3 font-semibold">New tag</h2>
          <TagForm
            groups={groups}
            values={{ name: "", slug: "", group: "", sortOrder: tags.length, active: true }}
          />
        </Card>
      </div>
    </>
  );
}
