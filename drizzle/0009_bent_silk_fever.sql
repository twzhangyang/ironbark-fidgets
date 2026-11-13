CREATE TYPE "public"."shipping_method" AS ENUM('standard', 'express');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_method" "shipping_method" DEFAULT 'standard' NOT NULL;