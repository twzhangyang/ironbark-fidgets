/**
 * Catalogue editing for the admin (Phase 5 D10). Takes `db`. Nothing here deletes: things that
 * are no longer sold get hidden (`active = false`), so past orders keep their links. Stock is
 * never changed here (only via src/lib/admin/stock.ts).
 */
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

import * as schema from "@/lib/db/schema";
import { formatAud } from "@/lib/money";

type Db = PostgresJsDatabase<typeof schema>;
const { bundleItems, bundlePool, bundles, collections, productTags, products, tags, variants } =
  schema;

// ---------- helpers (pure, tested in catalog.test.ts) ----------

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** "12.95", "$12.95", "12" → cents. null if not a positive amount with at most 2 decimals. */
export function parseDollars(input: string): number | null {
  const value = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, frac = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return cents > 0 ? cents : null;
}

export const dollars = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2));

const money = z.string().transform((v, ctx) => {
  const cents = parseDollars(v);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "Enter a price like 12.95" });
    return z.NEVER;
  }
  return cents;
});
const optionalMoney = z.string().transform((v, ctx) => {
  if (v.trim() === "") return null;
  const cents = parseDollars(v);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "Enter a price like 12.95" });
    return z.NEVER;
  }
  return cents;
});
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only")
  .max(60);
const imagePath = z.string().regex(/^[a-z0-9/_.-]+\.(webp|jpg|jpeg|png)$/i);

// ---------- products ----------

export const productInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    slug: slug.optional(),
    collectionId: z.uuid(),
    description: z.string().trim().max(2000),
    material: z.string().trim().min(2, "Material is required (safety info)").max(120),
    sizeLabel: z.string().trim().max(80),
    // Ironbark rules: everything is labelled 14+ (adult desk/EDC products).
    ageMin: z.coerce.number().int().min(14, "Minimum age is 14+").max(99),
    badges: z.array(z.enum(["new", "bestseller"])),
    images: z.array(imagePath).max(12),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    active: z.boolean(),
    // Phase 12: a test product (preview only, never sold on production).
    isTest: z.boolean(),
    tagIds: z.array(z.uuid()).max(40),
    // Phase 8 D10: where the design comes from. Licensed needs a record of the licence.
    designSource: z.enum(["original", "licensed"]),
    licenceNote: z.string().trim().max(300),
    // Phase 10: the YouTube video ID (the action turns the pasted link into it), or null.
    youtubeId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{11}$/)
      .nullable(),
    videoVertical: z.boolean(),
    // Phase 11: customers can also buy a full supplier box. Kept when the tick is off.
    sellBox: z.boolean(),
    boxQty: z.preprocess(
      (v) => (v === "" || v == null ? null : v),
      z.coerce.number().int().min(2, "A box has at least 2 pieces").max(500).nullable(),
    ),
    boxPriceCents: optionalMoney,
    mixedBox: z.boolean(),
  })
  .refine((p) => p.designSource === "original" || p.licenceNote.length >= 5, {
    message: "Licensed: note the brand, supplier and invoice number",
    path: ["licenceNote"],
  })
  .refine((p) => !p.sellBox || (p.boxQty !== null && p.boxPriceCents !== null), {
    message: "Sold by the box: enter the pieces per box and the box price",
    path: ["boxQty"],
  });
export type ProductInput = z.infer<typeof productInput>;

export async function listProducts(db: Db) {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      active: products.active,
      isTest: products.isTest,
      sortOrder: products.sortOrder,
      image: sql<string | null>`${products.images}[1]`,
      collection: collections.name,
      collectionId: products.collectionId,
      parentId: collections.parentId,
      designSource: products.designSource,
      sellBox: products.sellBox,
      boxQty: products.boxQty,
      skus: sql<string>`(select coalesce(string_agg(v.sku, ' '), '') from ${variants} v where v.product_id = ${products.id})`,
      designs: sql<number>`(select count(*)::int from ${variants} v where v.product_id = ${products.id})`,
      stock: sql<number>`(select coalesce(sum(v.stock), 0)::int from ${variants} v where v.product_id = ${products.id} and v.active)`,
      fromCents: sql<
        number | null
      >`(select min(v.price_cents) from ${variants} v where v.product_id = ${products.id} and v.active)`,
    })
    .from(products)
    .innerJoin(collections, eq(collections.id, products.collectionId))
    .orderBy(asc(products.sortOrder), asc(products.name));
}

