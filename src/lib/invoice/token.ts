/**
 * Signed invoice links: `/api/invoice/<order id>?t=<HMAC>`. Guests have no account, so the link in
 * the order email has to work on its own; the signature stops anyone guessing other orders.
 * Reuses UNSUBSCRIBE_SECRET with its own "invoice:" prefix, so the two tokens can't be swapped.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const sign = (orderId: string, secret: string) =>
  createHmac("sha256", secret).update(`invoice:${orderId}`).digest("base64url");

export function createInvoiceToken(orderId: string, secret: string): string {
  return sign(orderId, secret);
}

export function verifyInvoiceToken(orderId: string, token: string, secret: string): boolean {
  const expected = Buffer.from(sign(orderId, secret));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s || s.length < 32) throw new Error("UNSUBSCRIBE_SECRET missing. See .env.example.");
  return s;
}

/** Path (no host) of an order's invoice PDF, signed. */
export function invoicePath(orderId: string): string {
  return `/api/invoice/${orderId}?t=${createInvoiceToken(orderId, secret())}`;
}

export function checkInvoiceToken(orderId: string, token: string | null): boolean {
  return !!token && verifyInvoiceToken(orderId, token, secret());
}
