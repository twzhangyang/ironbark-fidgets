import { describe, expect, it } from "vitest";

import { addLine, checkoutLinesSchema, parseStoredLines, setLineQty } from "@/lib/checkout/cart";
import { formatOrderNumber, melbourneDateKey } from "@/lib/checkout/order-number";
import { buildOrderPlan, scopeError, seededRandom, type PlanVariant } from "@/lib/checkout/plan";
import {
  freeShippingGap,
  gstIncluded,
  parseShippingMethod,
  shippingFor,
} from "@/lib/checkout/pricing";
import type { Bundle } from "@/lib/types";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function v(n: number, stock: number, priceCents = 1000): PlanVariant {
  return {
    id: uuid(n),
    productName: `P${n}`,
    variantName: null,
    priceCents,
    stock,
    image: null,
    box: null,
    mixedBox: false,
  };
}

function catalog(variants: PlanVariant[], bundles: Bundle[] = []) {
  return {
    variants: new Map(variants.map((x) => [x.id, x])),
    bundles: new Map(bundles.map((b) => [b.id, b])),
  };
}

const base = { slug: "b", description: "", images: [], sortOrder: 0, active: true };
const fixed = (n: number, items: [number, number][], priceCents = 2500): Bundle => ({
  ...base,
  id: uuid(n),
  name: `Box ${n}`,
  type: "fixed",
  priceCents,
  items: items.map(([id, qty]) => ({ variantId: uuid(id), qty })),
});
const mystery = (n: number, pool: number[], pickCount: number): Bundle => ({
  ...base,
  id: uuid(n),
  name: `Blind ${n}`,
  type: "mystery",
  priceCents: 2495,
  pool: pool.map(uuid),
  pickCount,
});

describe("pricing", () => {
  it("ships flat under $99 and free at $99", () => {
    expect(shippingFor(9899)).toBe(995);
    expect(shippingFor(9900)).toBe(0);
    // Express is one price for any order; free shipping covers standard only.
    expect(shippingFor(2000, "express")).toBe(1495);
    expect(shippingFor(9000, "express")).toBe(1495);
    expect(parseShippingMethod("express")).toBe("express");
    expect(parseShippingMethod(undefined)).toBe("standard");
    expect(parseShippingMethod("overnight")).toBe("standard");
    expect(freeShippingGap(5000)).toBe(4900);
    expect(freeShippingGap(10000)).toBe(0);
  });

  it("GST is one eleventh of the inclusive total", () => {
    expect(gstIncluded(1100)).toBe(100);
    expect(gstIncluded(6995)).toBe(636);
  });
});

describe("order number", () => {
  it("uses the Melbourne date", () => {
    // 2026-11-30 14:30 UTC is 1 Dec 01:30 in Melbourne (AEDT, UTC+11).
    expect(melbourneDateKey(new Date("2026-11-30T14:30:00Z"))).toBe("261201");
    expect(formatOrderNumber("261201", 7)).toBe("IB-261201-0007");
  });
});

describe("cart lines", () => {
  it("merges and caps quantities", () => {
    let lines = addLine([], { type: "variant", id: uuid(1), qty: 4 });
    lines = addLine(lines, { type: "variant", id: uuid(1), qty: 9 });
    expect(lines).toEqual([{ type: "variant", id: uuid(1), qty: 10 }]);
    expect(addLine([], { type: "box", id: uuid(2), qty: 5 }, 2)[0].qty).toBe(2);
    expect(setLineQty(lines, `variant:${uuid(1)}`, 0)).toEqual([]);
    // A single and a full box of the same design are separate lines (Phase 11).
    const both = addLine(lines, { type: "fullbox", id: uuid(1), qty: 1 });
    expect(both).toHaveLength(2);
  });

  it("drops malformed stored lines", () => {
    expect(
      parseStoredLines([
        { type: "variant", id: uuid(1), qty: 1 },
        { type: "variant", id: uuid(1), qty: 2 },
        { type: "nope", id: uuid(2), qty: 1 },
        { type: "box", id: "not-a-uuid", qty: 1 },
      ]),
    ).toEqual([{ type: "variant", id: uuid(1), qty: 1 }]);
    expect(parseStoredLines("junk")).toEqual([]);
  });

  it("rejects too many items at checkout", () => {
    const lines = [1, 2, 3, 4].map((n) => ({ type: "variant" as const, id: uuid(n), qty: 8 }));
    expect(checkoutLinesSchema.safeParse(lines).success).toBe(false);
    expect(checkoutLinesSchema.safeParse(lines.slice(0, 3)).success).toBe(true);
  });
});

