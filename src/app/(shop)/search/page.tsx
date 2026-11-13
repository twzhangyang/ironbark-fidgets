import { Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import { ProductGridFallback } from "@/components/product/product-grid";
import { ListingBody, type SearchParams } from "@/components/shop/shop-listing";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { fill, messages } from "@/content/messages";
import { getShopCategories, getTags, searchProducts } from "@/lib/catalog";
import { parseFilters } from "@/lib/catalog-filters";
import { MAX_QUERY } from "@/lib/catalog-search";

const t = messages.search;

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: true },
};

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Container className="py-8 sm:py-12">
      <h1 className="mb-4 text-3xl font-semibold sm:text-4xl">{t.title}</h1>
      {/* The query is request data: read it inside Suspense so the shell stays static. */}
      <Suspense
        fallback={
          <>
            <SearchForm q="" />
            <ProductGridFallback />
          </>
        }
      >
        <Results searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

function SearchForm({ q }: { q: string }) {
  return (
    <Form action="/search" role="search" className="mb-8 flex max-w-xl gap-2">
      <label htmlFor="q" className="sr-only">
        {t.label}
      </label>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t.placeholder}
          maxLength={MAX_QUERY}
          autoFocus={!q}
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 w-full rounded-full border bg-card pr-4 pl-10 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button type="submit" className="h-11 rounded-full px-5">
        {t.button}
      </Button>
    </Form>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = (raw ?? "").trim().slice(0, MAX_QUERY);
  if (!q) {
    return (
      <>
        <SearchForm q="" />
        <p className="mb-4 text-muted-foreground">{t.prompt}</p>
        <CategoryLinks />
      </>
    );
  }
  const tags = await getTags();
  const filters = parseFilters(params, tags);
  const listing = await searchProducts(q, filters);
  if (listing.total === 0) {
    return (
      <>
        <SearchForm q={q} />
        <p className="mb-4 text-muted-foreground">{fill(t.none, { q })}</p>
        <CategoryLinks />
      </>
    );
  }
  return (
    <>
      <SearchForm q={q} />
      <h2 className="mb-4 text-xl font-semibold">{fill(t.resultsFor, { q })}</h2>
      <ListingBody
        basePath="/search"
        listing={listing}
        filters={filters}
        tags={tags}
        keep={{ q }}
      />
    </>
  );
}

async function CategoryLinks() {
  const categories = await getShopCategories();
  return (
    <ul className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={`/shop/${category.slug}`}
            className="inline-block rounded-full border bg-card px-4 py-1.5 text-sm font-semibold hover:bg-muted"
          >
            {category.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
