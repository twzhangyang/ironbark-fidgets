import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Customer = { id: string; email: string; name: string | null };

/**
 * The signed-in customer, or null. Only a **verified** email counts (Phase 7 D3): an email code
 * or Google both prove it. `getUser()` checks the token with Supabase. Cached per request.
 */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !user.email_confirmed_at) return null;
  const meta = user.user_metadata as {
    display_name?: unknown;
    full_name?: unknown;
    name?: unknown;
  };
  const name = [meta.display_name, meta.full_name, meta.name].find(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  return { id: user.id, email: user.email.toLowerCase(), name: name?.trim() ?? null };
});

/** Call first in every account page and action. Signed out → the sign-in page. */
export async function requireCustomer(next = "/account"): Promise<Customer> {
  const customer = await getCustomer();
  if (customer) return customer;
  redirect(`/account?next=${encodeURIComponent(safeNext(next))}`);
}

/** Only same-site paths (no `//evil.com`, no `/\evil.com`, no schemes). */
export function safeNext(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") return fallback;
  if (!/^\/(?![/\\])[\w\-./?=&%]*$/.test(value)) return fallback;
  return value;
}
