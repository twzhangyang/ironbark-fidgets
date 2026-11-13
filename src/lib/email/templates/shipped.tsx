import { Heading, Section, Text } from "@react-email/components";

import { fill, messages } from "@/content/messages";
import type { EmailOrder } from "@/lib/email/order-data";
import { Button, EmailLayout, small, text } from "@/lib/email/templates/layout";
import { firstName, OrderLines, ShippingAddress } from "@/lib/email/templates/order-parts";

const t = messages.email.shipped;

export const trackingUrl = (number: string) =>
  `https://auspost.com.au/mypost/track/details/${encodeURIComponent(number)}`;

export function ShippedEmail({
  order,
  siteUrl,
  trackingNumber,
}: {
  order: EmailOrder;
  siteUrl: string;
  trackingNumber: string;
}) {
  return (
    <EmailLayout preview={t.preview} siteUrl={siteUrl}>
      <Heading as="h1" style={{ ...text, fontSize: "24px", lineHeight: "30px", fontWeight: 800 }}>
        {t.heading}
      </Heading>
      <Text style={text}>
        {fill(t.intro, { name: firstName(order.customerName), number: order.orderNumber })}
      </Text>
      <Text style={{ ...text, fontWeight: 700 }}>
        {fill(t.tracking, { number: trackingNumber })}
      </Text>
      <Section style={{ margin: "8px 0 16px" }}>
        <Button href={trackingUrl(trackingNumber)}>{t.track}</Button>
      </Section>
      <Text style={{ ...text, fontWeight: 800, margin: "16px 0 0" }}>{t.items}</Text>
      <OrderLines order={order} />
      <ShippingAddress order={order} title={messages.email.order.shipTo} />
      <Text style={{ ...small, marginTop: "16px" }}>{messages.email.order.care}</Text>
    </EmailLayout>
  );
}
