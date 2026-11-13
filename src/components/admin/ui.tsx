import Link from "next/link";

import type { OrderStatus } from "@/lib/admin/orders";
import { cn } from "@/lib/utils";

/** Small shared pieces for admin pages (English, owner-only). */
export function PageTitle({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <h1 className="font-heading text-2xl font-semibold">{children}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-card p-4 ring-1 ring-border", className)}>
      {children}
    </section>
  );
}

const statusStyle: Record<OrderStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  paid: "bg-butter text-cocoa",
  packed: "bg-sky text-cocoa",
  shipped: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-destructive/10 text-destructive",
};
const statusLabel: Record<OrderStatus, string> = {
  pending: "Checking out",
  paid: "To pack",
  packed: "Packed",
  shipped: "Shipped",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        statusStyle[status],
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium underline underline-offset-2 hover:text-primary">
      {children}
    </Link>
  );
}

export const linkButton =
  "inline-flex h-9 items-center justify-center rounded-full border bg-background px-4 text-sm font-medium hover:bg-muted";
