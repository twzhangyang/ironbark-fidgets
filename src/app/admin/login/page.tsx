import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/site/logo";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-card p-6 ring-1 ring-border">
        <div className="space-y-2">
          <Logo />
          <h1 className="text-xl font-semibold">Owner sign in</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
