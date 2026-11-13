import { Truck } from "lucide-react";
import Link from "next/link";

import { fill, messages } from "@/content/messages";
import { formatAud } from "@/lib/money";
import {
  EXPRESS_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
} from "@/lib/site";

export function ShippingNote() {
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <Truck className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {fill(messages.product.shipping, {
          flat: formatAud(SHIPPING_FLAT_CENTS),
          threshold: formatAud(FREE_SHIPPING_THRESHOLD_CENTS, { compact: true }),
          express: formatAud(EXPRESS_SHIPPING_CENTS),
        })}{" "}
        <Link href="/shipping-returns" className="font-semibold text-foreground hover:underline">
          {messages.footer.links.shipping}
        </Link>
      </span>
    </p>
  );
}