/** Every design in any box: set-box contents and blind-box pools. */
const boxContents = sql`(select bundle_id, variant_id from bundle_items union select bundle_id, variant_id from bundle_pool)`;

export async function getProduct(db: Db, id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return null;
  const tagRows = await db
    .select({ tagId: productTags.tagId })
    .from(productTags)
    .where(eq(productTags.productId, id));
  const designs = await db
    .select()
    .from(variants)
    .where(eq(variants.productId, id))
    .orderBy(asc(variants.sortOrder), asc(variants.name));
  // Phase 12: boxes holding this product follow its Test tick (the form warns before a change).
  const boxes = await db
    .select({ id: bundles.id, name: bundles.name, active: bundles.active })
    .from(bundles)
    .where(
      sql`${bundles.id} in (select c.bundle_id from ${boxContents} c join ${variants} v on v.id = c.variant_id where v.product_id = ${id})`,
    )
    .orderBy(asc(bundles.name));
  return { product, designs, boxes, tagIds: tagRows.map((r) => r.tagId) };
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

async function slugTaken(
  db: Db,
  table: typeof products | typeof bundles | typeof collections,
  value: string,
  id?: string,
) {
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(id ? and(eq(table.slug, value), ne(table.id, id)) : eq(table.slug, value));
  return rows.length > 0;
}

export async function saveProduct(db: Db, input: ProductInput, id?: string): Promise<SaveResult> {
  const value = input.slug || slugify(input.name);
  if (!value) return { ok: false, error: "Give it a name with letters or numbers." };
  if (await slugTaken(db, products, value, id))
    return { ok: false, error: `The web address “${value}” is already used.` };
  const { tagIds, ...fields } = input;
  const row = { ...fields, slug: value };
  // Phase 11: a box must cost less than buying its pieces singly (so "Save $x" is true).
  if (id && input.sellBox && input.boxQty && input.boxPriceCents) {
    const prices = await db
      .select({ priceCents: variants.priceCents })
      .from(variants)
      .where(and(eq(variants.productId, id), eq(variants.active, true)));
    const cheapest = Math.min(...prices.map((p) => p.priceCents));
    if (prices.length && input.boxPriceCents >= cheapest * input.boxQty)
      return {
        ok: false,
        error: `The box price must be less than ${input.boxQty} singles (${formatAud(cheapest * input.boxQty)}).`,
      };
  }
  // Phase 12: a box holding only test designs is a test box; a box can't mix test and real.
  if (id) {
    const mixed = await db
      .select({ name: bundles.name })
      .from(bundles)
      .where(
        sql`${bundles.id} in (select c.bundle_id from ${boxContents} c join ${variants} v on v.id = c.variant_id where v.product_id = ${id})
          and exists (select 1 from ${boxContents} c join ${variants} v on v.id = c.variant_id join ${products} p on p.id = v.product_id
            where c.bundle_id = "bundles"."id" and p.id <> ${id} and p.is_test <> ${input.isTest})`,
      )
      .limit(1);
    if (mixed.length)
      return {
        ok: false,
        error: input.isTest
          ? `The box “${mixed[0].name}” also has real designs. Take ${input.name} out of it before making it a test product.`
          : `The box “${mixed[0].name}” also has test designs. Take ${input.name} out of it before making it a real product.`,
      };
  }
  return db.transaction(async (tx): Promise<SaveResult> => {
    let productId = id;
    if (id) {
      const updated = await tx
        .update(products)
        .set(row)
        .where(eq(products.id, id))
        .returning({ id: products.id });
      if (!updated.length) return { ok: false, error: "Product not found." };
    } else {
      const [created] = await tx.insert(products).values(row).returning({ id: products.id });
      productId = created.id;
    }
    // Tags: replace the set (unknown ids are ignored).
    const known = tagIds.length
      ? await tx.select({ id: tags.id }).from(tags).where(inArray(tags.id, tagIds))
      : [];
    await tx.delete(productTags).where(eq(productTags.productId, productId!));
    if (known.length)
      await tx
        .insert(productTags)
        .values(known.map((t) => ({ productId: productId!, tagId: t.id })));
    return { ok: true, id: productId! };
  });
}

// ---------- designs (variants) ----------

export const designInput = z
  .object({
    name: z.string().trim().min(1).max(60),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,40}$/, "SKU: capitals, numbers and dashes (3–40)"),
    price: money,
    compareAt: optionalMoney,
    lowStockAt: z.coerce.number().int().min(0).max(1000),
    weightGrams: z.coerce.number().int().min(0).max(30_000),
    image: imagePath.nullable(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    active: z.boolean(),
  })
  .refine((d) => d.compareAt === null || d.compareAt > d.price, {
    message: "“Was” price must be higher than the price",
    path: ["compareAt"],
  });
