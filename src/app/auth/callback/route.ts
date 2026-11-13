/**
 * Google sign-in returns here (Phase 7 §1). Exchanges the one-time code for a session cookie
 * and redirects to a same-site path only.
 */
import { type NextRequest, NextResponse } from "next/server";

import { safeNext } from "@/lib/account/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const back = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  if (!code) return back("/account?error=google");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return back("/account?error=google");
  return back(next);
}
