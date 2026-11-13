ALTER TABLE "orders" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_test" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Phase 12: every order so far was paid with Stripe test keys (before launch).
UPDATE "orders" SET "is_test" = true;
