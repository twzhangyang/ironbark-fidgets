import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/product/price";
import { ProductBadges } from "@/components/product/product-badges";
import { RatingSummary } from "@/components/review/rating-summary";
import { fill, messages } from "@/content/messages";
import type { ProductSummary } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ProductCard({
  summary,
  priority,
}: {
  summary: ProductSummary;
  priority?: boolean;
}) {
  const { product, variants, stock } = summary;
  const soldOut = stock === "sold_out";
  const single = variants.length === 1 ? variants[0] : null;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col gap-3 rounded-3xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted ring-1 ring-border">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className={cn(
            "object-cover transition duration-300 group-hover:scale-105",
            soldOut && "opacity-60 grayscale-[40%]",
          )}
        />
        <ProductBadges
          badges={product.badges}
          stock={stock}
          lowCount={single?.stock}
          className="absolute top-2 left-2"
        />
      </div>
      <div className="space-y-0.5 px-1">
        <h3 className="leading-snug font-semibold group-hover:underline">{product.name}</h3>
        {summary.rating && summary.rating.count >= 3 && (
          <RatingSummary rating={summary.rating} className="text-xs" />
        )}
        {(variants.length > 1 || product.box) && (
          <p className="text-xs text-muted-foreground">
            {[
              variants.length > 1 && fill(messages.product.designs, { count: variants.length }),
              product.box && fill(messages.product.buy.boxLabel, { count: product.box.qty }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <Price
          minCents={summary.minPriceCents}
          maxCents={summary.maxPriceCents}
          compareAtCents={summary.compareAtCents}
        />
      </div>
    </Link>
  );
}
