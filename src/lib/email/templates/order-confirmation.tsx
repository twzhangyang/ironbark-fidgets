import { Heading, Section, Text } from "@react-email/components";

import { fill, messages } from "@/content/messages";
import type { EmailOrder } from "@/lib/email/order-data";
import { Button, EmailLayout, small, text } from "@/lib/email/templates/layout";
import {
  firstName,
  OrderLines,
  OrderNote,
  OrderTotals,
  ShippingAddress,
} from "@/lib/email/templates/order-parts";

const t = messages.email.order;

/** Order details email. The (tax) invoice is the PDF behind `invoiceUrl`, not this email. */
export function OrderConfirmationEmail({
  order,
  siteUrl,
  invoiceUrl,
  taxInvoice,
}: {
  order: EmailOrder;
  siteUrl: string;
  /** Signed link to the invoice PDF; null hides the button (e.g. test emails). */
  invoiceUrl: string | null;
  taxInvoice: boolean;
}) {
  return (
    <EmailLayout preview={t.preview} siteUrl={siteUrl}>
      <Heading as="h1" style={{ ...text, fontSize: "24px", lineHeight: "30px", fontWeight: 800 }}>
        {t.heading}
      </Heading>
      <Text style={text}>
        {fill(t.intro, { name: firstName(order.customerName), number: order.orderNumber })}
      </Text>
      <Text style={{ ...text, fontWeight: 800, margin: "16px 0 0" }}>{t.items}</Text>
      <OrderLines order={order} />
      <OrderTotals order={order} />
      {invoiceUrl && (
        <Section style={{ marginTop: "16px" }}>
          <Button href={invoiceUrl}>
            {taxInvoice ? messages.invoice.download : messages.invoice.downloadPlain}
          </Button>
        </Section>
      )}
      <ShippingAddress order={order} title={t.shipTo} />
      <OrderNote order={order} title={messages.checkout.note.yours} />
      <Text style={{ ...small, marginTop: "16px" }}>{t.care}</Text>
      <Text style={small}>{t.returns}</Text>
    </EmailLayout>
  );
}
