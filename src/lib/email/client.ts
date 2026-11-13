import { Resend } from "resend";

import { getEmailConfig } from "@/lib/email/config";

export type OutgoingEmail = {
  /** `orders` = transactional sender, `hello` = marketing sender. */
  from: "orders" | "hello";
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  /** Resend refuses a second email with the same key (for 24 h). */
  idempotencyKey?: string;
};

/** Sends one email or throws. Swappable so tests and dry runs use a fake. */
export type EmailSender = (email: OutgoingEmail) => Promise<void>;

let resend: Resend | undefined;

export const resendSender: EmailSender = async (email) => {
  const config = getEmailConfig();
  resend ??= new Resend(config.RESEND_API_KEY);
  const redirect = config.EMAIL_REDIRECT_TO;
  const { error } = await resend.emails.send(
    {
      from: email.from === "orders" ? config.EMAIL_FROM_ORDERS : config.EMAIL_FROM_HELLO,
      to: redirect ?? email.to,
      subject: redirect ? `[to: ${email.to}] ${email.subject}` : email.subject,
      html: email.html,
      text: email.text,
      replyTo: config.EMAIL_REPLY_TO,
      headers: email.headers,
    },
    email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined,
  );
  // Same key, different content: this email was already sent, by another deployment
  // answering the same Stripe event (in test mode every endpoint gets every event, and the
  // links differ per deployment). Treat it as sent, so the webhook doesn't fail and retry.
  if (error?.name === "invalid_idempotent_request") return;
  // Error name only: never log addresses or content.
  if (error) throw new Error(`Resend: ${error.name}`);
};

/** Waits between marketing sends (Resend's default limit is a few requests a second). */
export const pause = (ms = 600) => new Promise((r) => setTimeout(r, ms));
