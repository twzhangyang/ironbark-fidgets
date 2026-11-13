"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { messages } from "@/content/messages";
import { requireCustomer } from "@/lib/account/auth";
import { deleteMarketingData, setPreference, stopAllMarketing } from "@/lib/account/settings";
import { db } from "@/lib/db/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const t = messages.account.settingsPage;

export type SettingsState = { ok?: boolean; error?: string; message?: string };

const name = z
  .string()
  .trim()
  .max(60)
  .regex(/^[\p{L}\p{M}' .-]*$/u);

/** Name shown on reviews ("Mia K."). Stored on the Supabase user, not in our tables. */
export async function saveName(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const customer = await requireCustomer("/account/settings");
  const parsed = name.safeParse(formData.get("name"));
  if (!parsed.success) return { error: t.nameInvalid };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { display_name: parsed.data } });
  if (error) {
    console.warn("name not saved", customer.id, error.code ?? "");
    return { error: t.saveFailed };
  }
  refresh();
  return { ok: true, message: t.saved };
}

export async function togglePreference(id: string, on: boolean): Promise<SettingsState> {
  const customer = await requireCustomer("/account/settings");
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { error: t.saveFailed };
  await setPreference(db, customer.email, parsed.data, on === true);
  refresh();
  return { ok: true };
}

export async function stopAllEmails(): Promise<SettingsState> {
  const customer = await requireCustomer("/account/settings");
  await stopAllMarketing(db, customer.email);
  refresh();
  return { ok: true, message: t.allOff };
}

/** D8: deletes the sign-in and marketing sign-ups now. Orders stay (tax records). */
export async function deleteAccount(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const customer = await requireCustomer("/account/settings");
  if (formData.get("confirm") !== "DELETE") return { error: t.deleteConfirmError };
  await deleteMarketingData(db, customer.email);
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(customer.id);
  if (error) {
    console.error("account delete failed", customer.id, error.code ?? "");
    return { error: t.saveFailed };
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut().catch(() => undefined);
  redirect("/account?deleted=1");
}
