import { Heading, Link, Text } from "@react-email/components";

import { fill, messages } from "@/content/messages";
import { type EmailOrder, packNote } from "@/lib/email/order-data";
import { colors, EmailLayout, small, text } from "@/lib/email/templates/layout";
import {
  OrderLines,
  OrderNote,
  OrderTotals,
  ShippingAddress,
} from "@/lib/email/templates/order-parts";

const t = messages.email.alert;

/** Owner-only: what to pack (incl. blind-box picks), address, customer contact. */
export function OrderAlertEmail({
  order,
  siteUrl,
  stripeUrl,
}: {
  order: EmailOrder;
  siteUrl: string;
  /** Link to the payment in the Stripe dashboard, when known. */
  stripeUrl: string | null;
}) {
  return (
    <EmailLayout preview={fill(t.heading, { number: order.orderNumber })} siteUrl={siteUrl}>
      <Heading as="h1" style={{ ...text, fontSize: "22px", fontWeight: 800 }}>
        {fill(t.heading, { number: order.orderNumber })}
      </Heading>
      {order.shippingMethod === "express" && (
        <Text
          style={{
            ...text,
            fontWeight: 800,
            margin: "8px 0",
            padding: "8px 12px",
            background: colors.primary,
            color: "#ffffff",
            borderRadius: "8px",
          }}
        >
          {t.express}
        </Text>
      )}
      <OrderNote order={order} title={messages.checkout.note.owner} />
      <Text style={{ ...text, fontWeight: 800, margin: "8px 0 4px" }}>{t.pack}</Text>
      {order.pack.map((p) => (
        <Text
          key={p.sku}
          style={{ ...text, margin: 0, padding: "4px 0", borderBottom: `1px solid ${colors.line}` }}
        >
          <strong>{p.qty} ×</strong> {p.name} <span style={{ color: colors.muted }}>{p.sku}</span>
          {packNote(p) && <strong> · {packNote(p)}</strong>}
        </Text>
      ))}
      <Text style={{ ...text, fontWeight: 800, margin: "16px 0 0" }}>{t.boxes}</Text>
      <OrderLines order={order} />
      <OrderTotals order={order} />
      <ShippingAddress order={order} title={t.shipTo} />
      <Text style={{ ...text, fontWeight: 800, margin: "16px 0 4px" }}>{t.customer}</Text>
      <Text style={{ ...text, margin: 0 }}>
        {order.email}
        {order.phone ? ` · ${order.phone}` : ""}
      </Text>
      {stripeUrl && (
        <Text style={small}>
          <Link href={stripeUrl} style={{ color: colors.primary }}>
            {t.stripe}
          </Link>
        </Text>
      )}
    </EmailLayout>
  );
}
