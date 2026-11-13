import { fill, messages } from "@/content/messages";
import { formatAud } from "@/lib/money";
import { cn } from "@/lib/utils";

const t = messages.product;

/** "$12.95", "From $7.95", or a sale price with the old one struck through. */
export function Price({
  minCents,
  maxCents = minCents,
  compareAtCents = null,
  className,
  size = "md",
}: {
  minCents: number;
  maxCents?: number;
  compareAtCents?: number | null;
  className?: string;
  size?: "md" | "lg";
}) {
  const label =
    minCents === maxCents ? formatAud(minCents) : fill(t.from, { price: formatAud(minCents) });
  const onSale = compareAtCents !== null && compareAtCents > minCents;
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn(
          "font-bold",
          size === "lg" ? "text-2xl" : "text-base",
          onSale && "text-primary",
        )}
      >
        {label}
      </span>
      {onSale && (
        <span className="text-sm text-muted-foreground line-through">
          <span className="sr-only">{fill(t.was, { price: "" })}</span>
          {formatAud(compareAtCents)}
        </span>
      )}
    </p>
  );
}
