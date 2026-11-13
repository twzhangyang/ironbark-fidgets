import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ShopListing } from "@/components/shop/shop-listing";
import { getCollections, getShopCategories } from "@/lib/catalog";

export async function generateStaticParams() {
  const params = (await getShopCategories()).map((c) => ({ collection: c.slug }));
  // Cache Components refuses an empty list (e.g. every box hidden): build one placeholder
  // page instead, which renders "not found" like any unknown slug.
  return params.length ? params : [{ collection: "__none__" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[collection]">): Promise<Metadata> {
  const collection = await shopCategory((await params).collection);
  return collection
    ? {
        title: collection.name,
        description: collection.description,
        // Filtered and sorted versions all point back here (Phase 8 D4).
        alternates: { canonical: `/shop/${collection.slug}` },
      }
    : {};
}

export default async function CollectionPage({
  params,
  searchParams,
}: PageProps<"/shop/[collection]">) {
  const { collection: slug } = await params;
  const collection = await shopCategory(slug);
  if (!collection) {
    // A grouping category (e.g. Food) has no shop page: send old links to the whole shop.
    if ((await getCollections()).some((c) => c.slug === slug)) permanentRedirect("/shop");
    notFound();
  }
  return (
    <ShopListing
      title={collection.name}
      description={collection.description}
      collection={collection}
      searchParams={searchParams}
    />
  );
}

async function shopCategory(slug: string) {
  return (await getShopCategories()).find((c) => c.slug === slug) ?? null;
}
