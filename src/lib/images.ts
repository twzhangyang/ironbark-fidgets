/**
 * Turns a Storage path (as saved in the database, e.g. `catalog/melon-bun.webp`) into a
 * public URL. The one place to change if photos move to a CDN.
 */
export const IMAGE_BUCKET = "product-images";

export function imageUrl(path: string): string {
  if (!path) return "";
  if (/^(https?:)?\//.test(path)) return path; // already a URL or a /public file
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. See .env.example.");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}
