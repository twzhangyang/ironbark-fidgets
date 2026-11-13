import { fill, messages } from "@/content/messages";
import type { ProductBadge, StockState } from "@/lib/types";
import { cn } from "@/lib/utils";

const t = messages.product.badges;

const pill = "rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm";

/**
 * Stock state wins over marketing badges: a sold-out item only says "Sold out".
 * `lowCount` shows "Only N left" (single-variant items); without it, "Low stock".
 */
export function ProductBadges({
  badges = [],
  stock,
  lowCount,
  saveLabel,
  className,
}: {
  badges?: ProductBadge[];
  stock: StockState;
  lowCount?: number;
  saveLabel?: string;
  className?: string;
}) {
  // Phase 12: a test product always says so (only ever seen on preview / the laptop).
  const test = badges.includes("test") && (
    <span className={cn(pill, "bg-destructive text-white")}>{t.test}</span>
  );
  if (stock === "sold_out") {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {test}
        <span className={cn(pill, "bg-cocoa text-cream")}>{t.soldOut}</span>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {test}
      {saveLabel && (
        <span className={cn(pill, "bg-primary text-primary-foreground")}>{saveLabel}</span>
      )}
      {badges.includes("new") && <span className={cn(pill, "bg-sky text-cocoa")}>{t.new}</span>}
      {badges.includes("bestseller") && (
        <span className={cn(pill, "bg-butter text-cocoa")}>{t.bestseller}</span>
      )}
      {stock === "low" && (
        <span className={cn(pill, "bg-peach text-cocoa")}>
          {lowCount !== undefined ? fill(t.low, { count: lowCount }) : t.lowShort}
        </span>
      )}
    </div>
  );
}
