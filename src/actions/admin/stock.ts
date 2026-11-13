"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/actions/admin/orders";
import { adminActor, requireAdmin } from "@/lib/admin/auth";
import { adjustStock, receiveStock } from "@/lib/admin/stock";
import { db } from "@/lib/db/client";
import { resendSender } from "@/lib/email/client";
import { sendBackInStockAlerts } from "@/lib/email/send";

/** After a real restock (D8): how many alerts went out, or null when sending failed. A failure
 * never undoes the stock change. */
async function alertCount(): Promise<number | null> {
  try {
    const { sent } = await sendBackInStockAlerts(db, resendSender);
    return sent;
  } catch (error) {
    console.error("back-in-stock alerts failed", (error as Error).message);
    return null;
  }
}

async function alerts(): Promise<string> {
  const sent = await alertCount();
  if (sent === null) return " Back-in-stock alerts didn't send: use “Send due alerts” to retry.";
  return sent ? ` ${sent} back-in-stock ${sent === 1 ? "alert" : "alerts"} sent.` : "";
}

const qty = z.coerce.number().int().min(0).max(10_000);

export async function receive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await adminActor();
  const lines: { variantId: string; qty: number }[] = [];
  for (const [key, value] of formData) {
    if (!key.startsWith("qty:") || value === "") continue;
    const id = z.uuid().safeParse(key.slice(4));
    const n = qty.safeParse(value);
    if (!id.success || !n.success) return { error: "Quantities must be whole numbers (0–10,000)." };
    if (n.data > 0) lines.push({ variantId: id.data, qty: n.data });
  }
  if (!lines.length) return { error: "Enter at least one quantity." };
  const note = z.string().trim().max(200).catch("").parse(formData.get("note"));
  const units = await receiveStock(db, lines, { note, actor });
  updateTag("catalog");
  const sent = await alertCount();
  // Back to the Stock page, which shows what was received (no names or notes in the address).
  const done = new URLSearchParams({
    received: String(units),
    designs: String(lines.length),
    alerts: sent === null ? "failed" : String(sent),
  });
  redirect(`/admin/stock?${done}`);
}

const adjustInput = z.object({
  variantId: z.uuid(),
  delta: z.coerce
    .number()
    .int()
    .min(-10_000)
    .max(10_000)
    .refine((n) => n !== 0, "not zero"),
  reason: z.enum(["Damaged", "Count fix", "Giveaway", "Sample", "Other"]),
  note: z.string().trim().max(200),
});

export async function adjust(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await adminActor();
  const parsed = adjustInput.safeParse({
    variantId: formData.get("variantId"),
    delta: formData.get("delta"),
    reason: formData.get("reason"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: "Enter a change like 5 or -2, and pick a reason." };
  const { variantId, delta, reason, note } = parsed.data;
  const result = await adjustStock(db, {
    variantId,
    delta,
    note: note ? `${reason}: ${note}` : reason,
    actor,
  });
  if (!result.ok) return { error: "Stock can't go below 0." };
  updateTag("catalog");
  const extra = delta > 0 ? await alerts() : "";
  refresh();
  return { ok: true, message: `Stock is now ${result.stock}.${extra}` };
}

export async function sendDueAlerts(): Promise<ActionState> {
  await requireAdmin();
  try {
    const { due, sent } = await sendBackInStockAlerts(db, resendSender);
    refresh();
    return { ok: true, message: due ? `Sent ${sent} of ${due} due alerts.` : "No alerts are due." };
  } catch (error) {
    console.error("back-in-stock alerts failed", (error as Error).message);
    return { error: "Sending failed. Try again in a minute." };
  }
}
