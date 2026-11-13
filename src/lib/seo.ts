/**
 * Structured data (JSON-LD) for Google (Phase 6 T2): products, boxes and the shop itself.
 * Built from the same catalogue the page shows, so prices and stock never disagree.
 */
import { messages } from "@/content/messages";
import type { BundleSummary, ProductSummary } from "@/lib/catalog";
import { getSiteUrl, SHIPPING_FLAT_CENTS } from "@/lib/site";
import type { StockState } from "@/lib/types";

type Json = Record<string, unknown>;

const CONTEXT = "https://schema.org";

/** Change-of-mind window on the Shipping & returns page (owner decision, Phase 6 D3). */
export const RETURN_DAYS = 14;

/**
 * Search-result snippet from a product description: the first paragraph (the care and
 * "random design" lines follow it), cut at a word to fit Google's ~160 characters.
 */
export function metaDescription(text: string, max = 160): string {
  const first = text
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, " ")
    .trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "")}…`;
}

function site(): string {
  return getSiteUrl().replace(/\/$/, "");
}

function absolute(url: string): string {
  return url.startsWith("/") ? `${site()}${url}` : url;
}

function price(cents: number): string {
  return (cents / 100).toFixed(2);
}

function availability(stock: StockState): string {
  return stock === "sold_out" ? `${CONTEXT}/OutOfStock` : `${CONTEXT}/InStock`;
}

function seller(): Json {
  return { "@type": "Organization", name: messages.brand.name };
}

/** Our own label: the supplier makes the range under the Ironbark Fidgets brand (owner, 2026-11-13). */
function brand(): Json {
  return { "@type": "Brand", name: messages.brand.name };
}

function shippingDetails(): Json {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: price(SHIPPING_FLAT_CENTS), currency: "AUD" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "AU" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 6, unitCode: "DAY" },
    },
  };
}

function returnPolicy(changeOfMind: boolean): Json {
  return changeOfMind
    ? {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "AU",
        returnPolicyCategory: `${CONTEXT}/MerchantReturnFiniteReturnWindow`,
        merchantReturnDays: RETURN_DAYS,
        returnMethod: `${CONTEXT}/ReturnByMail`,
        // Change-of-mind return postage is paid by the customer (Shipping & returns page).
        returnFees: `${CONTEXT}/ReturnFeesCustomerResponsibility`,
      }
    : // Blind boxes: no change-of-mind returns (faulty items are still covered by law).
      {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "AU",
        returnPolicyCategory: `${CONTEXT}/MerchantReturnNotPermitted`,
      };
}

function rating(r: { avg: number; count: number } | null): Json | undefined {
  return r && r.count > 0
    ? { "@type": "AggregateRating", ratingValue: r.avg, reviewCount: r.count, bestRating: 5 }
    : undefined;
}

/** `Product` with one `Offer`, or an `AggregateOffer` when designs have different prices. */
export function productJsonLd(s: ProductSummary): Json {
  const { product, variants } = s;
  const url = `${site()}/products/${product.slug}`;
  const common = {
    priceCurrency: "AUD",
    availability: availability(s.stock),
    url,
    seller: seller(),
    shippingDetails: shippingDetails(),
    hasMerchantReturnPolicy: returnPolicy(true),
  };
  const offers =
    variants.length === 1 || s.minPriceCents === s.maxPriceCents
      ? {
          "@type": "Offer",
          price: price(s.minPriceCents),
          ...(variants.length === 1 && { sku: variants[0].sku }),
          ...common,
        }
      : {
          "@type": "AggregateOffer",
          lowPrice: price(s.minPriceCents),
          highPrice: price(s.maxPriceCents),
          offerCount: variants.length,
          ...common,
        };
  return {
    "@context": CONTEXT,
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map(absolute),
    url,
    brand: brand(),
    material: product.material || undefined,
    category: s.collection.name,
    offers,
    aggregateRating: rating(s.rating),
  };
}

export function boxJsonLd(s: BundleSummary): Json {
  const { bundle } = s;
  const url = `${site()}/boxes/${bundle.slug}`;
  return {
    "@context": CONTEXT,
    "@type": "Product",
    name: bundle.name,
    description: bundle.description,
    image: bundle.images.map(absolute),
    url,
    brand: brand(),
    offers: {
      "@type": "Offer",
      price: price(bundle.priceCents),
      priceCurrency: "AUD",
      availability: availability(s.stock),
      url,
      seller: seller(),
      shippingDetails: shippingDetails(),
      hasMerchantReturnPolicy: returnPolicy(bundle.type !== "mystery"),
    },
    aggregateRating: rating(s.rating),
  };
}

/** Questions & answers page: every question with its answer, as on the page. */
export function faqJsonLd(items: { q: string; a: string }[]): Json {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

/** Guide pages: an article by the shop. */
export function guideJsonLd(g: {
  slug: string;
  title: string;
  description: string;
  published: string;
  updated: string;
}): Json {
  const org = { "@type": "Organization", name: messages.brand.name, url: site() };
  return {
    "@context": CONTEXT,
    "@type": "Article",
    headline: g.title,
    description: g.description,
    url: `${site()}/guides/${g.slug}`,
    datePublished: g.published,
    dateModified: g.updated,
    author: org,
    publisher: org,
  };
}

/** Home page: who runs the shop, for Google's knowledge panel and sitelinks. */
export function organizationJsonLd(): Json {
  const b = messages.brand;
  return {
    "@context": CONTEXT,
    "@type": "OnlineStore",
    name: b.name,
    url: site(),
    logo: `${site()}/apple-icon.png`,
    email: b.email,
    legalName: "BASK ADVENTURE PTY LTD",
    taxID: "18 688 825 532",
    areaServed: "AU",
    sameAs: [b.instagram, b.tiktok],
  };
}
