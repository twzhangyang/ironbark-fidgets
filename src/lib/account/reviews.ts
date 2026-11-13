/**
 * Reviews (Phase 7 D9–D11). Verified buyers only: a product or box can be reviewed once per
 * email, after an order containing it was shipped. Takes `db`.
 */
import { and, desc, eq, inArray, isNotNull, type SQL, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";

import type { HideReason } from "@/lib/account/review-rules";
import * as schema from "@/lib/db/schema";

type Db = PostgresJsDatabase<typeof schema>;
const { bundles, orderItems, orders, products, reviews, variants } = schema;

/** Orders that make their items reviewable. */
const REVIEWABLE_STATUSES = ["shipped"] as const;

/** "Mia Kelly" → "Mia K."; "mia" → "Mia"; nothing → the fallback. Never the email. */
export function reviewerName(name: string | null | undefined, fallback: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const cap = (w: string) => w.charAt(0).toLocaleUpperCase("en-AU") + w.slice(1);
  const first = cap(parts[0]);
  return parts.length === 1
    ? first
    : `${first} ${parts.at(-1)!.charAt(0).toLocaleUpperCase("en-AU")}.`;
}

export const reviewInput = z.object({
  target: z.union([
    z.object({ type: z.literal("product"), id: z.uuid() }),
    z.object({ type: z.literal("box"), id: z.uuid() }),
  ]),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(80),
  body: z.string().trim().min(10).max(1000),
  photo: z
    .string()
    .regex(/^reviews\/[0-9a-f-]{36}\.webp$/)
    .nullable(),
});
export type ReviewInput = z.infer<typeof reviewInput>;

export type ReviewTarget = ReviewInput["target"];

export type Reviewable = {
  target: ReviewTarget;
  name: string;
  image: string | null;
  orderId: string;
};

/** What this customer can still review: items from shipped orders, not reviewed yet. */
export async function reviewableItems(db: Db, email: string): Promise<Reviewable[]> {
  const rows = await db
    .select({
      orderId: orders.id,
      shippedAt: orders.shippedAt,
      productId: products.id,
      productName: products.name,
      productImage: sql<string | null>`${products.images}[1]`,
      bundleId: bundles.id,
      bundleName: bundles.name,
      bundleImage: sql<string | null>`${bundles.images}[1]`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .leftJoin(variants, eq(variants.id, orderItems.variantId))
    .leftJoin(products, eq(products.id, variants.productId))
    .leftJoin(bundles, eq(bundles.id, orderItems.bundleId))
    .where(and(eq(orders.email, email), inArray(orders.status, [...REVIEWABLE_STATUSES])))
    .orderBy(desc(orders.shippedAt));

  const done = await db
    .select({ productId: reviews.productId, bundleId: reviews.bundleId })
    .from(reviews)
    .where(eq(reviews.email, email));
  const reviewed = new Set(done.map((d) => d.productId ?? d.bundleId));

  const seen = new Set<string>();
  const out: Reviewable[] = [];
  for (const r of rows) {
    const id = r.productId ?? r.bundleId;
    if (!id || seen.has(id) || reviewed.has(id)) continue;
    seen.add(id);
    out.push(
      r.productId
        ? {
            target: { type: "product", id: r.productId },
            name: r.productName ?? "",
            image: r.productImage,
            orderId: r.orderId,
          }
        : {
            target: { type: "box", id: r.bundleId! },
            name: r.bundleName ?? "",
            image: r.bundleImage,
            orderId: r.orderId,
          },
    );
  }
  return out;
}

/** The customer's own reviews (all statuses: they can see if one was hidden, and why). */
export async function myReviews(db: Db, email: string) {
  return db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      bundleId: reviews.bundleId,
      name: sql<string>`coalesce(${products.name}, ${bundles.name})`,
      slug: sql<string>`coalesce(${products.slug}, ${bundles.slug})`,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      photoPath: reviews.photoPath,
      photoApproved: reviews.photoApproved,
      status: reviews.status,
      hiddenReason: reviews.hiddenReason,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .leftJoin(products, eq(products.id, reviews.productId))
    .leftJoin(bundles, eq(bundles.id, reviews.bundleId))
    .where(eq(reviews.email, email))
    .orderBy(desc(reviews.createdAt));
}

const targetWhere = (t: ReviewTarget) =>
  t.type === "product" ? eq(reviews.productId, t.id) : eq(reviews.bundleId, t.id);

export type SaveReviewResult =
  | { ok: true; id: string; photoPending: boolean; oldPhoto?: string | null }
  | { ok: false; error: "not_eligible" };

/**
 * Creates or edits the customer's review of one product/box. New: only if eligible. Edit: a
 * changed photo needs approval again; a hidden review stays hidden (the owner decides).
 */
export async function saveReview(
  db: Db,
  { email, displayName }: { email: string; displayName: string },
  input: ReviewInput,
): Promise<SaveReviewResult> {
  const [existing] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.email, email), targetWhere(input.target)));

  const fields = {
    displayName,
    rating: input.rating,
    title: input.title,
    body: input.body,
    photoPath: input.photo,
  };

  if (existing) {
    const samePhoto = existing.photoPath === input.photo;
    await db
      .update(reviews)
      .set({ ...fields, photoApproved: samePhoto ? existing.photoApproved : false })
      .where(eq(reviews.id, existing.id));
    return {
      ok: true,
      id: existing.id,
      photoPending: !!input.photo && !(samePhoto && existing.photoApproved),
      oldPhoto: samePhoto ? null : existing.photoPath,
    };
  }

  const eligible = (await reviewableItems(db, email)).find(
    (r) => r.target.type === input.target.type && r.target.id === input.target.id,
  );
  if (!eligible) return { ok: false, error: "not_eligible" };
  const [created] = await db
    .insert(reviews)
    .values({
      ...fields,
      email,
      orderId: eligible.orderId,
      productId: input.target.type === "product" ? input.target.id : null,
      bundleId: input.target.type === "box" ? input.target.id : null,
    })
    .returning({ id: reviews.id });
  return { ok: true, id: created.id, photoPending: !!input.photo };
}

