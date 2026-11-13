import type { Metadata } from "next";

import { InfoPage, InfoSection } from "@/components/site/info-page";
import { fill, messages } from "@/content/messages";
import { formatAud } from "@/lib/money";
import {
  EXPRESS_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
} from "@/lib/site";

const t = messages.pages.shipping;

export const metadata: Metadata = {
  title: t.title,
  description: t.description,
  alternates: { canonical: "/shipping-returns" },
};

export default function ShippingReturnsPage() {
  const values = {
    flat: formatAud(SHIPPING_FLAT_CENTS),
    threshold: formatAud(FREE_SHIPPING_THRESHOLD_CENTS, { compact: true }),
    express: formatAud(EXPRESS_SHIPPING_CENTS),
    email: messages.brand.email,
  };
  return (
    <InfoPage title={t.title}>
      {t.sections.map((s) => (
        <InfoSection key={s.title} title={s.title} items={s.items.map((i) => fill(i, values))} />
      ))}
      <p className="rounded-3xl bg-muted p-5 text-sm">{t.acl}</p>
    </InfoPage>
  );
}
