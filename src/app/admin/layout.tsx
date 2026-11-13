import type { Metadata } from "next";

// Owner-only, reads the session: blocks on the server (no instant-navigation shell).
export const instant = false;

// Owner-only area: never indexed. Admin text is English-only and lives with the admin
// components (messages.ts is for customer-facing copy; Phase 5 D14).
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-dvh flex-col bg-background">{children}</div>;
}
