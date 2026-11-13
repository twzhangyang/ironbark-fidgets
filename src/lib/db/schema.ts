/**
 * Database schema (Drizzle). Money is integer cents (AUD, GST-inclusive); timestamps are
 * timestamptz. Image columns hold Supabase Storage paths in the `product-images` bucket,
 * turned into URLs by `src/lib/images.ts`.
 *
 * After editing: `pnpm db:generate` then `pnpm db:migrate`. Previews share the production
 * database, so every migration must work with the previous code (add now, drop later).
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const bundleType = pgEnum("bundle_type", ["fixed", "mystery"]);
export const stockReason = pgEnum("stock_reason", [
  "received",
  "sold",
  "refunded",
  "adjusted",
  "mystery_pick",
  // Phase 3: checkout takes stock off the shelf (reserved); expiry / Back puts it back.
  "reserved",
  "released",
]);
export const subscriberKind = pgEnum("subscriber_kind", ["waitlist", "back_in_stock"]);
export const reviewStatus = pgEnum("review_status", ["published", "hidden"]);
/** Phase 8 D10: our own/generic design, or official licensed merchandise (needs a note). */
/** Australia Post parcel (standard) or Express Post, chosen in Stripe Checkout. */
export const shippingMethod = pgEnum("shipping_method", ["standard", "express"]);
export const designSource = pgEnum("design_source", ["original", "licensed"]);
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "packed",
  "shipped",
  "cancelled",
  "refunded",
]);

/**
 * Categories (no parent) and subcategories (parent = a category). Two levels only, checked in
 * the admin (Phase 8 D1).
 */
export const collections = pgTable(
  "collections",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    imagePath: text("image_path"),
    parentId: uuid("parent_id").references((): AnyPgColumn => collections.id),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("collections_parent_idx").on(t.parentId),
    check(
      "collections_not_own_parent_check",
      sql`${t.parentId} is null or ${t.parentId} <> ${t.id}`,
    ),
  ],
);

/** Cross-category labels for filters (Phase 8 D3), e.g. group "Size", name "Mini". */
export const tags = pgTable("tags", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  groupName: text("group_name").notNull().default("Extras"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const products = pgTable(
  "products",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    material: text("material").notNull(),
    sizeLabel: text("size_label").notNull().default(""),
    ageMin: integer("age_min").notNull().default(8),
    badges: text("badges")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    images: text("images")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Phase 10: YouTube video ID (11 characters), shown above the reviews. Null = no video. */
    youtubeId: text("youtube_id"),
    /** Phase 10 D8: a Short (9:16) or a wide (16:9) video. */
    videoVertical: boolean("video_vertical").notNull().default(true),
    /**
     * Phase 11: customers can also buy a full supplier box (display box) of `boxQty` pieces for
     * `boxPriceCents`. The numbers are kept when the tick is off, so it can be switched back on.
     */
    sellBox: boolean("sell_box").notNull().default(false),
    boxQty: integer("box_qty"),
    boxPriceCents: integer("box_price_cents"),
    /** The box holds mixed colours/designs, so a single is a random one. */
    mixedBox: boolean("mixed_box").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    /**
     * Phase 12: for testing only. Never shown or sold on production; on preview and the laptop
     * it shows with a TEST badge and is the only thing that can be bought.
     */
    isTest: boolean("is_test").notNull().default(false),
    designSource: designSource("design_source").notNull().default("original"),
    /** Licensed products: brand, supplier, invoice number. Admin only. */
    licenceNote: text("licence_note").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_collection_idx").on(t.collectionId),
    check("products_age_min_check", sql`${t.ageMin} >= 3`),
    check(
      "products_box_check",
      sql`not ${t.sellBox} or (${t.boxQty} >= 2 and ${t.boxPriceCents} > 0)`,
    ),
  ],
);

export const productTags = pgTable(
  "product_tags",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.tagId] }),
    index("product_tags_tag_idx").on(t.tagId),
  ],
);

export const variants = pgTable(
  "variants",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    /** Units on the shelf. Change only together with a stock_movements row. */
    stock: integer("stock").notNull().default(0),
    lowStockAt: integer("low_stock_at").notNull().default(3),
    weightGrams: integer("weight_grams").notNull().default(0),
    imagePath: text("image_path"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("variants_product_slug_idx").on(t.productId, t.slug),
    check("variants_price_check", sql`${t.priceCents} > 0`),
    check(
      "variants_compare_at_check",
      sql`${t.compareAtCents} is null or ${t.compareAtCents} > ${t.priceCents}`,
    ),
    // Overselling is impossible even if app code has a bug.
    check("variants_stock_check", sql`${t.stock} >= 0`),
    check("variants_weight_check", sql`${t.weightGrams} >= 0`),
  ],
);

