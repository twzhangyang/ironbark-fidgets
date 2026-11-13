"use server";

import { z } from "zod";

import { db } from "@/lib/db/client";
import { subscribers } from "@/lib/db/schema";

export type SubscribeState = { status: "idle" | "success" | "invalid" | "error" };

const input = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    variantId: z.uuid().optional(),
    bundleId: z.uuid().optional(),
    /** Honeypot: hidden from people, filled in by basic spam bots. */
    company: z.string().max(0).optional(),
  })
  .refine((v) => !(v.variantId && v.bundleId), "one item at most");

const blankToUndefined = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value !== "" ? value : undefined;

/**
 * Waitlist (no item) or back-in-stock alert (a variant or a box). Duplicates count as
 * success (and re-arm the alert). Consent is the form submit itself (the consent line sits under the field), so
 * `consent_at` is now. Emails are sent from Phase 4.
 */
export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const parsed = input.safeParse({
    email: formData.get("email"),
    variantId: blankToUndefined(formData.get("variantId")),
    bundleId: blankToUndefined(formData.get("bundleId")),
    company: blankToUndefined(formData.get("company")),
  });
  if (!parsed.success) {
    // Pretend a honeypot hit worked, so bots learn nothing.
    const botOnly = parsed.error.issues.every((i) => i.path[0] === "company");
    return { status: botOnly ? "success" : "invalid" };
  }

  const { email, variantId, bundleId } = parsed.data;
  try {
    await db
      .insert(subscribers)
      .values({
        email,
        kind: variantId || bundleId ? "back_in_stock" : "waitlist",
        variantId: variantId ?? null,
        bundleId: bundleId ?? null,
      })
      // Signing up again is fresh consent: clear an earlier unsubscribe, and re-arm the alert.
      .onConflictDoUpdate({
        target: [subscribers.email, subscribers.kind, subscribers.variantId, subscribers.bundleId],
        set: { unsubscribedAt: null, notifiedAt: null, consentAt: new Date() },
      });
    return { status: "success" };
  } catch (error) {
    console.error("subscribe failed", (error as { code?: string }).code ?? error);
    return { status: "error" };
  }
}
