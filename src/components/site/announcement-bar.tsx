import { fill, messages } from "@/content/messages";
import { formatAud } from "@/lib/money";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/site";

export function AnnouncementBar() {
  return (
    <div className="bg-cocoa px-4 py-2 text-center text-xs font-semibold text-cream sm:text-sm">
      {fill(messages.announcement, {
        threshold: formatAud(FREE_SHIPPING_THRESHOLD_CENTS, { compact: true }),
      })}
    </div>
  );
}