export const bundles = pgTable(
  "bundles",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    type: bundleType("type").notNull(),
    priceCents: integer("price_cents").notNull(),
    /** Mystery boxes only: how many items are picked from the pool. */
    pickCount: integer("pick_count"),
    images: text("images")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("bundles_price_check", sql`${t.priceCents} > 0`),
    check(
      "bundles_pick_count_check",
      sql`(${t.type} = 'mystery' and ${t.pickCount} > 0) or (${t.type} = 'fixed' and ${t.pickCount} is null)`,
    ),
  ],
);

/** Fixed box contents. */
export const bundleItems = pgTable(
  "bundle_items",
  {
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => bundles.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id),
    qty: integer("qty").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.bundleId, t.variantId] }),
    check("bundle_items_qty_check", sql`${t.qty} > 0`),
  ],
);

/** Mystery box pool. */
export const bundlePool = pgTable(
  "bundle_pool",
  {
    bundleId: uuid("bundle_id")
      .notNull()
      .references(() => bundles.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id),
  },
  (t) => [primaryKey({ columns: [t.bundleId, t.variantId] })],
);

/** Every stock change, so `variants.stock` can always be explained. */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id),
    delta: integer("delta").notNull(),
    reason: stockReason("reason").notNull(),
    /** Set for checkout holds, their release, and refunds put back on the shelf. */
    orderId: uuid("order_id").references((): AnyPgColumn => orders.id),
    note: text("note"),
    /** Admin email for changes made in the admin (Phase 5); null for checkout/system. */
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [
    index("stock_movements_variant_idx").on(t.variantId, t.createdAt),
    index("stock_movements_order_idx").on(t.orderId),
    check("stock_movements_delta_check", sql`${t.delta} <> 0`),
  ],
);

export const subscribers = pgTable(
  "subscribers",
  {
    id: id(),
    /** Always stored lowercase. */
    email: text("email").notNull(),
    kind: subscriberKind("kind").notNull(),
    variantId: uuid("variant_id").references(() => variants.id, { onDelete: "set null" }),
    bundleId: uuid("bundle_id").references(() => bundles.id, { onDelete: "set null" }),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    /** Back-in-stock alert sent (one per sign-up). */
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    /** Launch email sent (waitlist). */
    launchSentAt: timestamp("launch_sent_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    // One sign-up per email + kind + item. NULLs count as equal, so "waitlist" is one row.
    unique("subscribers_unique").on(t.email, t.kind, t.variantId, t.bundleId).nullsNotDistinct(),
    check("subscribers_email_lower_check", sql`${t.email} = lower(${t.email})`),
    check(
      "subscribers_item_check",
      sql`(${t.kind} = 'waitlist' and ${t.variantId} is null and ${t.bundleId} is null) or (${t.kind} = 'back_in_stock' and num_nonnulls(${t.variantId}, ${t.bundleId}) = 1)`,
    ),
  ],
);

/** Australian shipping address, as collected by Stripe Checkout. */
export type ShippingAddress = {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

export const orders = pgTable(
  "orders",
  {
    id: id(),
    /** `IB-YYMMDD-NNNN` (Melbourne date the checkout started). */
    orderNumber: text("order_number").notNull().unique(),
    status: orderStatus("status").notNull().default("pending"),
    // Customer details come from Stripe on payment (null while pending).
    email: text("email"),
    customerName: text("customer_name"),
    phone: text("phone"),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>(),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    shippingCents: integer("shipping_cents").notNull(),
    shippingMethod: shippingMethod("shipping_method").notNull().default("standard"),
    totalCents: integer("total_cents").notNull(),
    /** GST included in the total (total ÷ 11), for the books. */
    gstCents: integer("gst_cents").notNull(),
    promoCode: text("promo_code"),
    stripeSessionId: text("stripe_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    /** When an unpaid hold is released. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    // Phase 4 emails: each is sent once; the timestamp says it went.
    confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true }),
    ownerAlertSentAt: timestamp("owner_alert_sent_at", { withTimezone: true }),
    /** Australia Post tracking number (set by the admin in Phase 5). */
    trackingNumber: text("tracking_number"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    shippedEmailSentAt: timestamp("shipped_email_sent_at", { withTimezone: true }),
    /** Phase 7: "How are your squishies?" sent (once per order). */
    reviewRequestSentAt: timestamp("review_request_sent_at", { withTimezone: true }),
    // Phase 5 admin.
    packedAt: timestamp("packed_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    stripeRefundId: text("stripe_refund_id"),
    /** Phase 12: paid with Stripe test keys (`TEST-…` number). Left out of sales and reports. */
    isTest: boolean("is_test").notNull().default(false),
    /** Phase 14: the customer's optional note from Stripe Checkout (plain text, ≤ 255). */
    customerNote: text("customer_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_status_expires_idx").on(t.status, t.expiresAt),
    index("orders_payment_intent_idx").on(t.stripePaymentIntentId),
    // Phase 7: a customer's orders by verified email.
    index("orders_email_idx").on(t.email),
    check(
      "orders_money_check",
      sql`${t.subtotalCents} >= 0 and ${t.discountCents} >= 0 and ${t.shippingCents} >= 0 and ${t.totalCents} >= 0 and ${t.gstCents} >= 0`,
    ),
  ],
);

/** One cart line: a single design or a box. Name and price are copied at checkout. */
export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => variants.id),
    bundleId: uuid("bundle_id").references(() => bundles.id),
    name: text("name").notNull(),
    /** Design name for singles ("Tabby"); null for boxes and one-design products. */
    variantName: text("variant_name"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    qty: integer("qty").notNull(),
    /** Phase 11: pieces per unit of `qty`: 1 for a single, e.g. 12 for a full box. */
    boxQty: integer("box_qty").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_qty_check", sql`${t.qty} > 0`),
    check("order_items_price_check", sql`${t.unitPriceCents} >= 0`),
    check("order_items_item_check", sql`num_nonnulls(${t.variantId}, ${t.bundleId}) = 1`),
  ],
);

/** What to pack for a line: the design itself, a box's components, or blind-box picks. */
export const orderItemContents = pgTable(
  "order_item_contents",
  {
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id),
    qty: integer("qty").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.orderItemId, t.variantId] }),
    check("order_item_contents_qty_check", sql`${t.qty} > 0`),
  ],
);

