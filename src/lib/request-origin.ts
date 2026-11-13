import "server-only";

import { headers } from "next/headers";

import { getSiteUrl } from "@/lib/site";

/**
 * The site the visitor is on (a preview, localhost on any port, or the live domain), for return
 * URLs from Stripe and Google. A forged Host header only changes the sender's own redirect.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return getSiteUrl();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}
