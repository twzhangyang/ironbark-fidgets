import { describe, expect, it } from "vitest";

import { boxesAvailable, boxSaving, suggestBoxPrice } from "@/lib/box";

describe("full box (Phase 11)", () => {
  it("suggests about 10% off, rounded to .95", () => {
    expect(suggestBoxPrice(1295, 12)).toBe(13995);
    expect(suggestBoxPrice(1295, 6)).toBe(6995);
    expect(suggestBoxPrice(1895, 24)).toBe(40895);
  });

  it("works out the saving and whole boxes", () => {
    expect(boxSaving(1295, { qty: 12, priceCents: 13995 })).toBe(1545);
    expect(boxSaving(1295, { qty: 12, priceCents: 20000 })).toBe(0);
    expect(boxesAvailable(24, 12)).toBe(2);
    expect(boxesAvailable(23, 12)).toBe(1);
    expect(boxesAvailable(-1, 12)).toBe(0);
  });
});
