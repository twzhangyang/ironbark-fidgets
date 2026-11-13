import { Suspense } from "react";

import { AdminNav } from "@/components/admin/admin-nav";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

/**
 * Admin chrome. Holds no data and does no access check: each page calls `requireAdmin()`
 * itself, because layouts don't re-run on navigation.
 */
export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <AdminNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 print:max-w-none print:p-0">
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>{children}</Suspense>
      </main>
    </>
  );
}
