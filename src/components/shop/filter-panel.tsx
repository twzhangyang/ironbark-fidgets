import { Check, X } from "lucide-react";
import Link from "next/link";

import { fill, messages } from "@/content/messages";
import {
  type Facets,
  filterHref,
  hasFilters,
  NO_FILTERS,
  type ShopFilters,
  toggleTag,
} from "@/lib/catalog-filters";
import type { Tag } from "@/lib/types";
import { cn } from "@/lib/utils";

const t = messages.shop;

type Props = {
  basePath: string;
  filters: ShopFilters;
  facets: Facets;
  /** Params kept on every link (sort, search query). */
  keep: Record<string, string | undefined>;
};

/**
 * Filter options as plain links (Phase 8 D4): they work without JavaScript, and `nofollow`
 * keeps Google off the endless combinations (the page's canonical is the unfiltered one).
 */
export function FilterPanel({ basePath, filters, facets, keep }: Props) {
  const href = (f: ShopFilters) => filterHref(basePath, f, keep);
  return (
    <div className="space-y-6">
      {facets.groups.map((g) => (
        <FilterGroup key={g.name} title={g.name}>
          {g.tags.map((tag) => (
            <Option
              key={tag.slug}
              href={href(toggleTag(filters, tag.slug))}
              on={filters.tags.includes(tag.slug)}
              label={tag.name}
              count={tag.count}
            />
          ))}
        </FilterGroup>
      ))}
      {facets.prices.length > 0 && (
        <FilterGroup title={t.priceTitle}>
          {facets.prices.map((b) => {
            const on = filters.price === b.slug;
            return (
              <Option
                key={b.slug}
                href={href({ ...filters, price: on ? null : b.slug })}
                on={on}
                label={t.prices[b.slug]}
                count={b.count}
              />
            );
          })}
        </FilterGroup>
      )}
      <FilterGroup title={t.availability}>
        <Option
          href={href({ ...filters, inStock: !filters.inStock })}
          on={filters.inStock}
          label={t.inStock}
          count={facets.inStock}
        />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

function Option({
  href,
  on,
  label,
  count,
}: {
  href: string;
  on: boolean;
  label: string;
  count: number;
}) {
  return (
    <li>
      <Link
        href={href}
        rel="nofollow"
        scroll={false}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
      >
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded border",
            on ? "border-cocoa bg-cocoa text-cream" : "bg-card",
          )}
          aria-hidden
        >
          {on && <Check className="size-3" />}
        </span>
        <span className="flex-1">
          {label}
          {on && <span className="sr-only"> {t.selected}</span>}
        </span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </Link>
    </li>
  );
}

/** Chosen filters as chips with ✕, plus "Clear all". */
export function ActiveFilters({
  basePath,
  filters,
  tags,
  keep,
}: {
  basePath: string;
  filters: ShopFilters;
  tags: readonly Tag[];
  keep: Record<string, string | undefined>;
}) {
  if (!hasFilters(filters)) return null;
  const href = (f: ShopFilters) => filterHref(basePath, f, keep);
  const chips = [
    ...filters.tags.map((slug) => ({
      name: tags.find((x) => x.slug === slug)?.name ?? slug,
      href: href(toggleTag(filters, slug)),
    })),
    ...(filters.price
      ? [{ name: t.prices[filters.price], href: href({ ...filters, price: null }) }]
      : []),
    ...(filters.inStock ? [{ name: t.inStock, href: href({ ...filters, inStock: false }) }] : []),
  ];
  return (
    <ul className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            rel="nofollow"
            scroll={false}
            aria-label={fill(t.remove, { name: c.name })}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-semibold hover:bg-muted"
          >
            {c.name}
            <X className="size-3.5" aria-hidden />
          </Link>
        </li>
      ))}
      <li>
        <Link
          href={href(NO_FILTERS)}
          rel="nofollow"
          scroll={false}
          className="px-2 text-sm font-semibold text-primary hover:underline"
        >
          {t.clearAll}
        </Link>
      </li>
    </ul>
  );
}
