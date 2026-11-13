import Link from "next/link";

import { signOut } from "@/actions/admin/session";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/admin", label: "Home" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/boxes", label: "Boxes" },
  { href: "/admin/collections", label: "Categories" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/sales", label: "Sales" },
] as const;

export function AdminNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link href="/admin" className="flex shrink-0 items-center gap-2 font-heading font-semibold">
          <span aria-hidden className="size-5 rounded-full bg-butter ring-4 ring-peach" />
          Admin
        </Link>
        <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-3 py-1.5 font-medium hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
