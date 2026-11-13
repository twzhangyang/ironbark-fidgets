"use client";

import { ShoppingBag } from "lucide-react";
import { useState } from "react";

import { cart } from "@/components/cart/cart-store";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { Button } from "@/components/ui/button";
import { messages } from "@/content/messages";
import type { CartLineType } from "@/lib/checkout/cart";
import { MAX_QTY_PER_LINE } from "@/lib/site";

const t = messages.product;

/** Quantity + "Add to cart". Adds the line and opens the cart drawer. */
export function AddToCart({ type, id, max }: { type: CartLineType; id: string; max: number }) {
  const limit = Math.max(1, Math.min(max, MAX_QTY_PER_LINE));
  const [quantity, setQuantity] = useState(1);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <QuantityStepper value={Math.min(quantity, limit)} max={limit} onChange={setQuantity} />
      <Button
        type="button"
        size="lg"
        className="h-11 flex-1 rounded-full px-6 text-base"
        onClick={() => {
          cart.add({ type, id, qty: Math.min(quantity, limit) }, limit);
          setQuantity(1);
        }}
      >
        <ShoppingBag className="size-5" aria-hidden />
        {t.addToCart}
      </Button>
    </div>
  );
}
