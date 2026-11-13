import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/db/env";
import * as schema from "@/lib/db/schema";

// Connects as the `postgres` role (bypasses RLS), so this must never reach a client bundle.
// RLS (no public policies) keeps the public Supabase Data API from reading anything.
function createClient() {
  const sql = postgres(getDatabaseUrl(), {
    // Supabase's transaction pooler doesn't support prepared statements.
    prepare: false,
    max: 5,
    idle_timeout: 20,
  });
  return drizzle(sql, { schema });
}

// Reuse one pool across dev hot reloads.
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createClient> };

export const db = globalForDb.db ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
