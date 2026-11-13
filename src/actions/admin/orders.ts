"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import { adminActor, requireAdmin } from "@/lib/admin/auth";
import {
  cleanTrackingNumber,
  markPacked,
  markShipped,
  putBackRefundedStock,
  refundOrder,
  undoStep,
} from "@/lib/admin/orders";
import { db } from "@/lib/db/client";
import { resendSender } from "@/lib/email/client";
import { sendOrderEmails, sendShippedEmail } from "@/lib/email/send";
import { getStripe } from "@/lib/stripe";

export type ActionState = { ok?: boolean; error?: string; message?: string };

const orderId = z.uuid();

function parseId(value: unknown): string | null {
  const parsed = orderId.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function packOrder(id: string): Promise<ActionState> {
  await requireAdmin();
  const order = parseId(id);
  if (!order) return { error: "Unknown order." };
  const ok = await markPacked(db, order);
  refresh();
  return ok
    ? { ok, message: "Marked packed." }
    : { error: "This order isn't waiting to be packed." };
}

export async function shipOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const order = parseId(formData.get("orderId"));
  if (!order) return { error: "Unknown order." };
  const tracking = cleanTrackingNumber(String(formData.get("tracking") ?? ""));
  if (!tracking)
    return { error: "That doesn't look like a tracking number (10–40 letters or digits)." };
  if (!(await markShipped(db, order, tracking))) {
    refresh();
    return { error: "This order can't be marked shipped (already shipped or refunded?)." };
  }
  try {
    await sendShippedEmail(db, order, resendSender);
  } catch (error) {
    console.error("shipped email failed", (error as Error).message);
    refresh();
    return {
      ok: true,
      error: "Marked shipped, but the email didn't send. Use “Send shipped email” to retry.",
    };
  }
  refresh();
  return { ok: true, message: "Shipped. The customer has the tracking email." };
}

export async function undoOrderStep(id: string): Promise<ActionState> {
  await requireAdmin();
  const order = parseId(id);
  if (!order) return { error: "Unknown order." };
  const ok = await undoStep(db, order);
  refresh();
  return ok ? { ok, message: "Undone." } : { error: "Can't undo this step." };
}

export async function refund(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await adminActor();
  const order = parseId(formData.get("orderId"));
  if (!order) return { error: "Unknown order." };
  if (formData.get("confirm") !== "yes") return { error: "Tick the box to confirm the refund." };
  const putBack = formData.get("putBack") === "on";
  const result = await refundOrder(db, getStripe(), order, { putBack, actor });
  if (putBack) updateTag("catalog");
  refresh();
  if (!result.ok) {
    return {
      error:
        result.error === "stripe"
          ? "Stripe didn't accept the refund. Try again, or refund in the Stripe dashboard."
          : result.error === "no_payment"
            ? "No Stripe payment on this order."
            : result.error === "wrong_mode"
              ? "This order was paid in the other Stripe mode (test vs live). Refund it from the site it was paid on, or in the Stripe dashboard."
              : "This order can't be refunded.",
    };
  }
  return {
    ok: true,
    message: result.putBack ? `Refunded. ${result.putBack} items back on the shelf.` : "Refunded.",
  };
}

export async function putBackStock(id: string): Promise<ActionState> {
  const actor = await adminActor();
  const order = parseId(id);
  if (!order) return { error: "Unknown order." };
  const units = await putBackRefundedStock(db, order, actor);
  updateTag("catalog");
  refresh();
  return units
    ? { ok: true, message: `${units} items back on the shelf.` }
    : { error: "Nothing to put back." };
}

export async function resendOrderEmails(id: string): Promise<ActionState> {
  await requireAdmin();
  const order = parseId(id);
  if (!order) return { error: "Unknown order." };
  try {
    const sent = await sendOrderEmails(db, order, resendSender);
    refresh();
    return sent.confirmation || sent.ownerAlert
      ? { ok: true, message: "Sent the missing emails." }
      : { ok: true, message: "Nothing to send: both emails already went." };
  } catch (error) {
    console.error("resend order emails failed", (error as Error).message);
    return { error: "Sending failed. Try again in a minute." };
  }
}

export async function resendShippedEmail(id: string): Promise<ActionState> {
  await requireAdmin();
  const order = parseId(id);
  if (!order) return { error: "Unknown order." };
  try {
    const sent = await sendShippedEmail(db, order, resendSender);
    refresh();
    return sent ? { ok: true, message: "Shipped email sent." } : { error: "Nothing to send." };
  } catch (error) {
    console.error("shipped email failed", (error as Error).message);
    return { error: "Sending failed. Try again in a minute." };
  }
}
