import { Phone } from "lucide-react";
import type { Metadata } from "next";

import { InfoPage, InfoSection } from "@/components/site/info-page";
import { fill, messages } from "@/content/messages";

const t = messages.pages.safety;

export const metadata: Metadata = {
  title: t.title,
  description: t.intro,
  alternates: { canonical: "/safety" },
};

export default function SafetyPage() {
  return (
    <InfoPage title={t.title} intro={t.intro}>
      {t.sections.map((s) => (
        <InfoSection
          key={s.title}
          title={s.title}
          items={s.items.map((i) => fill(i, { email: messages.brand.email }))}
        />
      ))}
      <p className="flex gap-3 rounded-3xl bg-peach/60 p-5 font-semibold">
        <Phone className="mt-1 size-5 shrink-0" aria-hidden />
        {t.poisons}
      </p>
      <p className="text-muted-foreground">{fill(t.materials, { email: messages.brand.email })}</p>
    </InfoPage>
  );
}
