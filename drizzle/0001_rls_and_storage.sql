-- Row Level Security on every table, with NO policies: the public Supabase Data API
-- (anon / authenticated keys) can read and write nothing. The app reads through Drizzle
-- as the postgres role on the server, which bypasses RLS.
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bundles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bundle_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bundle_pool" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscribers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Product photos: a public bucket (anyone can view a photo by its URL). Uploads and
-- deletes need the secret key, which bypasses storage RLS; no storage policies are added.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
