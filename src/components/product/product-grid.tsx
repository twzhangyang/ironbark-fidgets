import { ProductCard } from "@/components/product/product-card";
import type { ProductSummary } from "@/lib/catalog";

export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: ProductSummary[];
  /** Above-the-fold cards whose images load eagerly. */
  priorityCount?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((s, i) => (
        <li key={s.product.id}>
          <ProductCard summary={s} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridFallback({ count = 8 }: { count?: number }) {
  return (
    <ul
      aria-hidden
      className="grid animate-pulse grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="space-y-3">
          <div className="aspect-square rounded-3xl bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}
