import { defineConfig } from "drizzle-kit";

import { getDirectUrl } from "./src/lib/db/env";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI): use the real environment.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: getDirectUrl() },
  strict: true,
  verbose: true,
});
