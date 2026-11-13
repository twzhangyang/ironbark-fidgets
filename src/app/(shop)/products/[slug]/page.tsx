import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BoxGrid } from "@/components/box/box-card";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductView } from "@/components/product/product-view";
import { SafetyBlock } from "@/components/product/safety-block";
import { ShippingNote } from "@/components/product/shipping-note";
import { ProductVideo } from "@/components/product/product-video";
import { ReviewsSection } from "@/components/review/reviews-section";
import { Breadcrumbs } from "@/components/shop/breadcrumbs";
import { Container } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { messages } from "@/content/messages";
import {
  getBundlesContaining,
  getCollections,
  getProductBySlug,
  getProducts,
  getRelatedProducts,
} from "@/lib/catalog";
import { metaDescription, productJsonLd } from "@/lib/seo";

const t = messages.product;

export async function generateStaticParams() {
  const params = (await getProducts()).map((s) => ({ slug: s.product.slug }));
  // Cache Components refuses an empty list (e.g. every box hidden): build one placeholder
  // page instead, which renders "not found" like any unknown slug.
  return params.length ? params : [{ slug: "__none__" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const summary = await getProductBySlug((await params).slug);
  if (!summary) return {};
  const { product } = summary;
  return {
    title: product.name,
    description: metaDescription(product.description),
    openGraph: { images: [{ url: product.images[0] }] },
    // `?v=` (design) and `?buy=box` versions all point back here.
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/products/[slug]">) {
  const summary = await getProductBySlug((await params).slug);
  if (!summary) notFound();
  const { product, variants } = summary;
  const [related, boxes, collections] = await Promise.all([
    getRelatedProducts(product),
    getBundlesContaining(product.id),
    getCollections(),
  ]);
  // One level only: customers never see the grouping category above it (e.g. Food).
  const collection = collections.find((c) => c.id === product.collectionId);

  const details = (
    <>
      <p className="leading-relaxed">{product.description}</p>
      <ShippingNote />
      <SafetyBlock
        ageMin={product.ageMin}
        material={product.material}
        sizeLabel={product.sizeLabel}
      />
    </>
  );

  return (
    <Container className="py-8 sm:py-12">
      <JsonLd data={productJsonLd(summary)} />
      <Breadcrumbs
        items={[
          { name: messages.nav.shop, href: "/shop" },
          ...(collection ? [{ name: collection.name, href: `/shop/${collection.slug}` }] : []),
          { name: product.name, href: `/products/${product.slug}` },
        ]}
      />
      {/* ?v= is request data: read it on the server inside Suspense, so the shell stays
          prerendered and the streamed HTML already shows the chosen design. */}
      <Suspense fallback={<ProductViewFallback />}>
        <SelectedProduct searchParams={searchParams}>
          {(initialSlug, initialBox) => (
            <ProductView
              product={product}
              variants={variants}
              initialSlug={initialSlug}
              initialBox={initialBox}
              details={details}
              rating={summary.rating}
            />
          )}
        </SelectedProduct>
      </Suspense>

      {product.video && <ProductVideo video={product.video} name={product.name} />}

      <ReviewsSection
        target={{ type: "product", id: product.id }}
        rating={summary.rating}
        item={product.name}
      />

      {boxes.length > 0 && (
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-semibold">{t.inBoxes}</h2>
          <BoxGrid boxes={boxes} />
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-semibold">{t.related}</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </Container>
  );
}

async function SelectedProduct({
  searchParams,
  children,
}: {
  searchParams: PageProps<"/products/[slug]">["searchParams"];
  children: (initialSlug: string | null, initialBox: boolean) => React.ReactNode;
}) {
  const { v, buy } = await searchParams;
  // `?buy=box` opens on the full box (Phase 11), e.g. from ads and social posts.
  return children(typeof v === "string" ? v : null, buy === "box");
}

function ProductViewFallback() {
  return (
    <div aria-hidden className="grid animate-pulse gap-8 md:grid-cols-2 lg:gap-12">
      <div className="aspect-square rounded-3xl bg-muted" />
      <div className="space-y-4">
        <div className="h-6 w-24 rounded-full bg-muted" />
        <div className="h-10 w-2/3 rounded bg-muted" />
        <div className="h-8 w-1/4 rounded bg-muted" />
        <div className="h-11 rounded-full bg-muted" />
        <div className="h-40 rounded-3xl bg-muted" />
      </div>
    </div>
  );
}
