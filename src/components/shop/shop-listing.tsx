import Link from "next/link";
import { Suspense } from "react";

import { ProductGrid, ProductGridFallback } from "@/components/product/product-grid";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { ActiveFilters, FilterPanel } from "@/components/shop/filter-panel";
import { FilterSheet } from "@/components/shop/filter-sheet";
import { Container } from "@/components/site/container";
import { fill, messages } from "@/content/messages";
import {
  getListing,
  getShopCategories,
  getTags,
  type Listing,
  PRODUCT_SORTS,
  type ProductSort,
} from "@/lib/catalog";
import { filterHref, hasFilters, parseFilters, type ShopFilters } from "@/lib/catalog-filters";
import type { Collection, Tag } from "@/lib/types";
import { cn } from "@/lib/utils";

const t = messages.shop;

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseSort(value: string | string[] | undefined): ProductSort {
  return PRODUCT_SORTS.find((s) => s === value) ?? "featured";
}

export const countLabel = (n: number) => (n === 1 ? t.countOne : fill(t.count, { count: n }));

/**
 * Shared by /shop and /shop/[collection]: breadcrumbs, title, category chips, then (reading
 * the address inside Suspense) filters, sort and grid.
 */
export async function ShopListing({
  title,
  description,
  collection,
  searchParams,
}: {
  title: string;
  description: string;
  collection?: Collection;
  searchParams: SearchParams;
}) {
  const categories = await getShopCategories();
  const basePath = collection ? `/shop/${collection.slug}` : "/shop";

  // One flat level (no "All Food"): All, Bread, Fruit, Veggies & nuts…
  const chips = [
    { name: t.all, href: "/shop", active: !collection },
    ...categories.map((c) => ({
      name: c.name,
      href: `/shop/${c.slug}`,
      active: c.id === collection?.id,
    })),
  ];

  const crumbs = collection
    ? [
        { name: messages.nav.shop, href: "/shop" },
        { name: collection.name, href: basePath },
      ]
    : null;

  return (
    <Container className="py-8 sm:py-12">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <header className="mb-6 max-w-2xl space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </header>
      <nav aria-label={t.categories} className="-mx-4 mb-6 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {chips.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                aria-current={c.active ? "page" : undefined}
                className={cn(
                  "inline-block rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition",
                  c.active ? "border-cocoa bg-cocoa text-cream" : "bg-card hover:bg-muted",
                )}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* searchParams is request data: read it inside Suspense so the shell stays static. */}
      <Suspense fallback={<ProductGridFallback />}>
        <Results
          basePath={basePath}
          collectionSlug={collection?.slug}
          searchParams={searchParams}
        />
      </Suspense>
    </Container>
  );
}

async function Results({
  basePath,
  collectionSlug,
  searchParams,
}: {
  basePath: string;
  collectionSlug?: string;
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tags = await getTags();
  const sort = parseSort(params.sort);
  const filters = parseFilters(params, tags);
  const listing = await getListing({ collectionSlug, sort, filters });
  return (
    <ListingBody
      basePath={basePath}
      listing={listing}
      filters={filters}
      tags={tags}
      keep={{ sort: sort === "featured" ? undefined : sort }}
      sort={sort}
    />
  );
}

/** Filters (sidebar or sheet), chosen-filter chips, count, sort and the grid. */
export function ListingBody({
  basePath,
  listing,
  filters,
  tags,
  keep,
  sort,
}: {
  basePath: string;
  listing: Listing;
  filters: ShopFilters;
  tags: readonly Tag[];
  keep: Record<string, string | undefined>;
  /** Omit to hide the sort links (search ranks by relevance). */
  sort?: ProductSort;
}) {
  const { products, facets, total } = listing;
  if (total === 0) return <p className="py-16 text-center text-muted-foreground">{t.empty}</p>;
  const panel = <FilterPanel basePath={basePath} filters={filters} facets={facets} keep={keep} />;
  const active = filters.tags.length + (filters.price ? 1 : 0) + (filters.inStock ? 1 : 0);
  return (
    <div className="lg:grid lg:grid-cols-[13rem_1fr] lg:gap-8">
      <aside className="hidden lg:block" aria-label={t.filters}>
        {panel}
      </aside>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <FilterSheet active={active} results={products.length}>
                {panel}
              </FilterSheet>
            </div>
            <p className="text-sm text-muted-foreground">{countLabel(products.length)}</p>
          </div>
          {sort && (
            <div className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 text-sm whitespace-nowrap sm:mx-0 sm:px-0">
              <span className="mr-1 text-muted-foreground">{t.sortLabel}:</span>
              {PRODUCT_SORTS.map((s) => (
                <Link
                  key={s}
                  href={filterHref(basePath, filters, {
                    ...keep,
                    sort: s === "featured" ? undefined : s,
                  })}
                  aria-current={s === sort ? "true" : undefined}
                  rel={hasFilters(filters) ? "nofollow" : undefined}
                  scroll={false}
                  className={cn(
                    "rounded-full px-3 py-1 font-semibold transition",
                    s === sort ? "bg-secondary" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t.sorts[s]}
                </Link>
              ))}
            </div>
          )}
        </div>
        <ActiveFilters basePath={basePath} filters={filters} tags={tags} keep={keep} />
        {products.length ? (
          <ProductGrid products={products} priorityCount={4} />
        ) : (
          <p className="py-16 text-center text-muted-foreground">{t.noMatch}</p>
        )}
      </div>
    </div>
  );
}
