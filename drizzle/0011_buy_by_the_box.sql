ALTER TABLE "order_items" ADD COLUMN "box_qty" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sell_box" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "box_qty" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "box_price_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "mixed_box" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_box_check" CHECK (not "products"."sell_box" or ("products"."box_qty" >= 2 and "products"."box_price_cents" > 0));