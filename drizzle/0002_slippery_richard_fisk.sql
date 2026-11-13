CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'packed', 'shipped', 'cancelled', 'refunded');--> statement-breakpoint
ALTER TYPE "public"."stock_reason" ADD VALUE 'reserved';--> statement-breakpoint
ALTER TYPE "public"."stock_reason" ADD VALUE 'released';--> statement-breakpoint
CREATE TABLE "order_item_contents" (
	"order_item_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"qty" integer NOT NULL,
	CONSTRAINT "order_item_contents_order_item_id_variant_id_pk" PRIMARY KEY("order_item_id","variant_id"),
	CONSTRAINT "order_item_contents_qty_check" CHECK ("order_item_contents"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"bundle_id" uuid,
	"name" text NOT NULL,
	"variant_name" text,
	"unit_price_cents" integer NOT NULL,
	"qty" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_items_qty_check" CHECK ("order_items"."qty" > 0),
	CONSTRAINT "order_items_price_check" CHECK ("order_items"."unit_price_cents" >= 0),
	CONSTRAINT "order_items_item_check" CHECK (num_nonnulls("order_items"."variant_id", "order_items"."bundle_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"email" text,
	"customer_name" text,
	"phone" text,
	"shipping_address" jsonb,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"shipping_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"gst_cents" integer NOT NULL,
	"promo_code" text,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "orders_money_check" CHECK ("orders"."subtotal_cents" >= 0 and "orders"."discount_cents" >= 0 and "orders"."shipping_cents" >= 0 and "orders"."total_cents" >= 0 and "orders"."gst_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "order_item_contents" ADD CONSTRAINT "order_item_contents_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_contents" ADD CONSTRAINT "order_item_contents_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_expires_idx" ON "orders" USING btree ("status","expires_at");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movements_order_idx" ON "stock_movements" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_item_contents" ENABLE ROW LEVEL SECURITY;
