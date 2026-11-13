/**
 * /llms.txt: a plain-text summary of the shop for AI assistants (llmstxt.org format).
 * Built from the same content as the site, so it stays in step with prices and pages.
 */
import { guides } from "@/content/guides";
import { messages } from "@/content/messages";
import { getShopCategories } from "@/lib/catalog";
import { formatAud } from "@/lib/money";
import {
  EXPRESS_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  getSiteUrl,
  SHIPPING_FLAT_CENTS,
} from "@/lib/site";

export async function GET() {
  const base = getSiteUrl();
  const b = messages.brand;
  const categories = await getShopCategories();
  const link = (path: string, label: string, note?: string) =>
    `- [${label}](${base}${path})${note ? `: ${note}` : ""}`;
  const text = [
    `# ${b.name}`,
    "",
    `> ${b.name} is an Australian online shop for machined metal fidgets (EDC fidget toys): spinners, magnetic sliders, haptic coins, rings and gear fidgets in aluminium, zinc alloy, brass and steel. Ships Australia-wide from Melbourne with Australia Post.`,
    "",
    `- Shipping: flat ${formatAud(SHIPPING_FLAT_CENTS)} per order, free over ${formatAud(FREE_SHIPPING_THRESHOLD_CENTS, { compact: true })}, Express Post ${formatAud(EXPRESS_SHIPPING_CENTS)}. Packed within 1 business day. Australia only.`,
    "- Prices in AUD, including GST. Card payment through Stripe. Guest checkout.",
    "- Ages 14+. Small parts; some pieces have magnets fixed inside. Material listed on every product page.",
    "- Most products come in several colours; the customer picks one.",
    "- Returns: faulty, damaged or wrong items within 30 days; change of mind within 14 days (unused, customer pays return postage).",
    `- Contact: ${b.email}. ${b.legal}`,
    "",
    "## Shop",
    "",
    link("/shop", "All fidgets"),
    ...categories.map((c) => link(`/shop/${c.slug}`, c.name, c.description || undefined)),
    link("/boxes", "Kits"),
    "",
    "## Help",
    "",
    link("/faq", "Questions & answers", "materials, safety, colours, shipping, returns"),
    link("/shipping-returns", "Shipping & returns"),
    link("/safety", "Safety & care"),
    link("/about", "About us"),
    link("/contact", "Contact"),
    "",
    "## Guides",
    "",
    ...guides.map((g) => link(`/guides/${g.slug}`, g.title, g.description)),
    "",
    "## Optional",
    "",
    link("/sitemap.xml", "Sitemap", "every product page"),
    link("/terms", "Terms of sale"),
    link("/privacy", "Privacy policy"),
    "",
  ].join("\n");
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
