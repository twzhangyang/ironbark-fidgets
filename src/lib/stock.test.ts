import { describe, expect, it } from "vitest";

import { formatAud } from "@/lib/money";
import {
  bundleAvailable,
  bundleSaving,
  priceRange,
  productStockState,
  stockState,
} from "@/lib/stock";
import type { FixedBundle, MysteryBundle, Variant } from "@/lib/types";

function variant(id: string, stock: number, priceCents = 1000): Variant {
  return {
    id,
    productId: "p",
    slug: id,
    sku: id,
    name: id,
    priceCents,
    compareAtCents: null,
    stock,
    weightGrams: 50,
    image: null,
  };
}

const lookup = (...vs: Variant[]) => new Map(vs.map((v) => [v.id, v]));

const base = {
  id: "b",
  slug: "b",
  name: "Box",
  description: "",
  images: [],
  sortOrder: 0,
  active: true,
};

describe("stockState", () => {
  it("classifies sold out, low and in stock", () => {
    expect(stockState(0)).toBe("sold_out");
    expect(stockState(-2)).toBe("sold_out");
    expect(stockState(1)).toBe("low");
    expect(stockState(3)).toBe("low");
    expect(stockState(4)).toBe("in_stock");
  });

  it("is sold out only when every variant is", () => {
    expect(productStockState([variant("a", 0), variant("b", 0)])).toBe("sold_out");
    expect(productStockState([variant("a", 0), variant("b", 2)])).toBe("low");
    expect(productStockState([variant("a", 0), variant("b", 10)])).toBe("in_stock");
  });
});

describe("priceRange", () => {
  it("returns min and max", () => {
    expect(priceRange([variant("a", 1, 900), variant("b", 1, 1500)])).toEqual({
      min: 900,
      max: 1500,
    });
  });
});

describe("bundleAvailable — fixed", () => {
  const box = (items: FixedBundle["items"]): FixedBundle => ({
    ...base,
    type: "fixed",
    priceCents: 2000,
    items,
  });

  it("is limited by the scarcest component", () => {
    const vs = lookup(variant("a", 10), variant("b", 3));
    expect(
      bundleAvailable(
        box([
          { variantId: "a", qty: 1 },
          { variantId: "b", qty: 1 },
        ]),
        vs,
      ),
    ).toBe(3);
  });

  it("divides by the quantity per box", () => {
    const vs = lookup(variant("a", 7));
    expect(bundleAvailable(box([{ variantId: "a", qty: 2 }]), vs)).toBe(3);
  });

  it("is 0 when any component is sold out", () => {
    const vs = lookup(variant("a", 10), variant("b", 0));
    expect(
      bundleAvailable(
        box([
          { variantId: "a", qty: 1 },
          { variantId: "b", qty: 1 },
        ]),
        vs,
      ),
    ).toBe(0);
  });

  it("is 0 (never unlimited) for missing components or empty boxes", () => {
    expect(bundleAvailable(box([{ variantId: "missing", qty: 1 }]), lookup())).toBe(0);
    expect(bundleAvailable(box([]), lookup())).toBe(0);
  });
});

describe("bundleAvailable — mystery", () => {
  const blind = (pool: string[], pickCount: number): MysteryBundle => ({
    ...base,
    type: "mystery",
    priceCents: 2400,
    pool,
    pickCount,
  });

  it("counts whole boxes from the pool's total stock", () => {
    const vs = lookup(variant("a", 4), variant("b", 0), variant("c", 3));
    expect(bundleAvailable(blind(["a", "b", "c"], 3), vs)).toBe(2);
  });

  it("is 0 when the pool can't fill one box", () => {
    expect(bundleAvailable(blind(["a"], 3), lookup(variant("a", 2)))).toBe(0);
    expect(bundleAvailable(blind(["a"], 0), lookup(variant("a", 9)))).toBe(0);
  });
});

describe("bundleSaving", () => {
  it("fixed: sum of singles minus box price", () => {
    const vs = lookup(variant("a", 5, 1000), variant("b", 5, 800));
    const box: FixedBundle = {
      ...base,
      type: "fixed",
      priceCents: 2200,
      items: [
        { variantId: "a", qty: 1 },
        { variantId: "b", qty: 2 },
      ],
    };
    expect(bundleSaving(box, vs)).toBe(400);
  });

  it("mystery: compares against the cheapest design so the claim is always true", () => {
    const vs = lookup(variant("a", 5, 995), variant("b", 5, 1295));
    const blind: MysteryBundle = {
      ...base,
      type: "mystery",
      priceCents: 2495,
      pool: ["a", "b"],
      pickCount: 3,
    };
    expect(bundleSaving(blind, vs)).toBe(995 * 3 - 2495);
  });

  it("never goes negative", () => {
    const vs = lookup(variant("a", 5, 500));
    const box: FixedBundle = {
      ...base,
      type: "fixed",
      priceCents: 900,
      items: [{ variantId: "a", qty: 1 }],
    };
    expect(bundleSaving(box, vs)).toBe(0);
  });
});

describe("formatAud", () => {
  it("formats integer cents", () => {
    expect(formatAud(1295)).toBe("$12.95");
    expect(formatAud(6900, { compact: true })).toBe("$69");
    expect(formatAud(6950, { compact: true })).toBe("$69.50");
    expect(() => formatAud(12.5)).toThrow();
  });
});
