"use server";

import { type CartDetails, getCartDetails } from "@/lib/checkout/cart-details";

/** Fresh cart details for the drawer (never from the page cache). */
export async function getCart(lines: unknown): Promise<CartDetails> {
  return getCartDetails(lines);
}
