"use client";

import { useState } from "react";

import { cart } from "@/components/cart/cart-store";
import { Button } from "@/components/ui/button";
import { messages } from "@/content/messages";
import type { CartLine } from "@/lib/checkout/cart";

/** Adds the same items to the cart; the drawer then shows today's prices and stock. */
export function BuyAgain({ lines }: { lines: CartLine[] }) {
  const [done, setDone] = useState(false);
  const t = messages.account.order;
  if (lines.length === 0) return <p className="text-sm text-muted-foreground">{t.buyAgainNone}</p>;
  return (
    <Button
      type="button"
      size="lg"
      className="h-11 rounded-full px-6"
      onClick={() => {
        for (const line of lines) cart.add(line);
        setDone(true);
      }}
    >
      {done ? t.buyAgainDone : t.buyAgain}
    </Button>
  );
}
