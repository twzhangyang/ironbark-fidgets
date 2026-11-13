import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AutoSubmitCheckbox, AutoSubmitSelect } from "@/components/admin/auto-submit";
import { Card, linkButton, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getCatalogLists } from "@/lib/admin/queries";
import { imageUrl } from "@/lib/images";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const { products: all, collections } = await getCatalogLists();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const c = one(params.c);
  const q = one(params.q).trim().toLowerCase().slice(0, 60);
  // Products not shown in the shop are left out unless ticked (like the Stock page).
  const showHidden = one(params.hidden) === "1";
  const nameOf = new Map(collections.map((x) => [x.id, x.name]));
  const matching = all.filter(
    (p) =>
      (!c || p.collectionId === c || p.parentId === c) &&
      (!q || `${p.name} ${p.slug} ${p.skus}`.toLowerCase().includes(q)),
  );
  const products = showHidden ? matching : matching.filter((p) => p.active);
  const hiddenCount = all.filter((p) => !p.active).length;
  const hiddenMatching = matching.length - matching.filter((p) => p.active).length;
  const top = collections.filter((x) => !x.parentId);
  return (
    <>
      <PageTitle
        actions={
          <Link
            href="/admin/products/new"
            className={cn(linkButton, "bg-primary text-primary-foreground")}
          >
            New product
          </Link>
        }
      >
        Products
      </PageTitle>
      {/* Plain GET form: works without JavaScript, and the address can be bookmarked. */}
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/products">
        <AutoSubmitSelect
          name="c"
          defaultValue={c}
          aria-label="Category"
          className="h-10 rounded-lg border border-input bg-card px-2 text-sm"
        >
          <option value="">All categories</option>
          {top.map((t) => [
            <option key={t.id} value={t.id}>
              {t.name}
            </option>,
            ...collections
              .filter((x) => x.parentId === t.id)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {"\u00a0\u00a0\u00a0↳ "}
                  {x.name}
                </option>
              )),
          ])}
        </AutoSubmitSelect>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Name or SKU"
          aria-label="Search products"
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm"
        />
        <button
          type="submit"
          className="h-10 rounded-lg bg-secondary px-4 text-sm font-semibold hover:bg-muted"
        >
          Filter
        </button>
        {hiddenCount > 0 && (
          <AutoSubmitCheckbox name="hidden" value="1" defaultChecked={showHidden}>
            Show hidden ({hiddenCount})
          </AutoSubmitCheckbox>
        )}
        {(c || q || showHidden) && (
          <Link href="/admin/products" className="flex h-10 items-center px-2 text-sm text-primary">
            Clear
          </Link>
        )}
      </form>
      {products.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            {all.length ? "No products match." : "No products yet."}
            {!showHidden &&
              hiddenMatching > 0 &&
              ` ${hiddenMatching} hidden ${hiddenMatching === 1 ? "product matches" : "products match"}: tick Show hidden.`}
          </p>
        </Card>
      ) : (
        <ul className="divide-y rounded-2xl bg-card ring-1 ring-border">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/products/${p.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {p.image && (
                    <Image
                      src={imageUrl(p.image)}
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
                      !p.active && "text-muted-foreground line-through",
                    )}
                  >
                    {p.name}
                    {p.isTest && (
                      <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
                        Test
                      </span>
                    )}
                    {p.designSource === "licensed" && (
                      <span className="ml-2 rounded-full bg-sky px-2 py-0.5 text-xs font-semibold">
                        Licensed
                      </span>
                    )}
                    {p.sellBox && p.boxQty && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                        Pack of {p.boxQty}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {p.parentId && `${nameOf.get(p.parentId) ?? ""} › `}
                    {p.collection} · {p.designs} {p.designs === 1 ? "design" : "designs"} ·{" "}
                    {p.stock} in stock
                    {p.sellBox && p.boxQty ? ` (${Math.floor(p.stock / p.boxQty)} packs)` : ""}
                  </p>
                </div>
                <span className="text-sm tabular-nums">
                  {p.fromCents ? formatAud(p.fromCents) : "–"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
