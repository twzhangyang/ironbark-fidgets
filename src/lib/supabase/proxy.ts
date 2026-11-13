import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase session cookie (the owner on /admin, customers on
 * /account). It never decides access: pages and actions call `requireAdmin()`
 * or `requireCustomer()` themselves.
 *
 * `respond` builds the response to send (a plain `next()` or the locale
 * rewrite); it is called again with the updated request cookies whenever
 * Supabase rotates the token, so the page sees the fresh session too.
 */
export async function refreshSession(
  request: NextRequest,
  respond: () => NextResponse = () => NextResponse.next({ request }),
): Promise<NextResponse> {
  let response = respond();
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = respond();
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  // Validates the token with Supabase and rotates it when needed.
  await supabase.auth.getUser();
  return response;
}
