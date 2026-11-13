/** Store-wide settings. Phase 2+ may move these to the database / env. */

/** Flat shipping per order, AUD cents (Open Questions Q5). */
export const SHIPPING_FLAT_CENTS = 995;
/** Orders at or over this subtotal ship free, AUD cents (Open Questions Q5). */
export const FREE_SHIPPING_THRESHOLD_CENTS = 9900;
/**
 * Express Post, AUD cents, any order size (free shipping covers standard only). Offered in
 * Stripe Checkout next to standard. Check it covers the Express Post satchel cost.
 */
export const EXPRESS_SHIPPING_CENTS = 1495;

/**
 * "Order by" date for Christmas delivery, e.g. "Thu 18 Dec". Null hides the banner.
 * Set it from Australia Post's published Christmas cut-offs, never a guess.
 * 2026 (auspost.com.au/christmas, from Vic metro): Parcel Post to WA Fri 18 Dec, other states Mon 21 Dec,
 * NT Wed 16 Dec. Thu 17 Dec leaves a day to pack and still makes the WA cut-off.
 */
export const CHRISTMAS_ORDER_BY: string | null = null;

/**
 * False until launch (Phase 6): every page is sent with `X-Robots-Tag: noindex` and there's
 * no sitemap, so search engines leave the site out while it has placeholder photos and prices.
 */
export const LAUNCHED = false;

/**
 * GST switch (Open Questions Q3). When true, Stripe shows an inclusive 10% GST line on
 * every item and the shipping. Prices are GST-inclusive either way.
 */
export const GST_REGISTERED = true;

/** Checkout limits (stop one cart holding the whole shelf). */
export const MAX_QTY_PER_LINE = 10;
export const MAX_ITEMS_PER_ORDER = 30;

/** Unpaid checkouts hold stock this long; Stripe's session expires a little earlier. */
export const HOLD_MINUTES = 35;
export const STRIPE_SESSION_MINUTES = 31;

/**
 * Canonical site URL (metadata, sitemap). Previews use their own URL so links, and Stripe's
 * return URLs, come back to the same deployment.
 */
export function getSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const preview = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  if (preview) return `https://${preview}`;
  return "http://localhost:3000";
}
