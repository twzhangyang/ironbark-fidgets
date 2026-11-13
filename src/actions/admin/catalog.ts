"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/actions/admin/orders";
import { requireAdmin } from "@/lib/admin/auth";
import {
  boxInput,
  collectionInput,
  designInput,
  productInput,
  saveBox,
  saveCollection,
  saveDesign,
  saveProduct,
  saveTag,
  tagInput,
} from "@/lib/admin/catalog";
import { db } from "@/lib/db/client";
import { storePhoto } from "@/lib/photo-upload";
import { checkYouTubeEmbeddable, parseYouTubeId } from "@/lib/youtube";

const uuid = z.uuid();
const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};
const optionalId = (f: FormData) => {
  const parsed = uuid.safeParse(f.get("id"));
  return parsed.success ? parsed.data : undefined;
};
const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Check the form.";

function saved() {
  // Shop pages read the catalogue from one cached snapshot (D12).
  updateTag("catalog");
  refresh();
}

export type UploadState = { path?: string; error?: string };

/** One photo → WebP, max 1600px, random name in `catalog/` (D11). Returns the Storage path. */
export async function uploadPhoto(formData: FormData): Promise<UploadState> {
  await requireAdmin();
  return storePhoto(formData.get("file"), "catalog");
}

export async function saveProductAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = optionalId(f);
  // Phase 10: a pasted YouTube link → its video ID, checked with YouTube (D7, D11).
  const videoLink = str(f, "video");
  const youtubeId = videoLink ? parseYouTubeId(videoLink) : null;
  if (videoLink && !youtubeId)
    return { error: "That isn't a YouTube video link (e.g. youtube.com/shorts/…)." };
  if (youtubeId) {
    const check = await checkYouTubeEmbeddable(youtubeId);
    if (!check.ok) return { error: check.error };
  }
  const parsed = productInput.safeParse({
    name: str(f, "name"),
    slug: str(f, "slug") || undefined,
    collectionId: str(f, "collectionId"),
    description: str(f, "description"),
    material: str(f, "material"),
    sizeLabel: str(f, "sizeLabel"),
    ageMin: str(f, "ageMin"),
    badges: f.getAll("badges"),
    images: f.getAll("images"),
    sortOrder: str(f, "sortOrder") || "0",
    active: f.get("active") === "on",
    isTest: f.get("isTest") === "on",
    tagIds: f.getAll("tagIds"),
    designSource: str(f, "designSource") || "original",
    licenceNote: str(f, "licenceNote"),
    youtubeId,
    videoVertical: f.get("videoVertical") !== "wide",
    sellBox: f.get("sellBox") === "on",
    boxQty: str(f, "boxQty"),
    boxPriceCents: str(f, "boxPrice"),
    mixedBox: f.get("mixedBox") === "on",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const result = await saveProduct(db, parsed.data, id);
  if (!result.ok) return { error: result.error };
  saved();
  if (!id) redirect(`/admin/products/${result.id}`);
  return { ok: true, message: "Saved." };
}

export async function saveDesignAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const productId = uuid.safeParse(f.get("productId"));
  if (!productId.success) return { error: "Unknown product." };
  const parsed = designInput.safeParse({
    name: str(f, "name"),
    sku: str(f, "sku"),
    price: str(f, "price"),
    compareAt: str(f, "compareAt"),
    lowStockAt: str(f, "lowStockAt") || "3",
    weightGrams: str(f, "weightGrams") || "0",
    image: str(f, "image") || null,
    sortOrder: str(f, "sortOrder") || "0",
    active: f.get("active") === "on",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const result = await saveDesign(db, productId.data, parsed.data, optionalId(f));
  if (!result.ok) return { error: result.error };
  saved();
  return {
    ok: true,
    message: optionalId(f) ? "Saved." : "Design added (stock 0: use Receive shipment).",
  };
}

export async function saveBoxAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = optionalId(f);
  const items = f.getAll("item").map((v) => {
    const [variantId, qty] = String(v).split(":");
    return { variantId, qty: qty ?? "1" };
  });
  const type = str(f, "type");
  const parsed = boxInput.safeParse({
    name: str(f, "name"),
    slug: str(f, "slug") || undefined,
    description: str(f, "description"),
    type,
    price: str(f, "price"),
    pickCount: type === "mystery" ? str(f, "pickCount") || null : null,
    images: f.getAll("images"),
    sortOrder: str(f, "sortOrder") || "0",
    active: f.get("active") === "on",
    items,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const result = await saveBox(db, parsed.data, id);
  if (!result.ok) return { error: result.error };
  saved();
  if (!id) redirect(`/admin/boxes/${result.id}`);
  return { ok: true, message: "Saved." };
}

export async function saveCollectionAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = collectionInput.safeParse({
    name: str(f, "name"),
    slug: str(f, "slug") || undefined,
    parentId: str(f, "parentId") || null,
    description: str(f, "description"),
    image: str(f, "image") || null,
    sortOrder: str(f, "sortOrder") || "0",
    active: f.get("active") === "on",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const result = await saveCollection(db, parsed.data, optionalId(f));
  if (!result.ok) return { error: result.error };
  saved();
  return { ok: true, message: "Saved." };
}

export async function saveTagAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = tagInput.safeParse({
    name: str(f, "name"),
    slug: str(f, "slug") || undefined,
    group: str(f, "group"),
    sortOrder: str(f, "sortOrder") || "0",
    active: f.get("active") === "on",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const result = await saveTag(db, parsed.data, optionalId(f));
  if (!result.ok) return { error: result.error };
  saved();
  return { ok: true, message: "Saved." };
}
