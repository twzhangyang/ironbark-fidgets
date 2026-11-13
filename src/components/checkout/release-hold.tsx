"use client";

import { useEffect } from "react";

import { cancelCheckout } from "@/actions/checkout";

/** "Back" from Stripe: puts the held stock back straight away (runs once, after load). */
export function ReleaseHold({ orderId }: { orderId: string }) {
  useEffect(() => {
    void cancelCheckout(orderId);
  }, [orderId]);
  return null;
}
