import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { messages } from "@/content/messages";
import { getSiteUrl } from "@/lib/site";

export type Crumb = { name: string; href: string };

/** Shop › Animals › Cats (Phase 8 D7), with `BreadcrumbList` data for Google. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const site = getSiteUrl().replace(/\/$/, "");
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${site}${c.href}`,
    })),
  };
  return (
    <nav aria-label={messages.shop.breadcrumb} className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="font-semibold text-foreground">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link href={c.href} className="hover:text-foreground hover:underline">
                    {c.name}
                  </Link>
                  <ChevronRight className="size-3.5" aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
      <script
        type="application/ld+json"
        // JSON from our own catalogue; "<" escaped so a name can't close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
      />
    </nav>
  );
}
