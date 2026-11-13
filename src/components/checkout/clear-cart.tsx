"use client";

import { useEffect } from "react";

import { cart } from "@/components/cart/cart-store";

/** Empties the browser cart once the order is paid. */
export function ClearCart() {
  useEffect(() => cart.clear(), []);
  return null;
}