/**
 * Product reviews (Phase 7). Verified buyers only: one per email per product (or box), linked to
 * the shipped order that made it eligible. Every genuine review is published (ACCC); the owner
 * can hide one only with a reason. Photos show once the owner approves them.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    productId: uuid("product_id").references(() => products.id),
    bundleId: uuid("bundle_id").references(() => bundles.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    /** Always lowercase; the reviewer's verified sign-in email. Never shown. */
    email: text("email").notNull(),
    /** "Mia K.", fixed when written or edited. */
    displayName: text("display_name").notNull(),
    rating: integer("rating").notNull(),
    title: text("title").notNull().default(""),
    body: text("body").notNull(),
    photoPath: text("photo_path"),
    photoApproved: boolean("photo_approved").notNull().default(false),
    status: reviewStatus("status").notNull().default("published"),
    hiddenReason: text("hidden_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("reviews_one_per_item").on(t.email, t.productId, t.bundleId).nullsNotDistinct(),
    index("reviews_product_idx").on(t.productId, t.status),
    index("reviews_bundle_idx").on(t.bundleId, t.status),
    check("reviews_item_check", sql`num_nonnulls(${t.productId}, ${t.bundleId}) = 1`),
    check("reviews_rating_check", sql`${t.rating} between 1 and 5`),
    check("reviews_email_lower_check", sql`${t.email} = lower(${t.email})`),
    check(
      "reviews_hidden_reason_check",
      sql`(${t.status} = 'hidden') = (${t.hiddenReason} is not null)`,
    ),
  ],
);

export type CollectionRow = typeof collections.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type VariantRow = typeof variants.$inferSelect;
export type BundleRow = typeof bundles.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type SubscriberRow = typeof subscribers.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;

/**
 * Emails that said "no more marketing" (unsubscribe link or account settings). Covers people
 * with no subscriber row too, e.g. a buyer unsubscribing from a review request. Kept after
 * account deletion so the opt-out is still honoured (Spam Act).
 */
export const emailOptouts = pgTable(
  "email_optouts",
  {
    email: text("email").primaryKey(),
    createdAt: createdAt(),
  },
  (t) => [check("email_optouts_email_lower_check", sql`${t.email} = lower(${t.email})`)],
);
