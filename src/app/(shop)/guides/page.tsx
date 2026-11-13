import type { Metadata } from "next";
import Link from "next/link";

import { InfoPage } from "@/components/site/info-page";
import { guides } from "@/content/guides";
import { messages } from "@/content/messages";

const t = messages.pages.guides;

export const metadata: Metadata = {
  title: t.title,
  description: t.description,
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <InfoPage title={t.title} intro={t.intro}>
      <ul className="space-y-4">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="block space-y-1 rounded-3xl bg-card p-5 transition-colors hover:bg-muted"
            >
              <h2 className="text-lg font-semibold">{g.title}</h2>
              <p className="text-muted-foreground">{g.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </InfoPage>
  );
}
