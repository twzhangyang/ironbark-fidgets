import "server-only";

import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { IMAGE_BUCKET } from "@/lib/images";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type StoredPhoto = { path: string; error?: undefined } | { path?: undefined; error: string };

/**
 * One photo → WebP (max 1600px, EXIF rotation applied and metadata dropped), saved under
 * `<folder>/<uuid>.webp` in the public images bucket. Callers check who may upload.
 */
export async function storePhoto(
  file: unknown,
  folder: "catalog" | "reviews",
): Promise<StoredPhoto> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return { error: "JPEG, PNG or WebP only." };
  if (file.size > 4 * 1024 * 1024) return { error: "Photo is too big (max 4 MB)." };
  let body: Buffer;
  try {
    body = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "That file couldn't be read as a photo." };
  }
  const path = `${folder}/${randomUUID()}.webp`;
  const { error } = await getSupabaseAdmin()
    .storage.from(IMAGE_BUCKET)
    .upload(path, body, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) {
    console.error("photo upload failed", error.message);
    return { error: "Upload failed. Try again." };
  }
  return { path };
}

/** Removes customer review photos we no longer use. Failures are logged, never thrown. */
export async function removeReviewPhotos(paths: (string | null | undefined)[]) {
  const own = paths.filter((p): p is string => !!p && /^reviews\/[0-9a-f-]{36}\.webp$/.test(p));
  if (own.length === 0) return;
  const { error } = await getSupabaseAdmin().storage.from(IMAGE_BUCKET).remove(own);
  if (error) console.warn("review photo not removed", error.message);
}
