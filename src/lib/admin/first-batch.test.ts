import { describe, expect, it } from "vitest";

import { mergeImages, parseCsv, photoPaths } from "@/lib/admin/first-batch";

const HEAD = "sku,name,pieces_received,random_single,pack_qty,pack_price,photos";

describe("first batch import", () => {
  it("reads singles and packs", () => {
    const rows = parseCsv(
      `${HEAD}\nMY-11,Little Orange,24,yes,,,3\nMY-12,Fast Food,12,yes,6,64.95,8\n`,
    );
    expect(rows[0]).toMatchObject({
      sku: "MY-11",
      pieces: 24,
      randomSingle: true,
      packQty: null,
      packCents: null,
    });
    expect(rows[1]).toMatchObject({ packQty: 6, packCents: 6495, photos: 8 });
  });

  it("rejects bad rows", () => {
    expect(() => parseCsv(`${HEAD}\nMY-12,X,12,yes,6,,8`)).toThrow(/go together/);
    expect(() => parseCsv(`${HEAD}\nMY-12,X,12,maybe,,,8`)).toThrow(/yes or no/);
    expect(() => parseCsv(`${HEAD}\nMY-12,X,1.5,yes,,,8`)).toThrow(/whole number/);
    expect(() => parseCsv("sku,qty\nMY-12,1")).toThrow(/header/);
  });

  it("keeps the main photo first and never adds a photo twice", () => {
    const add = photoPaths("MY-11", 2);
    expect(add).toEqual(["catalog/my/my-11-2.webp", "catalog/my/my-11-3.webp"]);
    const once = mergeImages(["catalog/my/my-11.webp"], add);
    expect(once[0]).toBe("catalog/my/my-11.webp");
    expect(mergeImages(once, add)).toEqual(once);
  });
});