export type DesignInput = z.infer<typeof designInput>;

/** New designs start with 0 stock; add stock with “Receive shipment”. */
export async function saveDesign(
  db: Db,
  productId: string,
  input: DesignInput,
  id?: string,
): Promise<SaveResult> {
  const skuRows = await db
    .select({ id: variants.id })
    .from(variants)
    .where(
      id ? and(eq(variants.sku, input.sku), ne(variants.id, id)) : eq(variants.sku, input.sku),
    );
  if (skuRows.length) return { ok: false, error: `SKU ${input.sku} is already used.` };

  const row = {
    name: input.name,
    sku: input.sku,
    priceCents: input.price,
    compareAtCents: input.compareAt,
    lowStockAt: input.lowStockAt,
    weightGrams: input.weightGrams,
    imagePath: input.image,
    sortOrder: input.sortOrder,
    active: input.active,
  };
  if (id) {
    const updated = await db
      .update(variants)
      .set(row)
      .where(and(eq(variants.id, id), eq(variants.productId, productId)))
      .returning({ id: variants.id });
    return updated.length ? { ok: true, id } : { ok: false, error: "Design not found." };
  }
  // The slug (`?v=` in links) is fixed once created, so shared links keep working.
  const base = slugify(input.name) || "design";
  const taken = new Set(
    (
      await db
        .select({ slug: variants.slug })
        .from(variants)
        .where(eq(variants.productId, productId))
    ).map((r) => r.slug),
  );
  let value = base;
  for (let n = 2; taken.has(value); n++) value = `${base}-${n}`;
  const [created] = await db
    .insert(variants)
    .values({ ...row, productId, slug: value, stock: 0 })
    .returning({ id: variants.id });
  return { ok: true, id: created.id };
}

// ---------- boxes ----------

export const boxInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    slug: slug.optional(),
    description: z.string().trim().max(2000),
    type: z.enum(["fixed", "mystery"]),
    price: money,
    pickCount: z.coerce.number().int().min(1).max(20).nullable(),
    images: z.array(imagePath).max(12),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    active: z.boolean(),
    /** Fixed: contents with qty. Mystery: the pool (qty ignored). */
    items: z
      .array(z.object({ variantId: z.uuid(), qty: z.coerce.number().int().min(1).max(20) }))
      .max(50),
  })
  .superRefine((b, ctx) => {
    if (b.items.length === 0)
      ctx.addIssue({ code: "custom", message: "Add at least one design", path: ["items"] });
    if (new Set(b.items.map((i) => i.variantId)).size !== b.items.length)
      ctx.addIssue({ code: "custom", message: "Each design only once", path: ["items"] });
    if (b.type === "mystery") {
      if (!b.pickCount)
        ctx.addIssue({
          code: "custom",
          message: "How many designs per blind box?",
          path: ["pickCount"],
        });
      else if (b.items.length < b.pickCount)
        ctx.addIssue({
          code: "custom",
          message: "The pool needs at least as many designs as the box holds",
          path: ["items"],
        });
    }
  });
export type BoxInput = z.infer<typeof boxInput>;

