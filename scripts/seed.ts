/**
 * Adds the starting catalogue (`scripts/seed-data.ts`) to the database.
 *   pnpm db:seed
 *
 * Only adds what's missing (matched by slug / SKU) and never overwrites, so it's safe to
 * re-run and won't undo later edits. New variants get their starting stock as a `received`
 * stock movement, in the same transaction. Run `pnpm images:upload` for the photos.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDirectUrl } from "../src/lib/db/env";
import * as schema from "../src/lib/db/schema";
import * as seed from "./seed-data";

const { collections, products, variants, bundles, bundleItems, bundlePool, stockMovements } =
  schema;

async function main() {
  const sql = postgres(getDirectUrl(), { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  try {
    const added = await db.transaction(async (tx) => {
      // Collections
      const newCollections = await tx
        .insert(collections)
        .values(
          seed.collections.map((c) => ({
            slug: c.slug,
            name: c.name,
            description: c.description,
            imagePath: c.image,
            sortOrder: c.sortOrder,
          })),
        )
        .onConflictDoNothing({ target: collections.slug })
        .returning({ id: collections.id });
      const collectionIdBySlug = new Map(
        (await tx.select({ id: collections.id, slug: collections.slug }).from(collections)).map(
          (r) => [r.slug, r.id],
        ),
      );
      const collectionId = (seedId: string) => {
        const slug = seed.collections.find((c) => c.id === seedId)?.slug;
        const id = slug && collectionIdBySlug.get(slug);
        if (!id) throw new Error(`Unknown collection ${seedId}`);
        return id;
      };

      // Products
      const newProducts = await tx
        .insert(products)
        .values(
          seed.products.map((p) => ({
            slug: p.slug,
            collectionId: collectionId(p.collectionId),
            name: p.name,
            description: p.description,
            material: p.material,
            sizeLabel: p.sizeLabel,
            ageMin: p.ageMin,
            badges: p.badges,
            images: p.images,
            sortOrder: p.sortOrder,
            active: p.active,
          })),
        )
        .onConflictDoNothing({ target: products.slug })
        .returning({ id: products.id });
      const productIdBySlug = new Map(
        (await tx.select({ id: products.id, slug: products.slug }).from(products)).map((r) => [
          r.slug,
          r.id,
        ]),
      );
      const productId = (seedId: string) => {
        const slug = seed.products.find((p) => p.id === seedId)?.slug;
        const id = slug && productIdBySlug.get(slug);
        if (!id) throw new Error(`Unknown product ${seedId}`);
        return id;
      };

      // Variants (+ starting stock as a movement)
      const newVariants = await tx
        .insert(variants)
        .values(
          seed.variants.map((v, i) => ({
            productId: productId(v.productId),
            slug: v.slug,
            sku: v.sku,
            name: v.name,
            priceCents: v.priceCents,
            compareAtCents: v.compareAtCents,
            stock: v.stock,
            weightGrams: v.weightGrams,
            imagePath: v.image,
            sortOrder: i,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: variants.id, stock: variants.stock });
      const movements = newVariants
        .filter((v) => v.stock > 0)
        .map((v) => ({
          variantId: v.id,
          delta: v.stock,
          reason: "received" as const,
          note: "Starting stock (seed)",
        }));
      if (movements.length) await tx.insert(stockMovements).values(movements);
      const variantIdBySku = new Map(
        (await tx.select({ id: variants.id, sku: variants.sku }).from(variants)).map((r) => [
          r.sku,
          r.id,
        ]),
      );
      const variantId = (seedId: string) => {
        const sku = seed.variants.find((v) => v.id === seedId)?.sku;
        const id = sku && variantIdBySku.get(sku);
        if (!id) throw new Error(`Unknown variant ${seedId}`);
        return id;
      };

      // Boxes: contents are only added for boxes created by this run.
      const newBundles = await tx
        .insert(bundles)
        .values(
          seed.bundles.map((b) => ({
            slug: b.slug,
            name: b.name,
            description: b.description,
            type: b.type,
            priceCents: b.priceCents,
            pickCount: b.type === "mystery" ? b.pickCount : null,
            images: b.images,
            sortOrder: b.sortOrder,
            active: b.active,
          })),
        )
        .onConflictDoNothing({ target: bundles.slug })
        .returning({ id: bundles.id, slug: bundles.slug });
      for (const row of newBundles) {
        const b = seed.bundles.find((s) => s.slug === row.slug)!;
        if (b.type === "fixed") {
          await tx.insert(bundleItems).values(
            b.items.map((i) => ({
              bundleId: row.id,
              variantId: variantId(i.variantId),
              qty: i.qty,
            })),
          );
        } else {
          await tx
            .insert(bundlePool)
            .values(b.pool.map((v) => ({ bundleId: row.id, variantId: variantId(v) })));
        }
      }

      return {
        collections: newCollections.length,
        products: newProducts.length,
        variants: newVariants.length,
        stockMovements: movements.length,
        boxes: newBundles.length,
      };
    });
    console.log("✓ seed done. Added:", added);
    console.log("  Deployed pages refresh on the next deploy (or within a few minutes).");
  } catch (error) {
    const e = error as { message?: string; cause?: { message?: string } };
    console.error("✗ seed failed:", e.cause?.message ?? e.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
