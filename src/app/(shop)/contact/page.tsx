import type { Metadata } from "next";

import { InfoPage } from "@/components/site/info-page";
import { messages } from "@/content/messages";

const t = messages.pages.contact;

export const metadata: Metadata = {
  title: t.title,
  description: t.intro,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const link = "font-semibold text-primary hover:underline";
  return (
    <InfoPage title={t.title} intro={t.intro}>
      <dl className="grid gap-4 rounded-3xl border bg-card p-6 sm:grid-cols-[auto_1fr] sm:gap-x-8">
        <dt className="text-muted-foreground">{t.emailLabel}</dt>
        <dd>
          <a href={`mailto:${messages.brand.email}`} className={link}>
            {messages.brand.email}
          </a>
        </dd>
        <dt className="text-muted-foreground">{t.socialLabel}</dt>
        <dd className="flex gap-4">
          <a href={messages.brand.instagram} className={link}>
            Instagram
          </a>
          <a href={messages.brand.tiktok} className={link}>
            TikTok
          </a>
        </dd>
      </dl>
      <p className="text-muted-foreground">{t.reply}</p>
    </InfoPage>
  );
}
