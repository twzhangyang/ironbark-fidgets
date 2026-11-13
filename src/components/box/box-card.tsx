import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/product/price";
import { ProductBadges } from "@/components/product/product-badges";
import { RatingSummary } from "@/components/review/rating-summary";
import { fill, messages } from "@/content/messages";
import type { BundleSummary } from "@/lib/catalog";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";

const t = messages.box;

export function BoxCard({ summary, priority }: { summary: BundleSummary; priority?: boolean }) {
  const { bundle, stock, savingCents, available } = summary;
  const soldOut = stock === "sold_out";
  const itemCount =
    bundle.type === "fixed" ? bundle.items.reduce((n, i) => n + i.qty, 0) : bundle.pickCount;
  return (
    <Link
      href={`/boxes/${bundle.slug}`}
      className="group flex flex-col gap-3 rounded-3xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted ring-1 ring-border">
        <Image
          src={bundle.images[0]}
          alt={bundle.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={cn(
            "object-cover transition duration-300 group-hover:scale-105",
            soldOut && "opacity-60 grayscale-[40%]",
          )}
        />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {bundle.type === "mystery" && !soldOut && (
            <span className="rounded-full bg-cocoa px-2.5 py-0.5 text-xs font-bold text-cream shadow-sm">
              {t.mysteryBadge}
            </span>
          )}
          <ProductBadges
            badges={bundle.isTest ? ["test"] : []}
            stock={stock}
            lowCount={available}
            saveLabel={
              savingCents > 0
                ? fill(messages.product.save, { amount: formatAud(savingCents, { compact: true }) })
                : undefined
            }
          />
        </div>
      </div>
      <div className="space-y-0.5 px-1">
        <h3 className="leading-snug font-semibold group-hover:underline">{bundle.name}</h3>
        {summary.rating && summary.rating.count >= 3 && (
          <RatingSummary rating={summary.rating} className="text-xs" />
        )}
        <p className="text-xs text-muted-foreground">{fill(t.itemsCount, { count: itemCount })}</p>
        <Price minCents={bundle.priceCents} />
      </div>
    </Link>
  );
}

export function BoxGrid({
  boxes,
  priorityCount = 0,
}: {
  boxes: BundleSummary[];
  priorityCount?: number;
}) {
  return (
    <ul className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {boxes.map((b, i) => (
        <li key={b.bundle.id}>
          <BoxCard summary={b} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
