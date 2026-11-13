import { z } from "zod";

const postgresUrl = z
  .url({ protocol: /^postgres(ql)?$/ })
  // Prisma-style flag from Supabase's connection strings; postgres.js would
  // forward unknown query params to the server as runtime parameters.
  .transform((value) => {
    const url = new URL(value);
    url.searchParams.delete("pgbouncer");
    return url.toString();
  });

/** Pooled (transaction mode, port 6543) connection used by the app at runtime. */
export function getDatabaseUrl(): string {
  return parse("DATABASE_URL");
}

/** Session/direct (port 5432) connection used by migrations and the seed. */
export function getDirectUrl(): string {
  return parse("DIRECT_URL");
}

function parse(name: "DATABASE_URL" | "DIRECT_URL"): string {
  const result = postgresUrl.safeParse(process.env[name]);
  if (!result.success) {
    throw new Error(`${name} is missing or not a postgres:// URL. See .env.example.`);
  }
  return result.data;
}
