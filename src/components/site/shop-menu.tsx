import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { messages } from "@/content/messages";
import type { Collection } from "@/lib/types";

/**
 * Desktop "Shop" menu (Phase 8 D6): the shop categories, one flat level. Opens on hover and
 * on keyboard focus (CSS only, no JavaScript); the "Shop" link itself still goes to /shop.
 */
export function ShopMenu({ categories }: { categories: Collection[] }) {
  return (
    <div className="group relative">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1 rounded-full px-4 py-2 font-semibold transition hover:bg-muted"
      >
        {messages.nav.shop}
        <ChevronDown
          className="size-4 transition group-focus-within:rotate-180 group-hover:rotate-180"
          aria-hidden
        />
      </Link>
      {categories.length > 0 && (
        <div className="invisible absolute top-full left-0 z-50 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
          <div className="w-max rounded-3xl border bg-card p-5 shadow-xl">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/shop/${c.slug}`}
                    className="block rounded-lg px-2 py-1 font-heading font-semibold hover:bg-muted"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/shop"
              className="mt-4 inline-block border-t pt-3 text-sm font-semibold text-primary hover:underline"
            >
              {messages.nav.shopAll}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
