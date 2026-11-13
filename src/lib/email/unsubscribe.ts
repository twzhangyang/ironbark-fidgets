/**
 * Signed unsubscribe tokens: `<email, base64url>.<HMAC-SHA256, base64url>`. No database row
 * needed to verify, and they can't be forged for someone else's address.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const sign = (email: string, secret: string) =>
  createHmac("sha256", secret).update(`unsubscribe:${email}`).digest("base64url");

export function createUnsubscribeToken(email: string, secret: string): string {
  const normalised = email.trim().toLowerCase();
  return `${Buffer.from(normalised).toString("base64url")}.${sign(normalised, secret)}`;
}

/** The email the token was made for, or null if it's invalid. */
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const email = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = Buffer.from(sign(email, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return email;
}

/** "ja***@gmail.com", for showing on the unsubscribe page. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}
