import { Stars } from "@/components/review/stars";
import { fill, messages } from "@/content/messages";
import type { Rating } from "@/lib/account/reviews";
import { cn } from "@/lib/utils";

const t = messages.reviews;

export const countLabel = (count: number) => (count === 1 ? t.one : fill(t.count, { count }));

/** "★★★★☆ 4.5 (12 reviews)". Links to the reviews section when `href` is given. */
export function RatingSummary({
  rating,
  href,
  className,
}: {
  rating: Rating;
  href?: string;
  className?: string;
}) {
  const inner = (
    <>
      <Stars value={rating.avg} />
      <span className="font-semibold">{rating.avg.toFixed(1)}</span>
      <span className="text-muted-foreground">({countLabel(rating.count)})</span>
    </>
  );
  const cls = cn("inline-flex items-center gap-1.5 text-sm", className);
  return href ? (
    <a href={href} className={cn(cls, "hover:underline")}>
      {inner}
    </a>
  ) : (
    <span className={cls}>{inner}</span>
  );
}
