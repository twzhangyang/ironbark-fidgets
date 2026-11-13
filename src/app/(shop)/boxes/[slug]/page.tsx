import { ArrowLeft, Check, Gift } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BoxGrid } from "@/components/box/box-card";
import { AddToCart } from "@/components/cart/add-to-cart";
import { NotifyForm } from "@/components/forms/notify-form";
import { Price } from "@/components/product/price";
import { ProductBadges } from "@/components/product/product-badges";
import { ProductGallery } from "@/components/product/product-gallery";
import { SafetyBlock } from "@/components/product/safety-block";
import { ShippingNote } from "@/components/product/shipping-note";
import { RatingSummary } from "@/components/review/rating-summary";
import { ReviewsSection } from "@/components/review/reviews-section";
import { Container } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { fill, messages } from "@/content/messages";
import { getBundleBySlug, getBundles } from "@/lib/catalog";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";
import { boxJsonLd, metaDescription } from "@/lib/seo";

const t = messages.box;

export async function generateStaticParams() {
  const params = (await getBundles()).map((b) => ({ slug: b.bundle.slug }));
  // Cache Components refuses an empty list (e.g. every box hidden): build one placeholder
  // page instead, which renders "not found" like any unknown slug.
  return params.length ? params : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/boxes/[slug]">): Promise<Metadata> {
  const summary = await getBundleBySlug((await params).slug);
  if (!summary) return {};
  const { bundle } = summary;
  return {
    title: bundle.name,
    description: metaDescription(bundle.description),
    openGraph: { images: [{ url: bundle.images[0] }] },
    alternates: { canonical: `/boxes/${bundle.slug}` },
  };
}

export default async function BoxPage({ params }: PageProps<"/boxes/[slug]">) {
  const summary = await getBundleBySlug((await params).slug);
  if (!summary) notFound();
  const { bundle, contents, stock, available, savingCents } = summary;
  const soldOut = stock === "sold_out";
  const mystery = bundle.type === "mystery";
  const others = (await getBundles()).filter(
    (b) => b.bundle.id !== bundle.id && b.stock !== "sold_out",
  );
  // A box is as old as its youngest buyer: use the highest age across its contents.
  const ageMin = Math.max(8, ...contents.map((c) => c.product.ageMin));
  const materials = [...new Set(contents.map((c) => c.product.material))].join("; ");

  return (
    <Container className="py-8 sm:py-12">
      <JsonLd data={boxJsonLd(summary)} />
      <Link
        href="/boxes"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t.back}
      </Link>
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <div className="md:sticky md:top-24 md:self-start">
          <ProductGallery images={bundle.images} alt={bundle.name} />
          <p className="mt-2 text-xs text-muted-foreground">{messages.product.placeholderPhotos}</p>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {mystery && !soldOut && (
                <span className="rounded-full bg-cocoa px-2.5 py-0.5 text-xs font-bold text-cream">
                  {t.mysteryBadge}
                </span>
              )}
              <ProductBadges
                badges={bundle.isTest ? ["test"] : []}
                stock={stock}
                lowCount={available}
              />
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{bundle.name}</h1>
            {summary.rating && <RatingSummary rating={summary.rating} href="#reviews" />}
            <Price minCents={bundle.priceCents} size="lg" />
            {savingCents > 0 && !soldOut && (
              <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-bold">
                <Gift className="size-4" aria-hidden />
                {fill(t.saveVsSingles, { amount: formatAud(savingCents) })}
              </p>
            )}
          </div>
          <p className="leading-relaxed">{bundle.description}</p>

          {soldOut ? (
            <div className="space-y-2 rounded-3xl bg-muted p-5">
              <p className="font-heading text-lg font-semibold">{messages.product.soldOutTitle}</p>
              <p className="text-sm text-muted-foreground">{t.soldOutBecause}</p>
              <NotifyForm bundleId={bundle.id} />
            </div>
          ) : (
            <div className="space-y-3">
              <AddToCart type="box" id={bundle.id} max={available} />
              <p className="flex items-center gap-2 text-sm text-success">
                <Check className="size-4" aria-hidden />
                {messages.product.inStock}
              </p>
            </div>
          )}

          <section aria-labelledby="contents-title" className="space-y-3">
            <h2 id="contents-title" className="text-lg font-semibold">
              {mystery ? t.possible : t.contents}
            </h2>
            {mystery && (
              <p className="text-sm text-muted-foreground">
                {fill(t.mysteryNote, { count: bundle.pickCount })}
              </p>
            )}
            <ul className={cn("grid gap-2", mystery ? "grid-cols-2 sm:grid-cols-4" : "")}>
              {contents.map(({ product, variant, qty }) => {
                const out = variant.stock < qty;
                const label =
                  variant.name === "Default" ? product.name : `${product.name} – ${variant.name}`;
                return (
                  <li key={variant.id}>
                    <Link
                      href={`/products/${product.slug}${variant.slug === "default" ? "" : `?v=${variant.slug}`}`}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-card p-2 transition hover:bg-muted",
                        mystery && "flex-col text-center",
                      )}
                    >
                      {variant.image || variant.slug === "default" ? (
                        <Image
                          src={variant.image ?? product.images[0]}
                          alt=""
                          width={56}
                          height={56}
                          className="size-14 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        // No photo of this exact design yet: an initial beats a repeated group shot.
                        <span
                          aria-hidden
                          className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-peach font-heading text-xl font-semibold"
                        >
                          {variant.name.charAt(0)}
                        </span>
                      )}
                      <span className="flex-1 text-sm">
                        <span className="font-semibold">{mystery ? variant.name : label}</span>
                        {!mystery && qty > 1 && (
                          <span className="text-muted-foreground"> × {qty}</span>
                        )}
                        {out && (
                          <span className="block text-xs font-bold text-primary">
                            {messages.product.badges.soldOut}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <ShippingNote />
          <SafetyBlock ageMin={ageMin} material={materials} />
        </div>
      </div>

      <ReviewsSection
        target={{ type: "box", id: bundle.id }}
        rating={summary.rating}
        item={bundle.name}
      />

      {others.length > 0 && (
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-semibold">{messages.home.boxesTitle}</h2>
          <BoxGrid boxes={others.slice(0, 3)} />
        </section>
      )}
    </Container>
  );
}
