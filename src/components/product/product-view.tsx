"use client";

import type { Rating } from "@/lib/account/reviews";
import { RatingSummary } from "@/components/review/rating-summary";

import { Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { AddToCart } from "@/components/cart/add-to-cart";
import { NotifyForm } from "@/components/forms/notify-form";
import { Price } from "@/components/product/price";
import { ProductBadges } from "@/components/product/product-badges";
import { ProductGallery } from "@/components/product/product-gallery";
import { fill, messages } from "@/content/messages";
import { stockState } from "@/lib/stock";
import type { Product, ProductBox, Variant } from "@/lib/types";
import { boxesAvailable, boxSaving } from "@/lib/box";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";

const t = messages.product;

/** The design chosen in `?v=`, else the first design in stock, else the first. */
function pickVariant(variants: Variant[], slug: string | null): Variant {
  return variants.find((v) => v.slug === slug) ?? variants.find((v) => v.stock > 0) ?? variants[0];
}

/**
 * Gallery + buy panel. The server reads `?v=` and passes it as `initialSlug`, so the HTML
 * already shows the right design (good for shared links and search engines). Switching designs
 * is then instant and client-side; the URL is kept in sync with `history.replaceState`, which
 * Next.js integrates with its router. Server-rendered details come in as `details`.
 */
export function ProductView({
  product,
  variants,
  initialSlug,
  initialBox = false,
  details,
  rating,
}: {
  product: Product;
  variants: Variant[];
  initialSlug: string | null;
  initialBox?: boolean;
  details: React.ReactNode;
  rating: Rating | null;
}) {
  const [variant, setVariant] = useState(() => pickVariant(variants, initialSlug));
  // Phase 11: buying singles or full boxes (when the product is sold by the box).
  const box = product.box;
  const [byBox, setByBox] = useState(() => !!box && initialBox);
  const boxes = box ? boxesAvailable(variant.stock, box.qty) : 0;

  const state = stockState(byBox ? boxes : variant.stock);
  const soldOut = state === "sold_out";
  const multi = variants.length > 1;
  // One photo list for the whole visit: the first chosen design's photo first (so the page
  // opens on it), then the product photos, then the other designs' photos. Choosing a design
  // slides the carousel to its photo (Phase 10 D4).
  const [images] = useState(() => {
    const first = variant.image ? [variant.image] : [];
    const designs = variants.flatMap((v) => (v.image ? [v.image] : []));
    return [...new Set([...first, ...product.images, ...designs])];
  });
  const selected = variant.image ? Math.max(0, images.indexOf(variant.image)) : 0;

  function choose(v: Variant) {
    setVariant(v);
    const url = new URL(window.location.href);
    url.searchParams.set("v", v.slug);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
      <div className="md:sticky md:top-24 md:self-start">
        <ProductGallery
          images={images}
          selected={selected}
          alt={`${product.name}${multi ? ` – ${variant.name}` : ""}`}
        />
        {/* Only the supplier's photo so far (our own photos come after it). */}
        {product.images.length <= 1 && (
          <p className="mt-2 text-xs text-muted-foreground">{t.placeholderPhotos}</p>
        )}
      </div>
      <div className="space-y-6">
        <div className="space-y-3">
          <ProductBadges
            badges={product.badges}
            stock={state}
            lowCount={byBox ? undefined : variant.stock}
          />
          <h1 className="text-3xl font-semibold sm:text-4xl">{product.name}</h1>
          {rating && <RatingSummary rating={rating} href="#reviews" />}
          <Price
            minCents={byBox && box ? box.priceCents : variant.priceCents}
            compareAtCents={byBox ? null : variant.compareAtCents}
            size="lg"
          />
        </div>

        {box && (
          <BuyChoice
            box={box}
            mixed={product.mixedBox}
            single={variant}
            boxes={boxes}
            byBox={byBox}
            onChange={setByBox}
          />
        )}

        {multi && (
          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-semibold">
              {t.design}: <span className="font-normal">{variant.name}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => {
                const selected = v.id === variant.id;
                const out = v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => choose(v)}
                    aria-pressed={selected}
                    title={out ? `${v.name} (${t.badges.soldOut})` : v.name}
                    className={cn(
                      "relative flex items-center gap-2 rounded-full border bg-card text-sm font-semibold transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      v.image ? "py-1 pr-3 pl-1" : "px-4 py-2",
                      selected ? "border-cocoa ring-2 ring-cocoa" : "hover:bg-muted",
                      out && "text-muted-foreground",
                    )}
                  >
                    {v.image && (
                      <Image
                        src={v.image}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 rounded-full object-cover"
                      />
                    )}
                    <span className={cn(out && "line-through")}>{v.name}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {soldOut ? (
          <div className="space-y-2 rounded-3xl bg-muted p-5">
            <p className="font-heading text-lg font-semibold">{t.soldOutTitle}</p>
            <p className="text-sm text-muted-foreground">{t.notifyText}</p>
            <NotifyForm key={variant.id} variantId={variant.id} />
          </div>
        ) : (
          <div className="space-y-3">
            <AddToCart
              key={`${variant.id}:${byBox}`}
              type={byBox ? "fullbox" : "variant"}
              id={variant.id}
              max={byBox ? boxes : variant.stock}
            />
            <p className="flex items-center gap-2 text-sm text-success">
              <Check className="size-4" aria-hidden />
              {t.inStock}
            </p>
          </div>
        )}

        {details}
      </div>
    </div>
  );
}

/** Buy: Single or Full box of N, each with its own price and stock (Phase 11). */
function BuyChoice({
  box,
  mixed,
  single,
  boxes,
  byBox,
  onChange,
}: {
  box: ProductBox;
  mixed: boolean;
  single: Variant;
  boxes: number;
  byBox: boolean;
  onChange: (byBox: boolean) => void;
}) {
  const saving = boxSaving(single.priceCents, box);
  const options = [
    {
      value: false,
      label: t.buy.single,
      price: single.priceCents,
      note: single.stock <= 0 ? t.badges.soldOut : null,
    },
    {
      value: true,
      label: fill(t.buy.box, { count: box.qty }),
      price: box.priceCents,
      note:
        boxes <= 0
          ? t.badges.soldOut
          : boxes === 1
            ? t.buy.boxLeft
            : boxes <= 3
              ? fill(t.buy.boxesLeft, { count: boxes })
              : null,
    },
  ];
  const hint = byBox
    ? fill(mixed ? t.buy.boxHintMixed : t.buy.boxHint, { count: box.qty })
    : mixed
      ? t.buy.singleRandom
      : null;
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold">{t.buy.label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={byBox === o.value}
            className={cn(
              "flex flex-col items-start rounded-2xl border bg-card px-4 py-3 text-left transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              byBox === o.value ? "border-cocoa ring-2 ring-cocoa" : "hover:bg-muted",
              o.note === t.badges.soldOut && "text-muted-foreground",
            )}
          >
            <span className="font-semibold">{o.label}</span>
            <span className="text-sm">{formatAud(o.price)}</span>
            {o.value && saving > 0 && (
              <span className="text-xs font-semibold text-primary">
                {fill(t.save, { amount: formatAud(saving) })}
              </span>
            )}
            {o.note && <span className="text-xs text-muted-foreground">{o.note}</span>}
          </button>
        ))}
      </div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}
