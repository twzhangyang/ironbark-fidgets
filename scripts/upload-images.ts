/**
 * Uploads product photos to the public `product-images` bucket. Skips files already there.
 *   pnpm images:upload [dir] [prefix]   (default .images/sample → catalog/)
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.
 */
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { IMAGE_BUCKET } from "../src/lib/images";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

async function main() {
  const dir = process.argv[2] ?? join(".images", "sample");
  const prefix = (process.argv[3] ?? "catalog").replace(/\/$/, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const bucket = supabase.storage.from(IMAGE_BUCKET);

  const { data: existing, error: listError } = await bucket.list(prefix, { limit: 1000 });
  if (listError) throw new Error(`list failed: ${listError.message}`);
  const there = new Set(existing.map((f) => f.name));

  const files = (await readdir(dir)).filter((f) => TYPES[extname(f).toLowerCase()]);
  let uploaded = 0;
  for (const file of files) {
    if (there.has(file)) continue;
    const { error } = await bucket.upload(`${prefix}/${file}`, await readFile(join(dir, file)), {
      contentType: TYPES[extname(file).toLowerCase()],
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(`${file}: ${error.message}`);
    uploaded++;
  }
  console.log(`✓ ${uploaded} uploaded, ${files.length - uploaded} already there (${prefix}/)`);
}

main().catch((error: Error) => {
  console.error("✗ upload failed:", error.message);
  process.exitCode = 1;
});