export async function listBoxes(db: Db) {
  return db
    .select({
      id: bundles.id,
      name: bundles.name,
      type: bundles.type,
      priceCents: bundles.priceCents,
      pickCount: bundles.pickCount,
      active: bundles.active,
      image: sql<string | null>`${bundles.images}[1]`,
      /** Phase 12: holds test designs (then only test designs), so preview only. */
      isTest: sql<boolean>`exists (select 1 from ${boxContents} c join ${variants} v on v.id = c.variant_id join ${products} p on p.id = v.product_id where c.bundle_id = "bundles"."id" and p.is_test)`,
    })
    .from(bundles)
    .orderBy(asc(bundles.sortOrder), asc(bundles.name));
}

export async function getBox(db: Db, id: string) {
  const [box] = await db.select().from(bundles).where(eq(bundles.id, id));
  if (!box) return null;
  const items =
    box.type === "fixed"
      ? await db
          .select({ variantId: bundleItems.variantId, qty: bundleItems.qty })
          .from(bundleItems)
          .where(eq(bundleItems.bundleId, id))
      : (
          await db
            .select({ variantId: bundlePool.variantId })
            .from(bundlePool)
            .where(eq(bundlePool.bundleId, id))
        ).map((r) => ({ ...r, qty: 1 }));
  return { box, items };
}

/** The box type can't change once created (past orders were packed as that type). */
export async function saveBox(db: Db, input: BoxInput, id?: string): Promise<SaveResult> {
  const value = input.slug || slugify(input.name);
  if (!value) return { ok: false, error: "Give it a name with letters or numbers." };
  if (await slugTaken(db, bundles, value, id))
    return { ok: false, error: `The web address “${value}” is already used.` };
  // Phase 12: all test designs (a test box, preview only) or none. A mixed box can't be bought
  // anywhere: production hides it and preview only sells test designs.
  const kinds = await db
    .selectDistinct({ isTest: products.isTest })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(
      inArray(
        variants.id,
        input.items.map((i) => i.variantId),
      ),
    );
  if (kinds.length > 1) return { ok: false, error: "A box can't mix test and real designs." };
  return db.transaction(async (tx) => {
    const row = {
      name: input.name,
      slug: value,
      description: input.description,
      priceCents: input.price,
      pickCount: input.type === "mystery" ? input.pickCount : null,
      images: input.images,
      sortOrder: input.sortOrder,
      active: input.active,
    };
    let boxId = id;
    if (id) {
      const [existing] = await tx
        .select({ type: bundles.type })
        .from(bundles)
        .where(eq(bundles.id, id));
      if (!existing) return { ok: false as const, error: "Box not found." };
      if (existing.type !== input.type)
        return { ok: false as const, error: "A box's type can't change. Make a new box instead." };
      await tx.update(bundles).set(row).where(eq(bundles.id, id));
    } else {
      [{ id: boxId }] = await tx
        .insert(bundles)
        .values({ ...row, type: input.type })
        .returning({ id: bundles.id });
    }
    const bundleId = boxId!;
    if (input.type === "fixed") {
      await tx.delete(bundleItems).where(eq(bundleItems.bundleId, bundleId));
      await tx
        .insert(bundleItems)
        .values(input.items.map((i) => ({ bundleId, variantId: i.variantId, qty: i.qty })));
    } else {
      await tx.delete(bundlePool).where(eq(bundlePool.bundleId, bundleId));
      await tx
        .insert(bundlePool)
        .values(input.items.map((i) => ({ bundleId, variantId: i.variantId })));
    }
    return { ok: true as const, id: bundleId };
  });
}

// ---------- collections ----------

export const collectionInput = z.object({
  name: z.string().trim().min(2).max(60),
  slug: slug.optional(),
  /** Null: a top-level category. Else the category this subcategory sits in (Phase 8 D1). */
  parentId: z.uuid().nullable(),
  description: z.string().trim().max(500),
  image: imagePath.nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  active: z.boolean(),
});
export type CollectionInput = z.infer<typeof collectionInput>;

export async function listCollections(db: Db) {
  return db
    .select({
      id: collections.id,
      name: collections.name,
      slug: collections.slug,
      description: collections.description,
      imagePath: collections.imagePath,
      parentId: collections.parentId,
      sortOrder: collections.sortOrder,
      active: collections.active,
      products: sql<number>`(select count(*)::int from ${products} p where p.collection_id = "collections"."id")` /* qualified: one-table query */,
    })
    .from(collections)
    .orderBy(asc(collections.sortOrder), asc(collections.name));
}

