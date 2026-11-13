/**
 * Integrity checks against the real database (replaces the Phase 1 sample-data tests).
 *   pnpm db:check
 * Exits 1 if anything is wrong. Read-only.
 */
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { loadCatalogSnapshot } from "../src/lib/db/catalog-snapshot";
import { getDirectUrl } from "../src/lib/db/env";
import * as schema from "../src/lib/db/schema";
import { IMAGE_BUCKET } from "../src/lib/images";
import { bundleAvailable } from "../src/lib/stock";

const problems: string[] = [];
const check = (ok: boolean, message: string) => {
  if (!ok) problems.push(message);
};

async function main() {
  const sql = postgres(getDirectUrl(), { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(sql, { schema });
    const cat = await loadCatalogSnapshot(db);
    const variantsById = new Map(cat.variants.map((v) => [v.id, v]));

    check(cat.products.length > 0, "no active products");
    for (const c of cat.collections) {
      // A category counts the products in its subcategories (Phase 8).
      const scope = new Set([
        c.id,
        ...cat.collections.filter((x) => x.parentId === c.id).map((x) => x.id),
      ]);
      check(
        cat.products.some((p) => scope.has(p.collectionId)),
        `collection ${c.slug} has no products`,
      );
      check(
        !c.parentId || cat.collections.some((x) => x.id === c.parentId && !x.parentId),
        `collection ${c.slug} is more than two levels deep`,
      );
    }
    const tagSlugs = new Set(cat.tags.map((t) => t.slug));
    for (const p of cat.products)
      for (const t of p.tags) check(tagSlugs.has(t), `product ${p.slug} has unknown tag ${t}`);
    console.log(
      `${cat.collections.filter((c) => !c.parentId).length} categories, ${cat.tags.length} tags`,
    );
    for (const p of cat.products) {
      const own = cat.variants.filter((v) => v.productId === p.id);
      check(own.length > 0, `product ${p.slug} has no active variants`);
      check(p.ageMin >= 8, `product ${p.slug} is labelled under 8+`);
      check(p.images.length > 0, `product ${p.slug} has no photos`);
      check(p.material.trim() !== "", `product ${p.slug} has no material (safety info)`);
    }
    for (const b of cat.bundles) {
      const lines = b.type === "fixed" ? b.items.map((i) => i.variantId) : b.pool;
      check(lines.length > 0, `box ${b.slug} is empty`);
      for (const id of lines) check(variantsById.has(id), `box ${b.slug} uses an inactive variant`);
      if (b.type === "mystery") {
        check(
          b.pool.length >= b.pickCount,
          `mystery box ${b.slug} pool is smaller than pick count`,
        );
      }
    }

    // Stock always matches the movements (D3).
    const drift = await sql<{ sku: string; stock: number; moved: number }[]>`
      select v.sku, v.stock, coalesce(sum(m.delta), 0)::int as moved
      from variants v left join stock_movements m on m.variant_id = v.id
      group by v.id having v.stock <> coalesce(sum(m.delta), 0)`;
    for (const d of drift) {
      problems.push(`variant ${d.sku}: stock ${d.stock} but movements add up to ${d.moved}`);
    }

    // Orders: held stock matches what's to be packed; cancelled orders hold nothing.
    const holds = await sql<
      { order_number: string; status: string; held: number; packed: number }[]
    >`
      select o.order_number, o.status,
        coalesce((select -sum(m.delta) from stock_movements m where m.order_id = o.id), 0)::int as held,
        coalesce((select sum(c.qty) from order_items i join order_item_contents c on c.order_item_id = i.id where i.order_id = o.id), 0)::int as packed
      from orders o`;
    for (const h of holds) {
      // Refunded orders keep their stock off the shelf unless it was put back (Phase 5 D6).
      const expected = h.status === "cancelled" ? 0 : h.packed;
      const ok = h.held === expected || (h.status === "refunded" && h.held === 0);
      if (!ok) {
        problems.push(
          `order ${h.order_number} (${h.status}): holds ${h.held} items, expected ${expected}`,
        );
      }
    }

    // Every image path exists in Storage.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (url && key) {
      const bucket = createClient(url, key, { auth: { persistSession: false } }).storage.from(
        IMAGE_BUCKET,
      );
      const paths = new Set([
        ...cat.collections.map((c) => c.image),
        ...cat.products.flatMap((p) => p.images),
        ...cat.variants.flatMap((v) => (v.image ? [v.image] : [])),
        ...cat.bundles.flatMap((b) => b.images),
      ]);
      const folders = new Map<string, Set<string>>();
      for (const path of paths) {
        const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
        if (!folders.has(folder)) {
          const { data, error } = await bucket.list(folder, { limit: 1000 });
          if (error) throw new Error(`storage list failed: ${error.message}`);
          folders.set(folder, new Set(data.map((f) => f.name)));
        }
        check(
          folders.get(folder)!.has(path.slice(path.lastIndexOf("/") + 1)),
          `missing photo ${path}`,
        );
      }
    } else {
      console.warn("! skipped photo check (Supabase URL / secret key not set)");
    }

    const soldOut = cat.variants.filter((v) => v.stock <= 0).length;
    const boxes = cat.bundles.map((b) => `${b.slug}=${bundleAvailable(b, variantsById)}`);
    console.log(
      `${cat.collections.length} collections, ${cat.products.length} products, ${cat.variants.length} variants (${soldOut} sold out), ${cat.bundles.length} boxes`,
    );
    console.log(`boxes available: ${boxes.join(", ")}`);
    console.log(`${holds.length} orders checked`);
  } finally {
    await sql.end();
  }

  if (problems.length) {
    console.error(`✗ ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("✓ database checks passed");
  }
}

main().catch((error: Error) => {
  console.error("✗ db:check failed:", error.message);
  process.exitCode = 1;
});
