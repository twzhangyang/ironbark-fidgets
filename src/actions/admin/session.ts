"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { checkAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignInState = { error?: string; email?: string };

const credentials = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(200),
});

// One message for every failure, so the form doesn't reveal which emails exist.
const FAILED = "That email and password didn't work.";

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw : "";
  const parsed = credentials.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: FAILED, email };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: FAILED, email };

  // A valid Supabase user who isn't the owner gets no admin session at all.
  const check = await checkAdmin();
  if (check.status !== "admin") {
    await supabase.auth.signOut();
    return { error: FAILED, email };
  }
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
