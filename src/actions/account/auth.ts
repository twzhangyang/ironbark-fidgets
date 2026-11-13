"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { messages } from "@/content/messages";
import { getCustomer, safeNext } from "@/lib/account/auth";
import { requestOrigin } from "@/lib/request-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const t = messages.account.signIn;

export type SignInState =
  | { step: "email"; error?: string; email?: string }
  | { step: "code"; email: string; error?: string };

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const code = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/);

/** Step 1: email a one-time code (Phase 7 D1). Creates the account on first sign-in. */
export async function sendCode(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = email.safeParse(formData.get("email"));
  const raw = typeof formData.get("email") === "string" ? String(formData.get("email")) : "";
  if (!parsed.success) return { step: "email", error: t.invalidEmail, email: raw };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true },
  });
  if (error) {
    // Never log the address. Rate limits are the usual cause.
    console.warn("sign-in code not sent", error.status ?? "", error.code ?? "");
    return { step: "email", error: error.status === 429 ? t.tooMany : t.sendFailed, email: raw };
  }
  return { step: "code", email: parsed.data };
}

/** Step 2: check the code, then go where the customer was heading. */
export async function verifyCode(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const address = email.safeParse(formData.get("email"));
  if (!address.success) return { step: "email", error: t.invalidEmail };
  const token = code.safeParse(String(formData.get("code") ?? "").replace(/\s/g, ""));
  if (!token.success) return { step: "code", email: address.data, error: t.badCode };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email: address.data,
    token: token.data,
    type: "email",
  });
  if (error) return { step: "code", email: address.data, error: t.badCode };
  redirect(safeNext(formData.get("next")));
}

/** Google sign-in: Supabase sends the browser to Google, then back to /auth/callback. */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect("/account?error=google");
  redirect(data.url);
}

export async function signOutCustomer(): Promise<void> {
  if (await getCustomer()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/account");
}
