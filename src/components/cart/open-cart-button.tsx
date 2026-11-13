"use client";

import { cart } from "@/components/cart/cart-store";
import { Button } from "@/components/ui/button";
import { messages } from "@/content/messages";

export function OpenCartButton() {
  return (
    <Button size="lg" className="rounded-full" onClick={cart.open}>
      {messages.checkout.backToCart}
    </Button>
  );
}
