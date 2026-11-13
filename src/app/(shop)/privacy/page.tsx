import type { Metadata } from "next";

import { InfoPage, InfoSection } from "@/components/site/info-page";
import { fill, messages } from "@/content/messages";

const t = messages.pages.privacy;

export const metadata: Metadata = {
  title: t.title,
  description: t.intro,
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  const values = { email: messages.brand.email };
  return (
    <InfoPage title={t.title} intro={t.intro}>
      {t.sections.map((s) => (
        <InfoSection key={s.title} title={s.title} items={s.items.map((i) => fill(i, values))} />
      ))}
      <p className="text-sm text-muted-foreground">{t.updated}</p>
    </InfoPage>
  );
}
