/**
 * Fires 20 simultaneous checkouts at a temporary item with 2 in stock (half as singles, half
 * as a box that contains it) and checks exactly 2 succeed and stock never goes below 0.
 * Then releases the holds and removes everything it created.
 *   pnpm race:test
 */
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { releaseOrder, releaseStaleHolds, reserveOrder } from "../src/lib/checkout/orders";
import { getDatabaseUrl } from "../src/lib/db/env";
import * as schema from "../src/lib/db/schema";

const { bundleItems, bundles, collections, orders, products, stockMovements, variants } = schema;

async function main() {
  const sql = postgres(getDatabaseUrl(), { prepare: false, max: 10, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  const tag = `race-${Date.now()}`;
  const orderIds: string[] = [];
  let productId: string | undefined;
  let boxId: string | undefined;
  let failed = false;
  try {
    const [collection] = await db.select({ id: collections.id }).from(collections).limit(1);
    [{ id: productId }] = await db
      .insert(products)
      .values({
        slug: tag,
        collectionId: collection.id,
        name: "Race test",
        material: "test",
        active: false,
      })
      .returning({ id: products.id });
    const [variant] = await db
      .insert(variants)
      .values({ productId, slug: "default", sku: tag, name: "Default", priceCents: 1000, stock: 2 })
      .returning({ id: variants.id });
    await db
      .insert(stockMovements)
      .values({ variantId: variant.id, delta: 2, reason: "received", note: tag });
    [{ id: boxId }] = await db
      .insert(bundles)
      .values({ slug: tag, name: "Race box", type: "fixed", priceCents: 900, active: true })
      .returning({ id: bundles.id });
    await db.insert(bundleItems).values({ bundleId: boxId, variantId: variant.id, qty: 1 });
    // The product is hidden, but reserveOrder needs it active for singles.
    await db.update(products).set({ active: true }).where(eq(products.id, productId));

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        reserveOrder(db, [
          i % 2 ? { type: "variant", id: variant.id, qty: 1 } : { type: "box", id: boxId!, qty: 1 },
        ]),
      ),
    );
    const ok = results.filter((r) => r.ok);
    for (const r of ok) if (r.ok) orderIds.push(r.order.id);
    const [after] = await db
      .select({ stock: variants.stock })
      .from(variants)
      .where(eq(variants.id, variant.id));
    const numbers = new Set(ok.map((r) => (r.ok ? r.order.orderNumber : "")));
    console.log(
      `succeeded ${ok.length}/20, stock after ${after.stock}, unique order numbers ${numbers.size}`,
    );
    if (ok.length !== 2 || after.stock !== 0 || numbers.size !== ok.length) failed = true;

    for (const id of orderIds) await releaseOrder(db, id, "Race test");
    const [released] = await db
      .select({ stock: variants.stock })
      .from(variants)
      .where(eq(variants.id, variant.id));
    console.log(`after release stock ${released.stock}`);
    if (released.stock !== 2) failed = true;

    // Safety net: an unpaid hold from an hour ago is released by the sweep.
    const old = await reserveOrder(db, [{ type: "variant", id: variant.id, qty: 2 }], {
      now: new Date(Date.now() - 60 * 60_000),
    });
    if (old.ok) orderIds.push(old.order.id);
    await releaseStaleHolds(db);
    const [swept] = await db
      .select({ stock: variants.stock })
      .from(variants)
      .where(eq(variants.id, variant.id));
    console.log(`stale hold swept, stock ${swept.stock}`);
    if (!old.ok || swept.stock !== 2) failed = true;
  } finally {
    // Clean up everything this run created.
    if (orderIds.length) {
      await db.delete(stockMovements).where(inArray(stockMovements.orderId, orderIds));
      await db.delete(orders).where(inArray(orders.id, orderIds));
    }
    if (boxId) await db.delete(bundles).where(eq(bundles.id, boxId));
    if (productId) {
      const ids = (
        await db.select({ id: variants.id }).from(variants).where(eq(variants.productId, productId))
      ).map((v) => v.id);
      if (ids.length) await db.delete(stockMovements).where(inArray(stockMovements.variantId, ids));
      await db.delete(products).where(eq(products.id, productId));
    }
    await sql.end();
  }
  console.log(failed ? "✗ race test FAILED" : "✓ race test passed (no overselling)");
  process.exitCode = failed ? 1 : 0;
}

main().catch((e: Error) => {
  console.error("✗ race test error:", e.message);
  process.exitCode = 1;
});
