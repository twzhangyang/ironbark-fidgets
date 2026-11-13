import "server-only";

import { lineKey, type CartLine, parseStoredLines } from "@/lib/checkout/cart";
import { freeShippingGap, shippingFor } from "@/lib/checkout/pricing";
import { loadCatalogSnapshot } from "@/lib/db/catalog-snapshot";
import { showTestProducts } from "@/lib/test-mode";
import { db } from "@/lib/db/client";
import { fill, messages } from "@/content/messages";
import { imageUrl } from "@/lib/images";
import { MAX_QTY_PER_LINE } from "@/lib/site";
import { bundleAvailable } from "@/lib/stock";

export type CartLineStatus = "ok" | "reduced" | "sold_out" | "unavailable";

export type CartLineDetails = {
  key: string;
  line: CartLine;
  name: string;
  variantName: string | null;
  href: string | null;
  image: string | null;
  unitPriceCents: number;
  /** Most that can be bought on this line right now (0 = sold out). */
  max: number;
  status: CartLineStatus;
  /** Fixed box contents ("Melon Bun"), or null. */
  contents: string[] | null;
  /** Blind box: how many random designs. */
  blindCount: number | null;
};

export type CartDetails = {
  lines: CartLineDetails[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  freeShippingGapCents: number;
  /** Every line can be bought as it is. */
  ready: boolean;
};

/** Fresh (uncached) names, prices and stock for the cart drawer. */
export async function getCartDetails(raw: unknown): Promise<CartDetails> {
  const input = parseStoredLines(raw);
  const cat = await loadCatalogSnapshot(db, { includeTest: showTestProducts() });
  const variants = new Map(cat.variants.map((v) => [v.id, v]));
  const products = new Map(cat.products.map((p) => [p.id, p]));
  const boxes = new Map(cat.bundles.map((b) => [b.id, b]));
  const designs = (productId: string) =>
    cat.variants.filter((v) => v.productId === productId).length;

  const lines = input.map((line): CartLineDetails => {
    const key = lineKey(line);
    const missing: CartLineDetails = {
      key,
      line,
      name: "",
      variantName: null,
      href: null,
      image: null,
      unitPriceCents: 0,
      max: 0,
      status: "unavailable",
      contents: null,
      blindCount: null,
    };
    let base: Omit<CartLineDetails, "status" | "line" | "max"> & { available: number };
    if (line.type === "variant" || line.type === "fullbox") {
      const v = variants.get(line.id);
      const p = v && products.get(v.productId);
      if (!v || !p) return missing;
      // Phase 11: a full box of the design, or a single (random colour from a mixed box).
      const box = line.type === "fullbox" ? p.box : null;
      if (line.type === "fullbox" && !box) return missing;
      const label = box
        ? fill(messages.cart.fullBox, { count: box.qty })
        : p.mixedBox
          ? messages.cart.randomColour
          : null;
      const params = new URLSearchParams();
      if (designs(p.id) > 1) params.set("v", v.slug);
      if (box) params.set("buy", "box");
      base = {
        key,
        name: p.name,
        variantName: [designs(p.id) > 1 ? v.name : null, label].filter(Boolean).join(" · ") || null,
        href: `/products/${p.slug}${params.size ? `?${params}` : ""}`,
        image: imageUrl(v.image ?? p.images[0] ?? ""),
        unitPriceCents: box?.priceCents ?? v.priceCents,
        contents: null,
        blindCount: null,
        available: box ? Math.floor(v.stock / box.qty) : v.stock,
      };
    } else {
      const b = boxes.get(line.id);
      if (!b) return missing;
      base = {
        key,
        name: b.name,
        variantName: null,
        href: `/boxes/${b.slug}`,
        image: imageUrl(b.images[0] ?? ""),
        unitPriceCents: b.priceCents,
        contents:
          b.type === "fixed"
            ? b.items.map((i) => {
                const v = variants.get(i.variantId);
                const p = v && products.get(v.productId);
                const name = p ? (designs(p.id) > 1 ? `${p.name} (${v!.name})` : p.name) : "?";
                return i.qty > 1 ? `${i.qty} × ${name}` : name;
              })
            : null,
        blindCount: b.type === "mystery" ? b.pickCount : null,
        available: bundleAvailable(b, variants),
      };
    }
    const { available, ...rest } = base;
    const max = Math.max(0, Math.min(available, MAX_QTY_PER_LINE));
    if (max === 0) return { ...rest, line, max, status: "sold_out" };
    if (line.qty > max) return { ...rest, line: { ...line, qty: max }, max, status: "reduced" };
    return { ...rest, line, max, status: "ok" };
  });

  const buyable = lines.filter((l) => l.status === "ok" || l.status === "reduced");
  const subtotalCents = buyable.reduce((n, l) => n + l.unitPriceCents * l.line.qty, 0);
  const shippingCents = buyable.length ? shippingFor(subtotalCents) : 0;
  return {
    lines,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    freeShippingGapCents: freeShippingGap(subtotalCents),
    ready: buyable.length > 0 && buyable.length === lines.length,
  };
}
