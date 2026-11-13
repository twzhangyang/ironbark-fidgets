import { Column, Hr, Row, Section, Text } from "@react-email/components";

import { fill, messages } from "@/content/messages";
import type { EmailOrder } from "@/lib/email/order-data";
import { colors, small, text } from "@/lib/email/templates/layout";
import { formatAud } from "@/lib/money";

const t = messages.email.order;

export function OrderLines({ order }: { order: EmailOrder }) {
  return (
    <Section>
      {order.lines.map((l, i) => (
        <Row key={i} style={{ borderBottom: `1px solid ${colors.line}`, padding: "8px 0" }}>
          <Column>
            <Text style={{ ...text, margin: 0, fontWeight: 700 }}>
              {l.qty} × {l.name}
              {l.variantName ? ` (${l.variantName})` : ""}
            </Text>
            {l.contents && <Text style={{ ...small, margin: 0 }}>{l.contents.join(" · ")}</Text>}
            {l.surpriseCount && (
              <Text style={{ ...small, margin: 0 }}>
                {fill(t.surprise, { count: l.surpriseCount })}
              </Text>
            )}
          </Column>
          <Column align="right" style={{ verticalAlign: "top", width: "90px" }}>
            <Text style={{ ...text, margin: 0 }}>{formatAud(l.unitPriceCents * l.qty)}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

export function OrderTotals({ order }: { order: EmailOrder }) {
  const row = (label: string, value: string, strong = false) => (
    <Row>
      <Column>
        <Text style={{ ...text, margin: "2px 0", fontWeight: strong ? 800 : 400 }}>{label}</Text>
      </Column>
      <Column align="right">
        <Text style={{ ...text, margin: "2px 0", fontWeight: strong ? 800 : 400 }}>{value}</Text>
      </Column>
    </Row>
  );
  return (
    <Section style={{ marginTop: "8px" }}>
      {row(t.subtotal, formatAud(order.subtotalCents))}
      {order.discountCents > 0 &&
        row(
          order.promoCode ? `${t.discount} (${order.promoCode})` : t.discount,
          `−${formatAud(order.discountCents)}`,
        )}
      {row(
        order.shippingMethod === "express" ? t.shippingExpress : t.shipping,
        order.shippingCents === 0 ? t.free : formatAud(order.shippingCents),
      )}
      <Hr style={{ borderColor: colors.line, margin: "6px 0" }} />
      {row(t.total, formatAud(order.totalCents), true)}
      <Text style={{ ...small, margin: "2px 0" }}>
        {fill(t.gst, { amount: formatAud(order.gstCents) })}
      </Text>
    </Section>
  );
}

export function ShippingAddress({ order, title }: { order: EmailOrder; title: string }) {
  const a = order.shippingAddress;
  if (!a) return null;
  return (
    <Section style={{ marginTop: "16px" }}>
      <Text style={{ ...text, fontWeight: 800, margin: "0 0 4px" }}>{title}</Text>
      <Text style={{ ...text, margin: 0 }}>
        {order.customerName}
        <br />
        {[a.line1, a.line2].filter(Boolean).join(", ")}
        <br />
        {a.city} {a.state} {a.postcode}
      </Text>
    </Section>
  );
}

export const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";

/** Phase 14: the customer's note (owner alert and confirmation). Nothing when there's none. */
export function OrderNote({ order, title }: { order: EmailOrder; title: string }) {
  if (!order.customerNote) return null;
  return (
    <Section
      style={{
        marginTop: "16px",
        padding: "8px 12px",
        background: colors.line,
        borderRadius: "8px",
      }}
    >
      <Text style={{ ...text, fontWeight: 800, margin: 0 }}>{title}</Text>
      <Text style={{ ...text, margin: 0 }}>{order.customerNote}</Text>
    </Section>
  );
}