export async function saveCollection(
  db: Db,
  input: CollectionInput,
  id?: string,
): Promise<SaveResult> {
  const value = input.slug || slugify(input.name);
  if (!value) return { ok: false, error: "Give it a name with letters or numbers." };
  if (await slugTaken(db, collections, value, id))
    return { ok: false, error: `The web address “${value}” is already used.` };
  if (input.parentId) {
    // Two levels only: the parent must be top-level, and a category with subcategories
    // can't itself move under another.
    if (input.parentId === id) return { ok: false, error: "A collection can't sit inside itself." };
    const [parent] = await db
      .select({ parentId: collections.parentId })
      .from(collections)
      .where(eq(collections.id, input.parentId));
    if (!parent) return { ok: false, error: "That category doesn't exist." };
    if (parent.parentId)
      return { ok: false, error: "Pick a top-level category (only two levels)." };
    if (id) {
      const kids = await db
        .select({ id: collections.id })
        .from(collections)
        .where(eq(collections.parentId, id))
        .limit(1);
      if (kids.length)
        return {
          ok: false,
          error: "This one has subcategories, so it has to stay top-level.",
        };
    }
  }
  const row = {
    name: input.name,
    slug: value,
    parentId: input.parentId,
    description: input.description,
    imagePath: input.image,
    sortOrder: input.sortOrder,
    active: input.active,
  };
  if (id) {
    const updated = await db
      .update(collections)
      .set(row)
      .where(eq(collections.id, id))
      .returning({ id: collections.id });
    return updated.length ? { ok: true, id } : { ok: false, error: "Collection not found." };
  }
  const [created] = await db.insert(collections).values(row).returning({ id: collections.id });
  return { ok: true, id: created.id };
}

/** Every design, for the box editor's picker. */
export async function allDesigns(db: Db) {
  return db
    .select({
      id: variants.id,
      sku: variants.sku,
      name: variants.name,
      productName: products.name,
      priceCents: variants.priceCents,
      stock: variants.stock,
      active: sql<boolean>`${variants.active} and ${products.active}`,
      isTest: products.isTest,
      designs: sql<number>`(select count(*)::int from ${variants} v2 where v2.product_id = ${products.id})`,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .orderBy(asc(products.name), asc(variants.sortOrder));
}

// ---------- tags (Phase 8 D3) ----------

export const tagInput = z.object({
  name: z.string().trim().min(1).max(40),
  slug: slug.optional(),
  group: z.string().trim().min(1, "Give it a group, e.g. Size").max(30),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  active: z.boolean(),
});
export type TagInput = z.infer<typeof tagInput>;

export async function listTags(db: Db) {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      group: tags.groupName,
      sortOrder: tags.sortOrder,
      active: tags.active,
      products: sql<number>`(select count(*)::int from ${productTags} pt where pt.tag_id = "tags"."id")` /* qualified: one-table query */,
    })
    .from(tags)
    .orderBy(asc(tags.groupName), asc(tags.sortOrder), asc(tags.name));
}

export async function saveTag(db: Db, input: TagInput, id?: string): Promise<SaveResult> {
  const value = input.slug || slugify(input.name);
  if (!value) return { ok: false, error: "Give it a name with letters or numbers." };
  const taken = await db
    .select({ id: tags.id })
    .from(tags)
    .where(id ? and(eq(tags.slug, value), ne(tags.id, id)) : eq(tags.slug, value));
  if (taken.length) return { ok: false, error: `The tag “${value}” already exists.` };
  const row = {
    name: input.name,
    slug: value,
    groupName: input.group,
    sortOrder: input.sortOrder,
    active: input.active,
  };
  if (id) {
    const updated = await db
      .update(tags)
      .set(row)
      .where(eq(tags.id, id))
      .returning({ id: tags.id });
    return updated.length ? { ok: true, id } : { ok: false, error: "Tag not found." };
  }
  const [created] = await db.insert(tags).values(row).returning({ id: tags.id });
  return { ok: true, id: created.id };
}
