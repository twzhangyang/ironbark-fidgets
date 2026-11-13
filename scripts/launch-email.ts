/**
 * Launch email to the waitlist (launch day, Phase 6). Dry run by default: counts the
 * waitlist and sends one preview to the owner.
 *   pnpm email:launch [--code ARVO10]            dry run
 *   pnpm email:launch --send [--code ARVO10]     really send (never twice to anyone)
 */
import { resendSender } from "../src/lib/email/client";
import { sendLaunchEmail } from "../src/lib/email/send";
import { connect, errorMessage } from "./_db";

async function main() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const codeAt = args.indexOf("--code");
  const promoCode = codeAt >= 0 ? (args[codeAt + 1] ?? null) : null;
  const { sql, db } = connect();
  try {
    const r = await sendLaunchEmail(db, resendSender, { dryRun: !send, promoCode });
    console.log(
      send
        ? `✓ sent ${r.sent} of ${r.waiting}`
        : `${r.waiting} on the waitlist. Preview sent to the owner (nothing else sent).`,
    );
  } catch (e) {
    console.error("✗", errorMessage(e));
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
