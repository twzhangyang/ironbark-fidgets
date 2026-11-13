import type { Metadata } from "next";

import { FaqList } from "@/components/site/faq-list";
import { InfoPage } from "@/components/site/info-page";
import { JsonLd } from "@/components/site/json-ld";
import { fill, messages } from "@/content/messages";
import { formatAud } from "@/lib/money";
import { faqJsonLd } from "@/lib/seo";
import {
  CHRISTMAS_ORDER_BY,
  EXPRESS_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
} from "@/lib/site";

const t = messages.pages.faq;

export const metadata: Metadata = {
  title: t.title,
  description: t.description,
  alternates: { canonical: "/faq" },
};

/** The Q&A groups with prices and dates filled in; the Christmas question only while it has a date. */
function groups() {
  const values = {
    flat: formatAud(SHIPPING_FLAT_CENTS),
    threshold: formatAud(FREE_SHIPPING_THRESHOLD_CENTS, { compact: true }),
    express: formatAud(EXPRESS_SHIPPING_CENTS),
    email: messages.brand.email,
    christmas: CHRISTMAS_ORDER_BY ?? "",
  };
  return t.groups.map((g) => ({
    title: g.title,
    items: g.items
      .filter((i) => CHRISTMAS_ORDER_BY || !i.a.includes("{christmas}"))
      .map((i) => ({ q: i.q, a: fill(i.a, values) })),
  }));
}

export default function FaqPage() {
  const all = groups();
  return (
    <InfoPage title={t.title} intro={fill(t.intro, { email: messages.brand.email })}>
      <JsonLd data={faqJsonLd(all.flatMap((g) => g.items))} />
      {all.map((g) => (
        <section key={g.title} className="space-y-3">
          <h2 className="text-xl font-semibold">{g.title}</h2>
          <FaqList items={g.items} />
        </section>
      ))}
    </InfoPage>
  );
}
