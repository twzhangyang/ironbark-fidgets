import { z } from "zod";

/** Public Storage bucket for product photos (created in the Supabase dashboard). */
export const PRODUCT_IMAGES_BUCKET = "product-images";

const supabaseEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

/** Public Supabase project settings (safe for the browser: auth and photo uploads). */
export function getSupabaseConfig(): { url: string; key: string } {
  const result = supabaseEnv.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!result.success)
    throw new Error("Supabase URL or publishable key is missing. See .env.local.");
  return {
    url: result.data.NEXT_PUBLIC_SUPABASE_URL,
    key: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
