import { describe, expect, it } from "vitest";

import { cnyToFen, packPriceCents, singlePriceCents } from "@/lib/pricing";

describe("price formula", () => {
  it("single = ¥ × 4 rounded up to .95", () => {
    expect(singlePriceCents("1.5")).toBe(695); // 6.00
    expect(singlePriceCents("2.8")).toBe(1195); // 11.20
    expect(singlePriceCents("2.6")).toBe(1095); // 10.40
    expect(singlePriceCents("3")).toBe(1295); // 12.00
    expect(singlePriceCents("4.5")).toBe(1895); // 18.00
    expect(singlePriceCents("1.2")).toBe(495); // 4.80
  });

  it("never rounds below ¥ × 4", () => {
    for (let fen = 100; fen <= 600; fen++) {
      const cny = (fen / 100).toFixed(2);
      const p = singlePriceCents(cny);
      expect(p).toBeGreaterThanOrEqual(fen * 4);
      expect(p - fen * 4).toBeLessThan(100);
      expect(p % 100).toBe(95);
    }
  });

  it("pack = single × pieces × 0.9 to the nearest .95", () => {
    expect(packPriceCents(1095, 6)).toBe(5895); // 59.13
    expect(packPriceCents(1195, 6)).toBe(6495); // 64.53
    expect(packPriceCents(695, 12)).toBe(7495); // 75.06
    expect(() => packPriceCents(1095, 1)).toThrow();
  });

  it("reads supplier prices without float errors", () => {
    expect(cnyToFen("2.9")).toBe(290);
    expect(cnyToFen("3")).toBe(300);
    expect(() => cnyToFen("abc")).toThrow();
  });
});
