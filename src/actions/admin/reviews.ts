"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/actions/admin/orders";
import { HIDE_REASONS } from "@/lib/account/review-rules";
import { decidePhoto, hideReview, unhideReview } from "@/lib/account/reviews";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { removeReviewPhotos } from "@/lib/photo-upload";

const uuid = z.uuid();

function changed() {
  updateTag("reviews");
  refresh();
}

/** D10: hiding needs one of the allowed reasons. A low rating is never one. */
export async function hideReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  const reason = z.enum(HIDE_REASONS).safeParse(formData.get("reason"));
  if (!id.success) return { error: "Unknown review." };
  if (!reason.success) return { error: "Pick a reason." };
  if (!(await hideReview(db, id.data, reason.data))) return { error: "Unknown review." };
  changed();
  return { ok: true, message: "Hidden." };
}

export async function unhideReviewAction(id: string): Promise<ActionState> {
  await requireAdmin();
  const parsed = uuid.safeParse(id);
  if (!parsed.success || !(await unhideReview(db, parsed.data)))
    return { error: "Unknown review." };
  changed();
  return { ok: true, message: "Published again." };
}

export async function decidePhotoAction(id: string, approve: boolean): Promise<ActionState> {
  await requireAdmin();
  const parsed = uuid.safeParse(id);
  const decided = parsed.success && (await decidePhoto(db, parsed.data, approve === true));
  if (!decided) return { error: "Unknown review or no photo." };
  if (approve !== true) await removeReviewPhotos([decided.photoPath]);
  changed();
  return { ok: true, message: approve ? "Photo approved." : "Photo removed." };
}
