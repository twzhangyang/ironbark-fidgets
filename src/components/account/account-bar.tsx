import Link from "next/link";

import { signOutCustomer } from "@/actions/account/auth";
import { Button } from "@/components/ui/button";
import { fill, messages } from "@/content/messages";

const t = messages.account;

/** "Signed in as …" with the account links and sign out. */
export function AccountBar({ email }: { email: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b pb-4 text-sm">
      <p className="mr-auto text-muted-foreground">{fill(t.signedInAs, { email })}</p>
      <Link href="/account" className="font-semibold hover:underline">
        {t.orders.title}
      </Link>
      <Link href="/account/reviews" className="font-semibold hover:underline">
        {t.reviews}
      </Link>
      <Link href="/account/settings" className="font-semibold hover:underline">
        {t.settings}
      </Link>
      <form action={signOutCustomer}>
        <Button type="submit" variant="outline" size="sm" className="rounded-full">
          {t.signOut}
        </Button>
      </form>
    </div>
  );
}
