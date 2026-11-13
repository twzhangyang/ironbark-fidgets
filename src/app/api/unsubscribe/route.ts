/** One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe header. */
import { unsubscribeByToken } from "@/lib/email/unsubscribe-db";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const email = await unsubscribeByToken(token);
  return new Response(email ? "Unsubscribed" : "Invalid link", { status: email ? 200 : 400 });
}
