/**
 * Sends due review request emails (also runs daily via Vercel Cron).
 *   pnpm email:reviews [--dry-run]
 */
import { resendSender } from "../src/lib/email/client";
import { sendReviewRequests } from "../src/lib/email/review-requests";
import { connect, errorMessage } from "./_db";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { sql, db } = connect();
  try {
    const r = await sendReviewRequests(db, resendSender, { dryRun });
    console.log(
      dryRun
        ? `${r.due} review request(s) due (dry run, nothing sent)`
        : `✓ sent ${r.sent} review request(s)`,
    );
  } catch (e) {
    console.error("✗", errorMessage(e));
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
