/**
 * Email settings from env. No `server-only`, so scripts can send too; nothing here reaches a
 * client bundle (only server code imports `@/lib/email`).
 */
import { z } from "zod";

const optionalEmail = z.preprocess((v) => (v === "" ? undefined : v), z.email().optional());

const schema = z.object({
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM_ORDERS: z.string().min(3),
  EMAIL_FROM_HELLO: z.string().min(3),
  EMAIL_REPLY_TO: optionalEmail,
  ORDER_ALERT_EMAIL: z.email(),
  /** When set, every email goes here instead (previews, and until the domain is verified). */
  EMAIL_REDIRECT_TO: optionalEmail,
  UNSUBSCRIBE_SECRET: z.string().min(32),
});

export type EmailConfig = z.infer<typeof schema>;

let cached: EmailConfig | undefined;

export function getEmailConfig(): EmailConfig {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))].join(", ");
    throw new Error(`Email settings missing or invalid: ${names}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
