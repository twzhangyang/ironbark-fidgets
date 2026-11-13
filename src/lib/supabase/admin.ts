import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSupabaseConfig } from "@/lib/supabase/env";

let client: SupabaseClient | undefined;

/**
 * Supabase with the secret key: bypasses RLS and Storage policies. Used only
 * for product photo uploads, after `requireAdmin()`. Never for auth.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const key = z.string().min(1).safeParse(process.env.SUPABASE_SECRET_KEY);
    if (!key.success) throw new Error("SUPABASE_SECRET_KEY is missing. See .env.local.");
    client = createClient(getSupabaseConfig().url, key.data, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
