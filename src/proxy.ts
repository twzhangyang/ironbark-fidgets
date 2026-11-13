import type { NextRequest } from "next/server";

import { refreshSession } from "@/lib/supabase/proxy";

/**
 * Keeps the Supabase session fresh on /admin (owner), /account and /auth (customers). It never decides access: every admin
 * page, server action and route handler calls `requireAdmin()` / `requireCustomer()` itself.
 */
export function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/account", "/account/:path*", "/auth/:path*"],
};
