import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import type { Period } from "@/lib/admin/dates";
import { getSalesCsv } from "@/lib/admin/queries";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const raw = request.nextUrl.searchParams.get("period");
  const period: Period = raw === "month" || raw === "lastMonth" ? raw : "week";
  const { start, csv } = await getSalesCsv(period);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(start);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ironbark-orders-${period}-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
