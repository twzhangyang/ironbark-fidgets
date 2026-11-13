import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { emailOptouts, subscribers } from "@/lib/db/schema";
import { getEmailConfig } from "@/lib/email/config";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

/** Stops all marketing to the token's email. Returns the email, or null for a bad token. */
export async function unsubscribeByToken(token: string): Promise<string | null> {
  const email = verifyUnsubscribeToken(token, getEmailConfig().UNSUBSCRIBE_SECRET);
  if (!email) return null;
  await db
    .update(subscribers)
    .set({ unsubscribedAt: new Date() })
    .where(and(eq(subscribers.email, email), isNull(subscribers.unsubscribedAt)));
  await db.insert(emailOptouts).values({ email }).onConflictDoNothing();
  return email;
}

export function emailFromToken(token: string): string | null {
  return verifyUnsubscribeToken(token, getEmailConfig().UNSUBSCRIBE_SECRET);
}
