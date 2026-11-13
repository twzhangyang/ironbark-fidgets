import { describe, expect, it } from "vitest";

import { search, type SearchDoc, words } from "@/lib/catalog-search";

const DOCS: SearchDoc[] = [
  {
    id: "donut",
    name: "Sprinkle Donut",
    related: ["Food", "Donuts", "Strawberry Sprinkle", "IB-DON-STRAWBERRY"],
    description: "Slow-rise and soft.",
  },
  {
    id: "keychain",
    name: "Cat Keycap Keychain",
    related: ["Animals", "Cats", "Tabby", "Keychain", "IB-KEY-TABBY"],
    description: "A tiny cat on a clicky switch.",
  },
  {
    id: "bun",
    name: "Melon Bun",
    related: ["Food", "Bread", "IB-BRD-MELON-BUN"],
    description: "Crackly top, like a donut shop classic.",
  },
  {
    id: "roll",
    name: "Caterpillar Roll",
    related: ["Food", "Bread"],
    description: "Long and soft.",
  },
  {
    id: "cactus",
    name: "Café Cactus",
    related: ["Plants", "Succulents"],
    description: "A spiky friend that won't prick.",
  },
];

describe("words", () => {
  it("lowercases, strips accents and plurals", () => {
    expect(words("Café CATS, Puppies & glass")).toEqual(["cafe", "cat", "puppy", "glass"]);
  });
});

describe("search", () => {
  it("ranks name matches above description matches", () => {
    expect(search(DOCS, "donut")).toEqual(["donut", "bun"]);
  });
  it("matches plurals and word starts", () => {
    expect(search(DOCS, "cats")).toEqual(["keychain"]);
    expect(search(DOCS, "cat")).toEqual(["keychain", "roll"]);
    expect(search(DOCS, "succ")).toEqual(["cactus"]);
    expect(search(DOCS, "cafe")).toEqual(["cactus"]);
  });
  it("needs every word to match", () => {
    expect(search(DOCS, "tabby keychain")).toEqual(["keychain"]);
    expect(search(DOCS, "tabby donut")).toEqual([]);
  });
  it("finds SKUs and categories", () => {
    expect(search(DOCS, "IB-BRD-MELON-BUN")).toEqual(["bun"]);
    expect(search(DOCS, "food")).toEqual(["donut", "bun", "roll"]);
  });
  it("returns nothing for an empty query", () => {
    expect(search(DOCS, "  ?! ")).toEqual([]);
  });
});
