/** Shared DB connection for scripts (session pooler, one connection). */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDirectUrl } from "../src/lib/db/env";
import * as schema from "../src/lib/db/schema";

export function connect() {
  const sql = postgres(getDirectUrl(), { max: 1, onnotice: () => {} });
  return { sql, db: drizzle(sql, { schema }) };
}

export const errorMessage = (e: unknown) => {
  const err = e as { message?: string; cause?: { message?: string } };
  return (err.cause?.message ?? err.message ?? String(e)).replace(
    /postgres(ql)?:\/\/\S+/g,
    "<url>",
  );
};
