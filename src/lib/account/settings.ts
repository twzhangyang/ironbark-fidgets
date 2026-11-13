/** Email preferences for a customer (Phase 7 D7). Takes `db`. */
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/lib/db/schema";

type Db = PostgresJsDatabase<typeof schema>;
const { bundles, emailOptouts, products, subscribers, variants } = schema;

export type Preference = {
  id: string;
  kind: "waitlist" | "back_in_stock";
  item: string | null;
  on: boolean;
  /** Back-in-stock alert already sent (one per sign-up). */
  sent: boolean;
};

export async function listPreferences(db: Db, email: string): Promise<Preference[]> {
  const rows = await db
    .select({
      id: subscribers.id,
      kind: subscribers.kind,
      unsubscribedAt: subscribers.unsubscribedAt,
      notifiedAt: subscribers.notifiedAt,
      product: products.name,
      variant: variants.name,
      box: bundles.name,
    })
    .from(subscribers)
    .leftJoin(variants, eq(variants.id, subscribers.variantId))
    .leftJoin(products, eq(products.id, variants.productId))
    .leftJoin(bundles, eq(bundles.id, subscribers.bundleId))
    .where(eq(subscribers.email, email))
    .orderBy(subscribers.createdAt);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    item:
      r.box ??
      (r.product
        ? r.variant && r.variant !== "Default"
          ? `${r.product} (${r.variant})`
          : r.product
        : null),
    on: r.unsubscribedAt === null,
    sent: r.notifiedAt !== null,
  }));
}

/** Turns one sign-up on or off. Only the customer's own rows match. */
export async function setPreference(db: Db, email: string, id: string, on: boolean) {
  const rows = await db
    .update(subscribers)
    .set(on ? { unsubscribedAt: null, consentAt: new Date() } : { unsubscribedAt: new Date() })
    .where(and(eq(subscribers.id, id), eq(subscribers.email, email)))
    .returning({ id: subscribers.id });
  return rows.length > 0;
}

/** Same as the unsubscribe link: every marketing email off. */
export async function stopAllMarketing(db: Db, email: string) {
  await db
    .update(subscribers)
    .set({ unsubscribedAt: new Date() })
    .where(and(eq(subscribers.email, email), isNull(subscribers.unsubscribedAt)));
  await db.insert(emailOptouts).values({ email }).onConflictDoNothing();
}

/**
 * Account deletion (D8): marketing sign-ups go; orders stay (tax records). An opt-out stays
 * too, so we keep honouring it.
 */
export async function deleteMarketingData(db: Db, email: string) {
  await db.delete(subscribers).where(eq(subscribers.email, email));
}
