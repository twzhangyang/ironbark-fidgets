/**
 * Daily job (vercel.json → crons): review request emails, then a note to the owner if review
 * photos are waiting. Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is 401.
 */
import { timingSafeEqual } from "node:crypto";

import { photosWaiting } from "@/lib/account/reviews";
import { db } from "@/lib/db/client";
import { resendSender } from "@/lib/email/client";
import { getEmailConfig } from "@/lib/email/config";
import { sendReviewRequests } from "@/lib/email/review-requests";
import { getSiteUrl } from "@/lib/site";

export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });
  const result = await sendReviewRequests(db, resendSender);

  const photos = await photosWaiting(db);
  if (photos > 0) {
    const url = `${getSiteUrl()}/admin/reviews`;
    const day = new Date().toISOString().slice(0, 10);
    const line = `${photos} review photo(s) waiting for a check: ${url}`;
    await resendSender({
      from: "orders",
      to: getEmailConfig().ORDER_ALERT_EMAIL,
      subject: `Review photos to check (${photos})`,
      html: `<p>${line}</p>`,
      text: line,
      idempotencyKey: `review-photos/${day}`,
    });
  }
  return Response.json({ ...result, photosWaiting: photos });
}
