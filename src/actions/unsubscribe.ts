"use server";

import { z } from "zod";

import { maskEmail } from "@/lib/email/unsubscribe";
import { unsubscribeByToken } from "@/lib/email/unsubscribe-db";

export type UnsubscribeState = { status: "idle" | "done" | "invalid"; email?: string };

export async function unsubscribe(
  _prev: UnsubscribeState,
  formData: FormData,
): Promise<UnsubscribeState> {
  const token = z.string().max(500).safeParse(formData.get("t"));
  if (!token.success) return { status: "invalid" };
  const email = await unsubscribeByToken(token.data);
  return email ? { status: "done", email: maskEmail(email) } : { status: "invalid" };
}
