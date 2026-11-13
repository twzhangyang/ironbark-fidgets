"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { messages } from "@/content/messages";

export function MobileMenu({
  links,
  categories,
}: {
  links: readonly { href: string; label: string }[];
  /** The shop's categories, one flat level. */
  categories: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" aria-label={messages.nav.menu} />}
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-cream">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">{messages.brand.name}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 overflow-y-auto px-4 pb-6">
          <Link
            href="/"
            onClick={close}
            className="rounded-lg px-3 py-2 font-semibold hover:bg-muted"
          >
            {messages.nav.home}
          </Link>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={close}
              className="rounded-lg px-3 py-2 font-semibold hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/account"
            onClick={close}
            className="rounded-lg px-3 py-2 font-semibold hover:bg-muted"
          >
            {messages.account.navLabel}
          </Link>
          <Link
            href="/search"
            onClick={close}
            className="rounded-lg px-3 py-2 font-semibold hover:bg-muted"
          >
            {messages.nav.search}
          </Link>
          <ul className="mt-3 space-y-1 border-t pt-3">
            {categories.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  onClick={close}
                  className="block rounded-lg px-3 py-2 font-semibold hover:bg-muted"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
