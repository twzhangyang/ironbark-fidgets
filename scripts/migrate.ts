/**
 * Runs pending migrations with a readable error (drizzle-kit's CLI hides it).
 *   pnpm db:migrate
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { getDirectUrl } from "../src/lib/db/env";

async function main() {
  const sql = postgres(getDirectUrl(), { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
    console.log("✓ migrations applied");
  } catch (error) {
    const e = error as {
      message?: string;
      code?: string;
      detail?: string;
      hint?: string;
      cause?: unknown;
    };
    const cause = (e.cause ?? {}) as { message?: string; code?: string; detail?: string };
    console.error(
      "✗ migration failed:",
      cause.message ?? e.message,
      cause.code ?? e.code ?? "",
      cause.detail ?? e.detail ?? "",
    );
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
