import type { Metadata } from "next";

import { InfoPage } from "@/components/site/info-page";
import { messages } from "@/content/messages";

const t = messages.pages.about;

export const metadata: Metadata = {
  title: t.title,
  description: t.intro,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <InfoPage title={t.title} intro={t.intro}>
      {t.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <p className="text-sm text-muted-foreground">{messages.brand.legal}</p>
    </InfoPage>
  );
}
