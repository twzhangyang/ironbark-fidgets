import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InfoPage } from "@/components/site/info-page";
import { JsonLd } from "@/components/site/json-ld";
import { getGuide, guides } from "@/content/guides";
import { fill, messages } from "@/content/messages";
import { guideJsonLd } from "@/lib/seo";
import { CHRISTMAS_ORDER_BY } from "@/lib/site";

const t = messages.pages.guides;

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  return guide
    ? {
        title: guide.title,
        description: guide.description,
        alternates: { canonical: `/guides/${guide.slug}` },
        openGraph: { type: "article" },
      }
    : {};
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  // Sections that need the Christmas date only show while it's set.
  const sections = guide.sections
    .filter((s) => CHRISTMAS_ORDER_BY || !s.paragraphs.some((p) => p.includes("{christmas}")))
    .map((s) => ({
      ...s,
      paragraphs: s.paragraphs.map((p) => fill(p, { christmas: CHRISTMAS_ORDER_BY ?? "" })),
    }));
  return (
    <InfoPage title={guide.title} intro={guide.intro}>
      <JsonLd data={guideJsonLd(guide)} />
      {sections.map((s) => (
        <section key={s.title} className="space-y-3">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          {s.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {s.links && (
            <ul className="flex flex-wrap gap-2">
              {s.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-block rounded-full bg-muted px-4 py-1.5 text-sm font-medium hover:bg-primary hover:text-primary-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="text-sm text-muted-foreground">
        {fill(t.updated, { date: guide.updated })} ·{" "}
        <Link href="/guides" className="underline">
          {t.all}
        </Link>
      </p>
    </InfoPage>
  );
}
