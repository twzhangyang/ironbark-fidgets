/**
 * Invoice PDF for a paid order: `/api/invoice/<order id>?t=<signature>` (src/lib/invoice/token.ts).
 * The signed link is the access check, so guests can open it straight from their email.
 */
import { renderToBuffer } from "@react-pdf/renderer";

import { db } from "@/lib/db/client";
import { loadEmailOrder } from "@/lib/email/order-data";
import { InvoiceDocument } from "@/lib/invoice/document";
import { checkInvoiceToken } from "@/lib/invoice/token";
import { GST_REGISTERED } from "@/lib/site";

/** Paid at some point. Cancelled and unpaid checkouts have no invoice. */
const INVOICED = new Set(["paid", "packed", "shipped", "refunded"]);

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(request: Request, { params }: RouteContext<"/api/invoice/[id]">) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t");
  if (!/^[0-9a-f-]{36}$/.test(id) || !checkInvoiceToken(id, token)) return notFound();

  const order = await loadEmailOrder(db, id);
  if (!order || !INVOICED.has(order.status) || !order.paidAt) return notFound();

  const pdf = await renderToBuffer(InvoiceDocument({ order, taxInvoice: GST_REGISTERED }));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Ironbark-invoice-${order.orderNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
