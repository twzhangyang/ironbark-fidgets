import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AutoSubmitCheckbox } from "@/components/admin/auto-submit";
import { Card, linkButton, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getCatalogLists } from "@/lib/admin/queries";
import { imageUrl } from "@/lib/images";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Boxes" };

export default async function BoxesPage({ searchParams }: PageProps<"/admin/boxes">) {
  await requireAdmin();
  const { boxes: all } = await getCatalogLists();
  // Boxes not on sale are left out unless ticked (like Products and Stock).
  const { hidden } = await searchParams;
  const showHidden = hidden === "1";
  const boxes = showHidden ? all : all.filter((b) => b.active);
  const hiddenCount = all.length - all.filter((b) => b.active).length;
  return (
    <>
      <PageTitle
        actions={
          <Link
            href="/admin/boxes/new"
            className={cn(linkButton, "bg-primary text-primary-foreground")}
          >
            New box
          </Link>
        }
      >
        Boxes
      </PageTitle>
      {hiddenCount > 0 && (
        <form className="mb-3" action="/admin/boxes">
          <AutoSubmitCheckbox name="hidden" value="1" defaultChecked={showHidden}>
            Show hidden ({hiddenCount})
          </AutoSubmitCheckbox>
          <noscript>
            <button type="submit" className="text-sm text-primary">
              Apply
            </button>
          </noscript>
        </form>
      )}
      {boxes.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            {all.length ? "No boxes on sale. Tick Show hidden to see the rest." : "No boxes yet."}
          </p>
        </Card>
      ) : (
        <ul className="divide-y rounded-2xl bg-card ring-1 ring-border">
          {boxes.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/boxes/${b.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {b.image && (
                    <Image
                      src={imageUrl(b.image)}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-semibold",
                      !b.active && "text-muted-foreground line-through",
                    )}
                  >
                    {b.name}
                    {b.isTest && (
                      <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
                        Test
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {b.type === "mystery" ? `Blind box · ${b.pickCount} designs` : "Set box"}
                  </p>
                </div>
                <span className="text-sm tabular-nums">{formatAud(b.priceCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
