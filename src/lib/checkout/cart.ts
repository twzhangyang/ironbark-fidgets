/**
 * Cart lines, shared by the browser cart and the server. The browser only ever sends ids and
 * quantities; names, prices and stock always come from the database.
 */
import { z } from "zod";

import { MAX_ITEMS_PER_ORDER, MAX_QTY_PER_LINE } from "@/lib/site";

/**
 * - `variant`: single pieces of a design.
 * - `fullbox`: whole supplier boxes of a design (Phase 11); the id is the design's.
 * - `box`: a gift or blind box (a combo of different products); the id is the box's.
 */
export type CartLineType = "variant" | "fullbox" | "box";
export type CartLine = { type: CartLineType; id: string; qty: number };

export const lineKey = (l: Pick<CartLine, "type" | "id">) => `${l.type}:${l.id}`;

export const itemCount = (lines: readonly CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);

const lineSchema = z.object({
  type: z.enum(["variant", "fullbox", "box"]),
  id: z.uuid(),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});

/** What the server accepts at checkout. */
export const checkoutLinesSchema = z
  .array(lineSchema)
  .min(1)
  .max(MAX_ITEMS_PER_ORDER)
  .refine((lines) => new Set(lines.map(lineKey)).size === lines.length, "duplicate lines")
  .refine((lines) => itemCount(lines) <= MAX_ITEMS_PER_ORDER, "too many items");

/** Lenient parse for what's stored in the browser: drops anything malformed. */
export function parseStoredLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: CartLine[] = [];
  for (const raw of value) {
    const parsed = lineSchema.safeParse(raw);
    if (!parsed.success || seen.has(lineKey(parsed.data))) continue;
    seen.add(lineKey(parsed.data));
    out.push(parsed.data);
  }
  return out;
}

/** Adds to an existing line or appends; never above the per-line limit or `max`. */
export function addLine(lines: readonly CartLine[], line: CartLine, max = MAX_QTY_PER_LINE) {
  const limit = Math.min(MAX_QTY_PER_LINE, max);
  const key = lineKey(line);
  const existing = lines.find((l) => lineKey(l) === key);
  if (!existing) return [...lines, { ...line, qty: Math.min(line.qty, limit) }];
  return lines.map((l) =>
    lineKey(l) === key ? { ...l, qty: Math.min(l.qty + line.qty, Math.max(limit, 1)) } : l,
  );
}

export function setLineQty(lines: readonly CartLine[], key: string, qty: number) {
  if (qty <= 0) return lines.filter((l) => lineKey(l) !== key);
  return lines.map((l) =>
    lineKey(l) === key ? { ...l, qty: Math.min(qty, MAX_QTY_PER_LINE) } : l,
  );
}
