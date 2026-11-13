import Link from "next/link";

import { signOut } from "@/actions/admin/session";
import { Button } from "@/components/ui/button";

/** Signed in, but not the owner (admin only; English, owner-facing). */
export default function Forbidden() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-6 text-center ring-1 ring-border">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="text-sm text-muted-foreground">This account can&apos;t use the admin.</p>
        <div className="flex justify-center gap-2">
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
          <Link href="/" className="inline-flex items-center px-3 text-sm underline">
            Go to the shop
          </Link>
        </div>
      </div>
    </main>
  );
}
