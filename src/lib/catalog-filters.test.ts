import { describe, expect, it } from "vitest";

import {
  applyFilters,
  facets,
  type Filterable,
  filterHref,
  NO_FILTERS,
  parseFilters,
  toggleTag,
} from "@/lib/catalog-filters";
import type { Tag } from "@/lib/types";

const tag = (slug: string, group: string): Tag => ({
  id: slug,
  slug,
  name: slug,
  group,
  sortOrder: 0,
});
const TAGS = [
  tag("mini", "Size"),
  tag("jumbo", "Size"),
  tag("scented", "Extras"),
  tag("glow", "Extras"),
];

type Item = Filterable & { id: string };
const item = (id: string, tags: string[], cents: number, sold = false): Item => ({
  id,
  tags,
  minPriceCents: cents,
  stock: sold ? "sold_out" : "in_stock",
});
const ITEMS = [
  item("a", ["mini", "scented"], 800),
  item("b", ["mini"], 1500),
  item("c", ["jumbo", "glow"], 2500),
  item("d", ["jumbo", "scented"], 4500, true),
  item("e", [], 1000),
];
const ids = (xs: Item[]) => xs.map((x) => x.id);

describe("parseFilters", () => {
  it("keeps known tags sorted and unique, drops unknown", () => {
    expect(
      parseFilters({ tag: ["scented", "mini", "nope", "mini"], price: "10-20", stock: "1" }, TAGS),
    ).toEqual({ tags: ["mini", "scented"], price: "10-20", inStock: true });
  });
  it("ignores bad prices and stock values", () => {
    expect(parseFilters({ tag: "mini", price: "cheap", stock: "yes" }, TAGS)).toEqual({
      tags: ["mini"],
      price: null,
      inStock: false,
    });
  });
});

describe("filterHref", () => {
  it("builds a stable address", () => {
    const f = { tags: ["mini", "glow"].sort(), price: "20-40" as const, inStock: true };
    expect(filterHref("/shop/cats", f, { sort: "price-asc" })).toBe(
      "/shop/cats?sort=price-asc&tag=glow&tag=mini&price=20-40&stock=1",
    );
    expect(filterHref("/shop", NO_FILTERS)).toBe("/shop");
  });
  it("toggles tags", () => {
    const on = toggleTag(NO_FILTERS, "mini");
    expect(on.tags).toEqual(["mini"]);
    expect(toggleTag(on, "mini").tags).toEqual([]);
  });
});

describe("applyFilters", () => {
  it("any-of within a group, all-of across groups", () => {
    expect(ids(applyFilters(ITEMS, { ...NO_FILTERS, tags: ["jumbo", "mini"] }, TAGS))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(ids(applyFilters(ITEMS, { ...NO_FILTERS, tags: ["mini", "scented"] }, TAGS))).toEqual([
      "a",
    ]);
  });
  it("price bands use the from price, upper bound exclusive", () => {
    expect(ids(applyFilters(ITEMS, { ...NO_FILTERS, price: "10-20" }, TAGS))).toEqual(["b", "e"]);
    expect(ids(applyFilters(ITEMS, { ...NO_FILTERS, price: "under-10" }, TAGS))).toEqual(["a"]);
  });
  it("in stock only", () => {
    expect(ids(applyFilters(ITEMS, { ...NO_FILTERS, inStock: true }, TAGS))).not.toContain("d");
  });
});

describe("facets", () => {
  it("counts options against the other filters and hides empty ones", () => {
    const f = facets(ITEMS, { ...NO_FILTERS, tags: ["scented"] }, TAGS);
    // Size counted among scented items: a (mini), d (jumbo).
    expect(f.groups.find((g) => g.name === "Size")?.tags.map((t) => [t.slug, t.count])).toEqual([
      ["mini", 1],
      ["jumbo", 1],
    ]);
    // Extras counted ignoring the Extras choice itself: scented a,d; glow c.
    expect(f.groups.find((g) => g.name === "Extras")?.tags.map((t) => [t.slug, t.count])).toEqual([
      ["scented", 2],
      ["glow", 1],
    ]);
    expect(f.prices).toEqual([
      { slug: "under-10", count: 1 },
      { slug: "40-plus", count: 1 },
    ]);
    expect(f.inStock).toBe(1);
  });
  it("keeps a chosen option even when it would give nothing", () => {
    const f = facets([item("x", [], 500)], { ...NO_FILTERS, tags: ["glow"] }, TAGS);
    expect(f.groups.flatMap((g) => g.tags.map((t) => t.slug))).toEqual(["glow"]);
  });
});