describe("buildOrderPlan", () => {
  it("prices singles from the catalogue and totals the subtotal", () => {
    const plan = buildOrderPlan(
      [{ type: "variant", id: uuid(1), qty: 2 }],
      catalog([v(1, 5, 1295)]),
    );
    expect(plan.ok && plan.subtotalCents).toBe(2590);
  });

  it("a fixed box takes each component × qty", () => {
    const plan = buildOrderPlan(
      [{ type: "box", id: uuid(10), qty: 2 }],
      catalog(
        [v(1, 5), v(2, 5)],
        [
          fixed(10, [
            [1, 1],
            [2, 2],
          ]),
        ],
      ),
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.need.get(uuid(1))).toBe(2);
    expect(plan.need.get(uuid(2))).toBe(4);
    expect(plan.items[0].contents).toHaveLength(2);
  });

  it("singles and boxes share stock", () => {
    const plan = buildOrderPlan(
      [
        { type: "variant", id: uuid(1), qty: 2 },
        { type: "box", id: uuid(10), qty: 1 },
      ],
      catalog([v(1, 2)], [fixed(10, [[1, 1]])]),
    );
    expect(plan).toEqual({ ok: false, error: { code: "sold_out", index: 1 } });
  });

  it("blind boxes pick different in-stock designs, after the rest of the cart", () => {
    const plan = buildOrderPlan(
      [
        { type: "box", id: uuid(20), qty: 1 },
        { type: "variant", id: uuid(1), qty: 1 },
      ],
      catalog([v(1, 1), v(2, 1), v(3, 0), v(4, 5), v(5, 5)], [mystery(20, [1, 2, 3, 4, 5], 3)]),
      seededRandom(42),
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const picks = plan.items[0].contents;
    expect(picks.reduce((n, c) => n + c.qty, 0)).toBe(3);
    expect(picks.every((c) => c.qty === 1)).toBe(true); // all different
    expect(picks.some((c) => c.variantId === uuid(1))).toBe(false); // taken by the single
    expect(picks.some((c) => c.variantId === uuid(3))).toBe(false); // sold out
  });

  it("blind boxes repeat a design only when too few are in stock", () => {
    const plan = buildOrderPlan(
      [{ type: "box", id: uuid(20), qty: 1 }],
      catalog([v(1, 5), v(2, 0)], [mystery(20, [1, 2], 3)]),
      seededRandom(1),
    );
    expect(plan.ok && plan.items[0].contents).toEqual([{ variantId: uuid(1), qty: 3 }]);
  });

  it("fails when the pool runs out, and for unknown items", () => {
    const cat = catalog([v(1, 2)], [mystery(20, [1], 3)]);
    expect(buildOrderPlan([{ type: "box", id: uuid(20), qty: 1 }], cat).ok).toBe(false);
    expect(buildOrderPlan([{ type: "variant", id: uuid(9), qty: 1 }], cat)).toEqual({
      ok: false,
      error: { code: "unavailable", index: 0 },
    });
  });

  describe("full boxes (Phase 11)", () => {
    const boxed = (stock: number): PlanVariant => ({
      ...v(1, stock, 1295),
      box: { qty: 12, priceCents: 13995 },
      mixedBox: true,
    });

    it("prices a full box and takes its pieces", () => {
      const plan = buildOrderPlan([{ type: "fullbox", id: uuid(1), qty: 2 }], catalog([boxed(24)]));
      expect(plan.ok && plan.items[0]).toMatchObject({
        unitPriceCents: 13995,
        qty: 2,
        boxQty: 12,
        variantName: "Pack of 12",
        contents: [{ variantId: uuid(1), qty: 24 }],
      });
      expect(plan.ok && plan.need.get(uuid(1))).toBe(24);
    });

    it("a single from a mixed box is a random colour", () => {
      const plan = buildOrderPlan([{ type: "variant", id: uuid(1), qty: 1 }], catalog([boxed(5)]));
      expect(plan.ok && plan.items[0]).toMatchObject({
        unitPriceCents: 1295,
        boxQty: 1,
        variantName: "Random design",
      });
    });

    it("singles and boxes share the same stock", () => {
      const lines = [
        { type: "variant" as const, id: uuid(1), qty: 3 },
        { type: "fullbox" as const, id: uuid(1), qty: 1 },
      ];
      expect(buildOrderPlan(lines, catalog([boxed(15)])).ok).toBe(true);
      const plan = buildOrderPlan(lines, catalog([boxed(14)]));
      expect(plan).toEqual({ ok: false, error: { code: "sold_out", index: 1 } });
    });

    it("refuses a full box when the product isn't sold by the box", () => {
      const plan = buildOrderPlan([{ type: "fullbox", id: uuid(1), qty: 1 }], catalog([v(1, 50)]));
      expect(plan).toEqual({ ok: false, error: { code: "unavailable", index: 0 } });
    });
  });
});

describe("test products (Phase 12)", () => {
  const tests = new Set(["t1", "t2"]);
  it("numbers test orders TEST-…", () => {
    expect(formatOrderNumber("261106", 1, "TEST")).toBe("TEST-261106-0001");
    expect(formatOrderNumber("261106", 1)).toBe("IB-261106-0001");
  });
  it("production treats a test product as unavailable", () => {
    expect(scopeError([["r1"], ["t1"]], tests, "real")).toEqual({ code: "unavailable", index: 1 });
    expect(scopeError([["r1"]], tests, "real")).toBeNull();
    // A test box (only test designs) too.
    expect(scopeError([["t1", "t2"]], tests, "real")).toEqual({ code: "unavailable", index: 0 });
  });
  it("preview only sells test products", () => {
    expect(scopeError([["t1"], ["t2", "t1"]], tests, "test")).toBeNull();
    expect(scopeError([["t1"], ["r1"]], tests, "test")).toEqual({ code: "test_only", index: 1 });
    // A box mixing real and test designs is refused too.
    expect(scopeError([["t1", "r1"]], tests, "test")).toEqual({ code: "test_only", index: 0 });
  });
  it("scripts can buy anything", () => {
    expect(scopeError([["r1"], ["t1"]], tests, "any")).toBeNull();
  });
});
