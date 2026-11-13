import { Heading, Img, Section, Text } from "@react-email/components";

import { fill, messages } from "@/content/messages";
import { Button, EmailLayout, text } from "@/lib/email/templates/layout";
import { formatAud } from "@/lib/money";

const t = messages.email.backInStock;

export type BackInStockItem = {
  name: string;
  priceCents: number;
  image: string | null;
  url: string;
  /** Set when stock is low ("Only N left"). */
  lowCount: number | null;
};

export function BackInStockEmail({
  item,
  siteUrl,
  unsubscribeUrl,
}: {
  item: BackInStockItem;
  siteUrl: string;
  unsubscribeUrl: string;
}) {
  return (
    <EmailLayout
      preview={t.preview}
      siteUrl={siteUrl}
      why={fill(t.why, { name: item.name })}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading as="h1" style={{ ...text, fontSize: "24px", lineHeight: "30px", fontWeight: 800 }}>
        {t.heading}
      </Heading>
      <Text style={text}>{fill(t.intro, { name: item.name })}</Text>
      {item.image?.startsWith("https://") && (
        <Img
          src={item.image}
          alt={item.name}
          width="480"
          style={{ borderRadius: "16px", height: "auto", maxWidth: "100%" }}
        />
      )}
      <Text style={{ ...text, fontSize: "18px", fontWeight: 800, marginTop: "12px" }}>
        {item.name} · {formatAud(item.priceCents)}
      </Text>
      {item.lowCount && <Text style={text}>{fill(t.low, { count: item.lowCount })}</Text>}
      <Section style={{ marginTop: "8px" }}>
        <Button href={item.url}>{t.cta}</Button>
      </Section>
    </EmailLayout>
  );
}
