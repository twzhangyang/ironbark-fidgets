import { Star } from "lucide-react";

import { fill, messages } from "@/content/messages";
import { cn } from "@/lib/utils";

/** Read-only stars. `value` may be fractional (rounded to the nearest half for display). */
export function Stars({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span
      role="img"
      aria-label={fill(messages.account.reviewsPage.stars, { count: String(value) })}
      className={cn("inline-flex items-center gap-0.5 text-amber-500", className)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block size-4">
          <Star className="absolute inset-0 size-4 text-muted-foreground/40" aria-hidden />
          {rounded >= i - 0.5 && (
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: rounded >= i ? "100%" : "50%" }}
            >
              <Star className="size-4 fill-current" aria-hidden />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
