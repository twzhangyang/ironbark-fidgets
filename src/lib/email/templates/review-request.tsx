import { Heading, Img, Section, Text } from "@react-email/components";

import { fill, messages } from "@/content/messages";
import { Button, EmailLayout, small, text } from "@/lib/email/templates/layout";

const t = messages.email.reviewRequest;

export type ReviewRequestItem = { name: string; image: string | null };

export function ReviewRequestEmail({
  firstName,
  orderNumber,
  items,
  reviewUrl,
  siteUrl,
  unsubscribeUrl,
}: {
  firstName: string | null;
  orderNumber: string;
  items: ReviewRequestItem[];
  reviewUrl: string;
  siteUrl: string;
  unsubscribeUrl: string;
}) {
  return (
    <EmailLayout preview={t.preview} siteUrl={siteUrl} why={t.why} unsubscribeUrl={unsubscribeUrl}>
      <Heading as="h1" style={{ ...text, fontSize: "24px", lineHeight: "30px", fontWeight: 800 }}>
        {t.heading}
      </Heading>
      <Text style={text}>
        {firstName
          ? fill(t.intro, { name: firstName, number: orderNumber })
          : fill(t.introNoName, { number: orderNumber })}
      </Text>
      {items.map((item) => (
        <Section key={item.name} style={{ margin: "0 0 8px" }}>
          {item.image?.startsWith("https://") && (
            <Img
              src={item.image}
              alt=""
              width="56"
              height="56"
              style={{ borderRadius: "12px", display: "inline-block", verticalAlign: "middle" }}
            />
          )}
          <Text
            style={{
              ...text,
              display: "inline-block",
              margin: "0 0 0 12px",
              fontWeight: 700,
              verticalAlign: "middle",
            }}
          >
            {item.name}
          </Text>
        </Section>
      ))}
      <Section style={{ marginTop: "12px" }}>
        <Button href={reviewUrl}>{t.cta}</Button>
      </Section>
      <Text style={{ ...small, marginTop: "12px" }}>{t.signIn}</Text>
      <Text style={small}>{t.problem}</Text>
    </EmailLayout>
  );
}