/** Deletes the customer's own review. Returns false if not theirs; else its photo path. */
export async function deleteReview(
  db: Db,
  email: string,
  id: string,
): Promise<false | { photoPath: string | null }> {
  const [row] = await db
    .delete(reviews)
    .where(and(eq(reviews.id, id), eq(reviews.email, email)))
    .returning({ photoPath: reviews.photoPath });
  return row ?? false;
}

// ---------- shop side ----------

export type PublicReview = {
  id: string;
  displayName: string;
  rating: number;
  title: string;
  body: string;
  photoPath: string | null;
  createdAt: Date;
};

/** Published reviews for one product or box, newest first. Photos only once approved. */
export async function publicReviews(db: Db, target: ReviewTarget): Promise<PublicReview[]> {
  return (await allPublicReviews(db, targetWhere(target))).map(toPublic);
}

/** Drops the product/box ids (the page already knows which item it is). */
export function toPublic(
  r: PublicReview & { productId: string | null; bundleId: string | null },
): PublicReview {
  return {
    id: r.id,
    displayName: r.displayName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    photoPath: r.photoPath,
    createdAt: r.createdAt,
  };
}

/**
 * Every published review (newest first, capped), for one cached read that all shop pages share.
 * Photos only once approved.
 */
export async function allPublicReviews(db: Db, where?: SQL) {
  const rows = await db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      bundleId: reviews.bundleId,
      displayName: reviews.displayName,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      photoPath: reviews.photoPath,
      photoApproved: reviews.photoApproved,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(and(where, eq(reviews.status, "published")))
    .orderBy(desc(reviews.createdAt))
    .limit(5000);
  return rows.map(({ photoApproved, ...r }) => ({
    ...r,
    photoPath: photoApproved ? r.photoPath : null,
  }));
}

export type Rating = { avg: number; count: number };

/** Average and count per product and per box (published only). */
export async function allRatings(db: Db) {
  const rows = await db
    .select({
      productId: reviews.productId,
      bundleId: reviews.bundleId,
      avg: sql<number>`round(avg(${reviews.rating})::numeric, 1)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.status, "published"))
    .groupBy(reviews.productId, reviews.bundleId);
  const products = new Map<string, Rating>();
  const boxes = new Map<string, Rating>();
  for (const r of rows) {
    if (r.productId) products.set(r.productId, { avg: r.avg, count: r.count });
    else if (r.bundleId) boxes.set(r.bundleId, { avg: r.avg, count: r.count });
  }
  return { products, boxes };
}

// ---------- admin side ----------

export async function adminReviews(db: Db, filter: "photos" | "all" | "hidden") {
  return db
    .select({
      id: reviews.id,
      name: sql<string>`coalesce(${products.name}, ${bundles.name})`,
      displayName: reviews.displayName,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      photoPath: reviews.photoPath,
      photoApproved: reviews.photoApproved,
      status: reviews.status,
      hiddenReason: reviews.hiddenReason,
      createdAt: reviews.createdAt,
      orderId: reviews.orderId,
      orderNumber: orders.orderNumber,
    })
    .from(reviews)
    .innerJoin(orders, eq(orders.id, reviews.orderId))
    .leftJoin(products, eq(products.id, reviews.productId))
    .leftJoin(bundles, eq(bundles.id, reviews.bundleId))
    .where(
      filter === "photos"
        ? and(isNotNull(reviews.photoPath), eq(reviews.photoApproved, false))
        : filter === "hidden"
          ? eq(reviews.status, "hidden")
          : undefined,
    )
    .orderBy(desc(reviews.createdAt))
    .limit(200);
}

export async function photosWaiting(db: Db): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviews)
    .where(and(isNotNull(reviews.photoPath), eq(reviews.photoApproved, false)));
  return row?.n ?? 0;
}

export async function hideReview(db: Db, id: string, reason: HideReason) {
  const rows = await db
    .update(reviews)
    .set({ status: "hidden", hiddenReason: reason })
    .where(eq(reviews.id, id))
    .returning({ id: reviews.id });
  return rows.length > 0;
}

export async function unhideReview(db: Db, id: string) {
  const rows = await db
    .update(reviews)
    .set({ status: "published", hiddenReason: null })
    .where(eq(reviews.id, id))
    .returning({ id: reviews.id });
  return rows.length > 0;
}

/**
 * Approve shows the photo; reject removes it (the review text stays). Returns false if there
 * was no photo, else the path (so a rejected file can be deleted from Storage).
 */
export async function decidePhoto(
  db: Db,
  id: string,
  approve: boolean,
): Promise<false | { photoPath: string }> {
  const [row] = await db
    .select({ photoPath: reviews.photoPath })
    .from(reviews)
    .where(and(eq(reviews.id, id), isNotNull(reviews.photoPath)));
  if (!row?.photoPath) return false;
  await db
    .update(reviews)
    .set(approve ? { photoApproved: true } : { photoPath: null, photoApproved: false })
    .where(eq(reviews.id, id));
  return { photoPath: row.photoPath };
}
