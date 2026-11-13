import { type EmailOrder, packNote } from "@/lib/email/order-data";
import { formatDate } from "@/lib/admin/dates";

/**
 * Packing slip (D5): big address for the label, every design with a tick box, no prices (it can
 * go in the parcel as a gift). One per printed page.
 */
export function PackingSlip({ order }: { order: EmailOrder }) {
  const a = order.shippingAddress;
  return (
    <article className="break-after-page space-y-5 rounded-2xl bg-white p-6 text-black ring-1 ring-border print:rounded-none print:p-0 print:ring-0">
      <header className="flex items-start justify-between gap-4 border-b pb-3">
        <div>
          <p className="font-heading text-xl font-semibold">Ironbark Fidgets</p>
          <p className="text-sm">
            Order {order.orderNumber} · {formatDate(order.paidAt)}
          </p>
        </div>
        <p className="text-right text-xs">
          BASK ADVENTURE PTY LTD
          <br />
          ABN 18 688 825 532
        </p>
      </header>

      {order.shippingMethod === "express" && (
        <p className="rounded-lg border-4 border-black px-3 py-2 text-center text-2xl font-black tracking-wide uppercase">
          Express Post
        </p>
      )}
      <section>
        <p className="text-xs font-semibold tracking-wide uppercase">Ship to</p>
        {a ? (
          <p className="text-2xl leading-snug font-semibold">
            {order.customerName}
            <br />
            {a.line1}
            {a.line2 && (
              <>
                <br />
                {a.line2}
              </>
            )}
            <br />
            {a.city} {a.state} {a.postcode}
          </p>
        ) : (
          <p className="text-destructive">No address on this order.</p>
        )}
        {order.phone && <p className="mt-1 text-sm">Phone {order.phone}</p>}
      </section>

      {order.customerNote && (
        <section className="rounded border-2 border-black p-2">
          <p className="text-xs font-semibold tracking-wide uppercase">Customer note</p>
          <p className="text-base font-semibold">{order.customerNote}</p>
        </section>
      )}

      <section>
        <p className="mb-2 text-xs font-semibold tracking-wide uppercase">Pack these</p>
        <table className="w-full text-base">
          <tbody>
            {order.pack.map((p) => (
              <tr key={p.sku} className="border-b last:border-0">
                <td className="w-8 py-2 align-top">
                  <span aria-hidden className="inline-block size-5 rounded border-2 border-black" />
                </td>
                <td className="w-12 py-2 align-top text-lg font-bold tabular-nums">{p.qty} ×</td>
                <td className="py-2 align-top">
                  {p.name}
                  <span className="ml-2 font-mono text-xs text-neutral-500">{p.sku}</span>
                  {packNote(p) && <span className="block font-bold">{packNote(p)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="text-sm">
        <p className="mb-1 text-xs font-semibold tracking-wide uppercase">As ordered</p>
        <ul className="space-y-0.5">
          {order.lines.map((l, i) => (
            <li key={i}>
              {l.qty} × {l.name}
              {l.variantName ? ` (${l.variantName})` : ""}
              {l.contents && <span className="text-neutral-500"> — {l.contents.join(", ")}</span>}
              {l.surpriseCount && (
                <span className="text-neutral-500">
                  {" "}
                  — blind box, {l.surpriseCount} surprise designs each
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t pt-3 text-sm">
        Thanks for shopping with us! Small parts: keep away from young children and pets. Questions:
        hello@ironbarkfidgets.com.au
      </footer>
    </article>
  );
}
