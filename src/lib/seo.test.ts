import { describe, expect, it } from "vitest";

import type { BundleSummary, ProductSummary } from "@/lib/catalog";
import { boxJsonLd, faqJsonLd, metaDescription, productJsonLd } from "@/lib/seo";
import type { Collection, Product, Variant } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reading nested JSON-LD in tests
type Ld = Record<string, any>;

const product = {
  id: "p1",
  slug: "melon-bun",
  name: "Melon Bun",
  description: "Slow-rise <b>bun</b>",
  material: "PU foam",
  images: ["/hero-squishies.webp", "https://cdn.example/a.webp"],
} as Product;
const variant = (id: string, priceCents: number) =>
  ({ id, sku: `SKU-${id}`, priceCents, stock: 3 }) as Variant;
const summary = (variants: Variant[], extra: Partial<ProductSummary> = {}): ProductSummary => ({
  product,
  collection: { name: "Food" } as Collection,
  variants,
  minPriceCents: Math.min(...variants.map((v) => v.priceCents)),
  maxPriceCents: Math.max(...variants.map((v) => v.priceCents)),
  compareAtCents: null,
  stock: "in_stock",
  rating: null,
  ...extra,
});

describe("product JSON-LD (Phase 6 T2)", () => {
  it("one design: an Offer with sku, AUD price, absolute images, 14-day returns", () => {
    const d = productJsonLd(summary([variant("a", 1295)])) as Ld;
    expect(d["@type"]).toBe("Product");
    expect(d.offers).toMatchObject({
      "@type": "Offer",
      price: "12.95",
      priceCurrency: "AUD",
      sku: "SKU-a",
      availability: "https://schema.org/InStock",
    });
    expect(d.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(14);
    expect(d.brand).toEqual({ "@type": "Brand", name: "Ironbark Fidgets" });
    expect(d.offers.hasMerchantReturnPolicy.returnFees).toBe(
      "https://schema.org/ReturnFeesCustomerResponsibility",
    );
    expect(d.image[0]).toMatch(/^https?:\/\/.+\/hero-squishies\.webp$/);
    expect(d.image[1]).toBe("https://cdn.example/a.webp");
    expect(d.aggregateRating).toBeUndefined();
  });

  it("different prices: an AggregateOffer; sold out and ratings carried through", () => {
    const d = productJsonLd(
      summary([variant("a", 995), variant("b", 1495)], {
        stock: "sold_out",
        rating: { avg: 4.5, count: 2 },
      }),
    ) as Ld;
    expect(d.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "9.95",
      highPrice: "14.95",
      offerCount: 2,
      availability: "https://schema.org/OutOfStock",
    });
    expect(d.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 2 });
  });

  it("blind boxes say no change-of-mind returns", () => {
    const box = {
      bundle: {
        slug: "blind",
        name: "Blind",
        description: "",
        images: [],
        priceCents: 2995,
        type: "mystery",
      },
      stock: "low",
      rating: null,
    } as unknown as BundleSummary;
    const d = boxJsonLd(box) as Ld;
    expect(d.offers.price).toBe("29.95");
    expect(d.offers.hasMerchantReturnPolicy.returnPolicyCategory).toBe(
      "https://schema.org/MerchantReturnNotPermitted",
    );
  });
});

describe("metaDescription", () => {
  it("keeps only the first paragraph", () => {
    expect(metaDescription("A round orange.\n\nSoft foam.\n\nKeep cool.")).toBe("A round orange.");
  });

  it("cuts long text at a word, under the limit", () => {
    const d = metaDescription(`${"squish ".repeat(40)}end`);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith("squish…")).toBe(true);
  });
});

describe("faqJsonLd", () => {
  it("lists every question with its answer", () => {
    const d = faqJsonLd([{ q: "Do they smell?", a: "No." }]) as {
      "@type": string;
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(d["@type"]).toBe("FAQPage");
    expect(d.mainEntity[0]).toMatchObject({
      name: "Do they smell?",
      acceptedAnswer: { text: "No." },
    });
  });
});
