/**
 * Phase 12: preview and production share one database, so test products and test orders live
 * next to real ones.
 * - Test products are never shown or sold on production. On preview and the laptop they show
 *   (with a TEST badge) and are the only thing that can be bought, so real stock is never used.
 * - An order paid with Stripe test keys is a test order (`TEST-…`), left out of sales.
 * No `server-only`: scripts use it too. Reads the environment on each call (cheap).
 */
export const isProductionDeployment = () => process.env.VERCEL_ENV === "production";

/** Test products are visible here (preview, laptop). */
export const showTestProducts = () => !isProductionDeployment();

/** Stripe is in test mode: orders placed here are test orders. Unknown key → test (safe). */
export const stripeTestMode = () => !/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");

/** Which products the checkout accepts: "real" on production, "test" elsewhere. */
export type ProductScope = "real" | "test" | "any";
export const checkoutScope = (): ProductScope => (isProductionDeployment() ? "real" : "test");
