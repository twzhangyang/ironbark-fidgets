"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import type { UploadState } from "@/actions/admin/catalog";
import { messages } from "@/content/messages";
import { requireCustomer } from "@/lib/account/auth";
import {
  deleteReview,
  myReviews,
  reviewableItems,
  reviewerName,
  reviewInput,
  saveReview,
} from "@/lib/account/reviews";
import { db } from "@/lib/db/client";
import { removeReviewPhotos, storePhoto } from "@/lib/photo-upload";

const t = messages.account.reviewsPage;

export type ReviewState = { ok?: boolean; error?: string; message?: string };

function changed() {
  // Product and box pages read reviews through the `reviews` cache tag.
  updateTag("reviews");
  refresh();
}

/** Only customers with something to review (or a review to edit) may upload. */
export async function uploadReviewPhoto(formData: FormData): Promise<UploadState> {
  const customer = await requireCustomer("/account/reviews");
  const [canReview, mine] = await Promise.all([
    reviewableItems(db, customer.email),
    myReviews(db, customer.email),
  ]);
  if (canReview.length === 0 && mine.length === 0) return { error: t.notEligible };
  return storePhoto(formData.get("file"), "reviews");
}

export async function saveReviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const customer = await requireCustomer("/account/reviews");
  const photo = formData.get("photo");
  const parsed = reviewInput.safeParse({
    target: { type: formData.get("type"), id: formData.get("id") },
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    photo: typeof photo === "string" && photo !== "" ? photo : null,
  });
  if (!parsed.success) return { error: t.invalid };
  try {
    const result = await saveReview(
      db,
      { email: customer.email, displayName: reviewerName(customer.name, t.fallbackName) },
      parsed.data,
    );
    if (!result.ok) return { error: t.notEligible };
    await removeReviewPhotos([result.oldPhoto]);
    changed();
    return { ok: true, message: result.photoPending ? t.postedPhoto : t.posted };
  } catch (error) {
    console.error("review not saved", customer.id, error instanceof Error ? error.message : "");
    return { error: t.failed };
  }
}

export async function deleteReviewAction(id: string): Promise<ReviewState> {
  const customer = await requireCustomer("/account/reviews");
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { error: t.failed };
  const deleted = await deleteReview(db, customer.email, parsed.data);
  if (!deleted) return { error: t.failed };
  await removeReviewPhotos([deleted.photoPath]);
  changed();
  return { ok: true, message: t.deleted };
}
