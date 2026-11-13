CREATE TYPE "public"."review_status" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"bundle_id" uuid,
	"order_id" uuid NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"photo_path" text,
	"photo_approved" boolean DEFAULT false NOT NULL,
	"status" "review_status" DEFAULT 'published' NOT NULL,
	"hidden_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_one_per_item" UNIQUE NULLS NOT DISTINCT("email","product_id","bundle_id"),
	CONSTRAINT "reviews_item_check" CHECK (num_nonnulls("reviews"."product_id", "reviews"."bundle_id") = 1),
	CONSTRAINT "reviews_rating_check" CHECK ("reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_email_lower_check" CHECK ("reviews"."email" = lower("reviews"."email")),
	CONSTRAINT "reviews_hidden_reason_check" CHECK (("reviews"."status" = 'hidden') = ("reviews"."hidden_reason" is not null))
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "review_request_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_product_idx" ON "reviews" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "reviews_bundle_idx" ON "reviews" USING btree ("bundle_id","status");--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
