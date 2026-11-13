import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

import { fill, messages } from "@/content/messages";

export const colors = {
  cream: "#fff8ee",
  card: "#ffffff",
  cocoa: "#3d2a1f",
  muted: "#7a6558",
  primary: "#c24e27",
  butter: "#ffedb0",
  line: "#f0e2d0",
};

export const text = {
  color: colors.cocoa,
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0 0 12px",
};
export const small = { ...text, color: colors.muted, fontSize: "13px", lineHeight: "19px" };

/** Shared frame: brand header, card, Spam Act footer (D10), optional unsubscribe. */
export function EmailLayout({
  preview,
  siteUrl,
  children,
  why,
  unsubscribeUrl,
}: {
  preview: string;
  siteUrl: string;
  children: ReactNode;
  /** Marketing only: why they're getting it. */
  why?: string;
  unsubscribeUrl?: string;
}) {
  const t = messages.email;
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.cream,
          fontFamily: "Nunito, 'Helvetica Neue', Arial, sans-serif",
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container style={{ maxWidth: "560px", padding: "0 16px" }}>
          <Link
            href={siteUrl}
            style={{
              color: colors.cocoa,
              fontSize: "24px",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            {messages.brand.name}
          </Link>
          <Section
            style={{
              backgroundColor: colors.card,
              borderRadius: "20px",
              marginTop: "16px",
              padding: "24px",
            }}
          >
            {children}
          </Section>
          <Section style={{ padding: "16px 4px" }}>
            {why && <Text style={small}>{why}</Text>}
            <Text style={small}>{fill(t.footerContact, { email: messages.brand.email })}</Text>
            <Hr style={{ borderColor: colors.line }} />
            <Text style={small}>{t.footerLegal}</Text>
            {unsubscribeUrl && (
              <Text style={small}>
                <Link href={unsubscribeUrl} style={{ color: colors.muted }}>
                  {t.unsubscribe}
                </Link>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function Button({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        backgroundColor: colors.primary,
        borderRadius: "999px",
        color: "#ffffff",
        display: "inline-block",
        fontSize: "15px",
        fontWeight: 700,
        padding: "12px 24px",
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}
