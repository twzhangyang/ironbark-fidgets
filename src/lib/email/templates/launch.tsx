import { Column, Heading, Img, Link, Row, Section, Text } from "@react-email/components";

import { fill, messages } from "@/content/messages";
import { Button, colors, EmailLayout, text } from "@/lib/email/templates/layout";
import { formatAud } from "@/lib/money";

const t = messages.email.launch;

export type LaunchItem = { name: string; priceCents: number; image: string | null; url: string };

export function LaunchEmail({
  items,
  promoCode,
  siteUrl,
  unsubscribeUrl,
}: {
  items: LaunchItem[];
  promoCode: string | null;
  siteUrl: string;
  unsubscribeUrl: string;
}) {
  const pairs = [items.slice(0, 2), items.slice(2, 4)].filter((p) => p.length);
  return (
    <EmailLayout preview={t.preview} siteUrl={siteUrl} why={t.why} unsubscribeUrl={unsubscribeUrl}>
      <Heading as="h1" style={{ ...text, fontSize: "26px", lineHeight: "32px", fontWeight: 800 }}>
        {t.heading}
      </Heading>
      <Text style={text}>{t.intro}</Text>
      {promoCode && (
        <Text
          style={{
            ...text,
            backgroundColor: colors.butter,
            borderRadius: "12px",
            fontWeight: 700,
            padding: "10px 14px",
          }}
        >
          {fill(t.code, { code: promoCode })}
        </Text>
      )}
      <Section style={{ margin: "8px 0 16px" }}>
        <Button href={siteUrl}>{t.cta}</Button>
      </Section>
      {pairs.length > 0 && <Text style={{ ...text, fontWeight: 800 }}>{t.featured}</Text>}
      {pairs.map((pair, i) => (
        <Row key={i}>
          {pair.map((item) => (
            <Column key={item.url} style={{ padding: "4px", verticalAlign: "top", width: "50%" }}>
              <Link href={item.url} style={{ color: colors.cocoa, textDecoration: "none" }}>
                {item.image?.startsWith("https://") && (
                  <Img
                    src={item.image}
                    alt={item.name}
                    width="240"
                    style={{ borderRadius: "12px", height: "auto", maxWidth: "100%" }}
                  />
                )}
                <Text style={{ ...text, fontWeight: 700, margin: "6px 0 0" }}>{item.name}</Text>
                <Text style={{ ...text, margin: 0 }}>{formatAud(item.priceCents)}</Text>
              </Link>
            </Column>
          ))}
        </Row>
      ))}
    </EmailLayout>
  );
}
