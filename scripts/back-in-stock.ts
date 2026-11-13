/**
 * Sends due back-in-stock alerts (Phase 5's restock screen will call this automatically).
 *   pnpm alerts:back-in-stock [--dry-run]
 */
import { resendSender } from "../src/lib/email/client";
import { sendBackInStockAlerts } from "../src/lib/email/send";
import { connect, errorMessage } from "./_db";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { sql, db } = connect();
  try {
    const r = await sendBackInStockAlerts(db, resendSender, { dryRun });
    console.log(
      dryRun
        ? `${r.due} alert(s) due (dry run, nothing sent)`
        : `✓ sent ${r.sent} of ${r.due} alert(s)`,
    );
  } catch (e) {
    console.error("✗", errorMessage(e));
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
