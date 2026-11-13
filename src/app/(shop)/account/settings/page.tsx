import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountBar } from "@/components/account/account-bar";
import { DeleteAccount, NameForm, Preferences } from "@/components/account/settings-forms";
import { Container } from "@/components/site/container";
import { messages } from "@/content/messages";
import { requireCustomer } from "@/lib/account/auth";
import { getMySettings } from "@/lib/account/queries";

const t = messages.account.settingsPage;

// Reads the session: always per request.
export const instant = false;

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <Container className="py-10">
      <Suspense fallback={<div className="h-96" aria-hidden />}>
        <Settings />
      </Suspense>
    </Container>
  );
}

async function Settings() {
  await requireCustomer("/account/settings");
  const { customer, preferences } = await getMySettings();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <AccountBar email={customer.email} />
      <h1 className="font-heading text-3xl font-semibold">{t.title}</h1>
      <section className="space-y-2 rounded-3xl bg-card p-5 ring-1 ring-border">
        <h2 className="font-semibold">{t.nameTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.nameText}</p>
        <NameForm name={customer.name ?? ""} />
      </section>
      <section className="space-y-2 rounded-3xl bg-card p-5 ring-1 ring-border">
        <h2 className="font-semibold">{t.emailsTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.emailsText}</p>
        <Preferences items={preferences} />
      </section>
      <section className="space-y-2 rounded-3xl bg-card p-5 ring-1 ring-destructive/30">
        <h2 className="font-semibold">{t.deleteTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.deleteText}</p>
        <DeleteAccount />
      </section>
    </div>
  );
}
