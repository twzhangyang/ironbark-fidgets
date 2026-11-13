import { describe, expect, it } from "vitest";

import {
  boxInput,
  designInput,
  dollars,
  parseDollars,
  collectionInput,
  productInput,
  slugify,
  tagInput,
} from "@/lib/admin/catalog";

describe("parseDollars", () => {
  it.each([
    ["12.95", 1295],
    ["$12.95", 1295],
    ["12", 1200],
    ["12.5", 1250],
    ["1,299.00", 129900],
  ])("%s → %d", (input, cents) => expect(parseDollars(input)).toBe(cents));
  it.each(["", "0", "0.00", "-5", "12.955", "abc", "1e3"])("rejects %s", (input) =>
    expect(parseDollars(input)).toBeNull(),
  );
  it("round-trips with dollars()", () => expect(parseDollars(dollars(1295))).toBe(1295));
});

describe("slugify", () => {
  it("makes web addresses", () => {
    expect(slugify("Melon Bun & Friends!")).toBe("melon-bun-and-friends");
    expect(slugify("  Café  Crème ")).toBe("cafe-creme");
    expect(slugify("!!!")).toBe("");
  });
});

const product = {
  name: "Melon Bun",
  collectionId: "00000000-0000-4000-8000-000000000000",
  description: "",
  material: "PU foam",
  sizeLabel: "",
  ageMin: "14",
  badges: [],
  images: ["catalog/x.webp"],
  sortOrder: "0",
  active: true,
  isTest: false,
  tagIds: ["00000000-0000-4000-8000-000000000001"],
  designSource: "original",
  licenceNote: "",
  youtubeId: null,
  videoVertical: true,
  sellBox: false,
  boxQty: "",
  boxPriceCents: "",
  mixedBox: false,
};

describe("productInput", () => {
  it("accepts a product", () => expect(productInput.safeParse(product).success).toBe(true));
  it("keeps the 14+ age rule", () =>
    expect(productInput.safeParse({ ...product, ageMin: "12" }).success).toBe(false));
  it("needs a material (safety block)", () =>
    expect(productInput.safeParse({ ...product, material: "" }).success).toBe(false));
  it("rejects image URLs (paths only)", () =>
    expect(productInput.safeParse({ ...product, images: ["https://x.com/a.webp"] }).success).toBe(
      false,
    ));
  it("licensed products need a licence record (Phase 8 D10)", () => {
    expect(productInput.safeParse({ ...product, designSource: "licensed" }).success).toBe(false);
    expect(
      productInput.safeParse({
        ...product,
        designSource: "licensed",
        licenceNote: "Sanrio, ABC Toys, INV-1234",
      }).success,
    ).toBe(true);
  });
  it("rejects bad tag ids", () =>
    expect(productInput.safeParse({ ...product, tagIds: ["mini"] }).success).toBe(false));
  it("sold by the box needs pieces and a box price (Phase 11)", () => {
    expect(productInput.safeParse({ ...product, sellBox: true }).success).toBe(false);
    expect(
      productInput.safeParse({ ...product, sellBox: true, boxQty: "1", boxPriceCents: "9.95" })
        .success,
    ).toBe(false);
    const ok = productInput.safeParse({
      ...product,
      sellBox: true,
      boxQty: "12",
      boxPriceCents: "139.95",
    });
    expect(ok.success && ok.data).toMatchObject({ boxQty: 12, boxPriceCents: 13995 });
    // Untick keeps the numbers (so it can be switched back on).
    const off = productInput.safeParse({ ...product, boxQty: "12", boxPriceCents: "139.95" });
    expect(off.success && off.data).toMatchObject({ sellBox: false, boxQty: 12 });
  });
  it("takes a YouTube video ID, not a link (Phase 10)", () => {
    expect(productInput.safeParse({ ...product, youtubeId: "dQw4w9WgXcQ" }).success).toBe(true);
    expect(
      productInput.safeParse({ ...product, youtubeId: "https://youtu.be/dQw4w9WgXcQ" }).success,
    ).toBe(false);
  });
});

describe("collectionInput and tagInput", () => {
  const collection = {
    name: "Cats",
    parentId: "00000000-0000-4000-8000-000000000000",
    description: "",
    image: null,
    sortOrder: "0",
    active: true,
  };
  it("accepts a subcategory or a top-level category", () => {
    expect(collectionInput.safeParse(collection).success).toBe(true);
    expect(collectionInput.safeParse({ ...collection, parentId: null }).success).toBe(true);
    expect(collectionInput.safeParse({ ...collection, parentId: "animals" }).success).toBe(false);
  });
  it("tags need a group", () => {
    const tag = { name: "Mini", group: "Size", sortOrder: "0", active: true };
    expect(tagInput.safeParse(tag).success).toBe(true);
    expect(tagInput.safeParse({ ...tag, group: " " }).success).toBe(false);
  });
});

describe("designInput", () => {
  const design = {
    name: "Tabby",
    sku: "ib-cat-tabby",
    price: "12.95",
    compareAt: "",
    lowStockAt: "3",
    weightGrams: "80",
    image: null,
    sortOrder: "0",
    active: true,
  };
  it("parses price to cents and upper-cases the SKU", () => {
    const r = designInput.parse(design);
    expect(r.price).toBe(1295);
    expect(r.compareAt).toBeNull();
    expect(r.sku).toBe("IB-CAT-TABBY");
  });
  it("“was” price must be higher", () =>
    expect(designInput.safeParse({ ...design, compareAt: "10" }).success).toBe(false));
});

describe("boxInput", () => {
  const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  const box = {
    name: "Blind box",
    description: "",
    type: "mystery",
    price: "19.95",
    pickCount: "3",
    images: [],
    sortOrder: "0",
    active: true,
    items: [1, 2, 3].map((n) => ({ variantId: id(n), qty: "1" })),
  };
  it("accepts a blind box", () => expect(boxInput.safeParse(box).success).toBe(true));
  it("pool must hold at least pickCount designs", () =>
    expect(boxInput.safeParse({ ...box, pickCount: "4" }).success).toBe(false));
  it("no duplicate designs", () =>
    expect(boxInput.safeParse({ ...box, items: [...box.items, box.items[0]] }).success).toBe(
      false,
    ));
  it("a fixed box needs contents", () =>
    expect(boxInput.safeParse({ ...box, type: "fixed", pickCount: null, items: [] }).success).toBe(
      false,
    ));
});
