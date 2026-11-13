ALTER TABLE "products" ADD COLUMN "youtube_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "video_vertical" boolean DEFAULT true NOT NULL;