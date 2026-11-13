import type { Metadata } from "next";
import { ArrowRight, Gift, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BoxGrid } from "@/components/box/box-card";
import { NotifyForm } from "@/components/forms/notify-form";
import { ProductGrid } from "@/components/product/product-grid";
import { Container } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { fill, messages } from "@/content/messages";
import { getBundles, getNewArrivals, getShopCategories } from "@/lib/catalog";
import { formatAud } from "@/lib/money";
import { organizationJsonLd } from "@/lib/seo";
import { CHRISTMAS_ORDER_BY, FREE_SHIPPING_THRESHOLD_CENTS, SHIPPING_FLAT_CENTS } from "@/lib/site";
import { cn } from "@/lib/utils";

const t = messages.home;

export const metadata: Metadata = { alternates: { canonical: "/" } };
const WHY_ICONS = [Truck, ShieldCheck, Gift];

export default async function HomePage() {
  const [tiles, boxes, arrivals] = await Promise.all([
    getShopCategories(),
    getBundles(),
    getNewArrivals(4),
  ]);
  // Boxes that can be bought; the section and the hero button hide when there are none.
  const shownBoxes = boxes.filter((b) => b.stock !== "sold_out").slice(0, 3);
  const money = {
    threshold: formatAud(FREE_SHIPPING_THRESHOLD_CENTS, { compact: true }),
    flat: formatAud(SHIPPING_FLAT_CENTS),
  };

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      {CHRISTMAS_ORDER_BY && (
        <div className="bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
          {fill(t.christmas, { date: CHRISTMAS_ORDER_BY })}
        </div>
      )}

      {/* Hero */}
      <section className="overflow-hidden bg-gradient-to-b from-butter/70 via-peach/40 to-cream">
        <Container className="grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div className="space-y-5">
            <h1 className="text-5xl leading-[1.05] font-semibold sm:text-6xl">{t.heroTitle}</h1>
            <p className="max-w-md text-lg text-muted-foreground">{t.heroText}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6 text-base")}
              >
                {t.heroCta}
                <ArrowRight className="size-5" aria-hidden />
              </Link>
              {shownBoxes.length > 0 && (
                <Link
                  href="/boxes"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 rounded-full bg-card px-6 text-base",
                  )}
                >
                  {t.heroSecondary}
                </Link>
              )}
            </div>
          </div>
          <div className="relative aspect-[2.1/1] overflow-hidden rounded-[2rem] shadow-xl ring-4 ring-card md:aspect-[4/3]">
            <Image
              src="/hero-fidgets.webp"
              alt="Metal Ferris-wheel spinners in silver and red on a wooden desk"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </Container>
      </section>

      {/* Why us */}
      <Container className="py-8">
        <ul className="grid gap-3 sm:grid-cols-3">
          {t.why.map((item, i) => {
            const Icon = WHY_ICONS[i];
            return (
              <li
                key={item.title}
                className="flex items-start gap-3 rounded-3xl bg-card p-4 ring-1 ring-border"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{fill(item.title, money)}</span>
                  <span className="text-sm text-muted-foreground">{fill(item.text, money)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Container>

      {/* Collections */}
      <Container className="py-8">
        <SectionHeading title={t.collectionsTitle} />
        <ul
          className={cn(
            "grid gap-3 sm:gap-4",
            tiles.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3",
          )}
        >
          {tiles.map((c) => (
            <li key={c.id}>
              <Link href={`/shop/${c.slug}`} className="group block space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted ring-1 ring-border">
                  {c.image && (
                    <Image
                      src={c.image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="text-center font-heading font-semibold group-hover:underline sm:text-lg">
                  {c.name}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {/* Gift boxes */}
      {shownBoxes.length > 0 && (
        <section className="my-8 bg-butter/40 py-12">
          <Container>
            <SectionHeading title={t.boxesTitle} text={t.boxesText} href="/boxes" />
            <BoxGrid boxes={shownBoxes} />
          </Container>
        </section>
      )}

      {/* New and popular */}
      <Container className="py-8">
        <SectionHeading title={t.newTitle} href="/shop" />
        <ProductGrid products={arrivals} />
      </Container>

      {/* Socials + waitlist */}
      <Container className="grid gap-4 py-8 md:grid-cols-2">
        <div className="space-y-3 rounded-[2rem] bg-sky p-8">
          <h2 className="text-2xl font-semibold">{t.socialTitle}</h2>
          <p className="text-muted-foreground">{t.socialText}</p>
          <div className="flex gap-3 pt-1">
            <a
              href={messages.brand.tiktok}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 rounded-full bg-card px-4",
              )}
            >
              TikTok
            </a>
            <a
              href={messages.brand.instagram}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-10 rounded-full bg-card px-4",
              )}
            >
              Instagram
            </a>
          </div>
        </div>
        <div className="space-y-3 rounded-[2rem] bg-cocoa p-8 text-cream">
          <h2 className="text-2xl font-semibold">{t.waitlistTitle}</h2>
          <p className="text-cream/80">{t.waitlistText}</p>
          <NotifyForm inverted className="pt-1 text-foreground" />
        </div>
      </Container>
    </>
  );
}

function SectionHeading({ title, text, href }: { title: string; text?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        {text && <p className="text-muted-foreground">{text}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {t.viewAll} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
