import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "@/lib/supabase/env";

/**
 * Supabase client bound to the request's auth cookies. Used only for the
 * owner's sign-in: all data goes through Drizzle after `requireAdmin()`.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, which can't set cookies. The proxy
          // refreshes the session on every /admin request, so this is safe.
        }
      },
    },
  });
}
