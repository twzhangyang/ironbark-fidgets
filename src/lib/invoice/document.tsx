/**
 * The tax invoice PDF (react-pdf). Same order data as the emails, so the two always match.
 * Built-in Helvetica only covers Latin text: fine for our product names; a non-Latin customer
 * name would print blank (would need an embedded font).
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { fill, messages } from "@/content/messages";
import type { EmailOrder } from "@/lib/email/order-data";
import { formatAud } from "@/lib/money";

const t = messages.invoice;
const ink = "#2b2118";
const muted = "#7a6a5c";
const line = "#e8ddd0";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: ink, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right", marginBottom: 4 },
  right: { textAlign: "right", color: muted },
  meta: { flexDirection: "row", gap: 24, marginBottom: 20 },
  metaBlock: { flex: 1 },
  label: { color: muted, fontSize: 8, textTransform: "uppercase", marginBottom: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", paddingVertical: 6, borderBottom: `1 solid ${line}` },
  head: { borderBottom: `1 solid ${ink}`, paddingVertical: 4 },
  desc: { flex: 1, paddingRight: 8 },
  qty: { width: 40, textAlign: "right" },
  money: { width: 70, textAlign: "right" },
  sub: { color: muted, fontSize: 9 },
  totals: { marginTop: 10, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { borderTop: `1 solid ${ink}`, marginTop: 4, paddingTop: 4 },
  note: { marginTop: 20, color: muted },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, color: muted, fontSize: 8 },
});

const longDate = (d: Date) =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);

export function InvoiceDocument({
  order,
  taxInvoice,
}: {
  order: EmailOrder;
  /** GST registered: "Tax invoice" with the GST amount; otherwise a plain invoice. */
  taxInvoice: boolean;
}) {
  const issued = order.paidAt ?? order.createdAt;
  const a = order.shippingAddress;
  const title = taxInvoice ? t.taxTitle : t.title;
  const total = (label: string, value: string, bold = false) => (
    <View style={[s.totalRow, ...(bold ? [s.grand] : [])]}>
      <Text style={bold ? s.bold : {}}>{label}</Text>
      <Text style={bold ? s.bold : {}}>{value}</Text>
    </View>
  );

  return (
    <Document title={`${title} ${order.orderNumber}`} author={messages.brand.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <View>
            <Text style={s.brand}>{messages.brand.name}</Text>
            <Text style={s.right}>{t.legalName}</Text>
            <Text style={s.right}>{t.abn}</Text>
            <Text style={s.right}>{messages.brand.email}</Text>
          </View>
        </View>

        <View style={s.meta}>
          <View style={s.metaBlock}>
            <Text style={s.label}>{t.number}</Text>
            <Text style={s.bold}>{order.orderNumber}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>{t.date}</Text>
            <Text>{longDate(issued)}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.label}>{t.billTo}</Text>
            {order.customerName && <Text>{order.customerName}</Text>}
            {order.email && <Text>{order.email}</Text>}
          </View>
          {a && (
            <View style={s.metaBlock}>
              <Text style={s.label}>{t.shipTo}</Text>
              <Text>{[a.line1, a.line2].filter(Boolean).join(", ")}</Text>
              <Text>
                {a.city} {a.state} {a.postcode}
              </Text>
            </View>
          )}
        </View>

        <View style={[s.row, s.head]}>
          <Text style={[s.desc, s.bold]}>{t.description}</Text>
          <Text style={[s.qty, s.bold]}>{t.qty}</Text>
          <Text style={[s.money, s.bold]}>{t.unitPrice}</Text>
          <Text style={[s.money, s.bold]}>{t.amount}</Text>
        </View>
        {order.lines.map((l, i) => (
          <View key={i} style={s.row} wrap={false}>
            <View style={s.desc}>
              <Text>
                {l.name}
                {l.variantName ? ` (${l.variantName})` : ""}
              </Text>
              {l.contents && <Text style={s.sub}>{l.contents.join(" · ")}</Text>}
              {l.surpriseCount && (
                <Text style={s.sub}>
                  {fill(messages.email.order.surprise, { count: l.surpriseCount })}
                </Text>
              )}
            </View>
            <Text style={s.qty}>{l.qty}</Text>
            <Text style={s.money}>{formatAud(l.unitPriceCents)}</Text>
            <Text style={s.money}>{formatAud(l.unitPriceCents * l.qty)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          {total(t.subtotal, formatAud(order.subtotalCents))}
          {order.discountCents > 0 &&
            total(
              order.promoCode ? `${t.discount} (${order.promoCode})` : t.discount,
              `-${formatAud(order.discountCents)}`,
            )}
          {total(
            order.shippingMethod === "express" ? t.shippingExpress : t.shipping,
            order.shippingCents === 0 ? t.free : formatAud(order.shippingCents),
          )}
          {total(t.total, formatAud(order.totalCents), true)}
          {taxInvoice && total(t.gst, formatAud(order.gstCents))}
        </View>

        <Text style={s.note}>
          {fill(t.paid, { date: longDate(issued) })}
          {order.refundedAt ? ` ${fill(t.refunded, { date: longDate(order.refundedAt) })}` : ""}
        </Text>
        {taxInvoice && <Text style={{ color: muted }}>{t.gstNote}</Text>}

        <Text style={s.footer} fixed>
          {messages.brand.legal} {messages.brand.email}
        </Text>
      </Page>
    </Document>
  );
}
