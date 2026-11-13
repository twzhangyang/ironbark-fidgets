import "server-only";

import type { User } from "@supabase/supabase-js";
import { forbidden, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** The owner's login email, lowercased; `null` (nobody is admin) if unset or invalid. */
function adminEmail(): string | null {
  const result = z.email().safeParse(process.env.ADMIN_EMAIL?.trim());
  return result.success ? result.data.toLowerCase() : null;
}

export type AdminCheck =
  | { status: "admin"; user: User }
  | { status: "signedOut" }
  /** Signed in, but not the owner (or the email isn't confirmed). */
  | { status: "denied" };

/**
 * Who is making this request. `getUser()` asks Supabase to validate the token, so a forged or
 * revoked cookie never passes. Cached per request.
 */
export const checkAdmin = cache(async (): Promise<AdminCheck> => {
  // Admin work is always per request (never prerendered), so clocks and DB reads are fine after.
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "signedOut" };

  const owner = adminEmail();
  const email = user.email?.toLowerCase();
  if (!owner || email !== owner || !user.email_confirmed_at) return { status: "denied" };
  return { status: "admin", user };
});

/**
 * Call first in every admin page, server action and route handler (Phase 5 D2). Signed out →
 * login page; signed in as anyone else → 403.
 */
export async function requireAdmin(): Promise<User> {
  const check = await checkAdmin();
  if (check.status === "admin") return check.user;
  if (check.status === "denied") forbidden();
  redirect("/admin/login");
}

/** The admin's email for `stock_movements.created_by`. */
export async function adminActor(): Promise<string> {
  const user = await requireAdmin();
  return user.email?.toLowerCase() ?? "admin";
}
