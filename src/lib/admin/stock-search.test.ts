import { describe, expect, it } from "vitest";

import { matchesStockQuery, searchWords } from "@/lib/admin/stock-search";

const row = { sku: "SQ-FRT-012", label: "Funny Face Fruit (Peach)", category: "Food › Fruit" };

describe("matchesStockQuery", () => {
  it("matches everything when the search is empty", () => {
    expect(matchesStockQuery(row, "")).toBe(true);
    expect(matchesStockQuery(row, "   ")).toBe(true);
  });
  it("finds by SKU, name or category, ignoring case", () => {
    expect(matchesStockQuery(row, "sq-frt")).toBe(true);
    expect(matchesStockQuery(row, "PEACH")).toBe(true);
    expect(matchesStockQuery(row, "food")).toBe(true);
  });
  it("needs every word to match", () => {
    expect(matchesStockQuery(row, "fruit peach")).toBe(true);
    expect(matchesStockQuery(row, "fruit 012")).toBe(true);
    expect(matchesStockQuery(row, "fruit banana")).toBe(false);
  });
});

describe("searchWords", () => {
  it("splits on any spaces", () => {
    expect(searchWords("  Fruit   peach ")).toEqual(["fruit", "peach"]);
  });
});
