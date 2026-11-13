import { Search, UserRound } from "lucide-react";
import Link from "next/link";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { Container } from "@/components/site/container";
import { Logo } from "@/components/site/logo";
import { MobileMenu } from "@/components/site/mobile-menu";
import { NAV_LINKS } from "@/components/site/nav-links";
import { ShopMenu } from "@/components/site/shop-menu";
import { messages } from "@/content/messages";
import { getBundles, getShopCategories } from "@/lib/catalog";

export async function SiteHeader() {
  const shopCategories = await getShopCategories();
  const categories = shopCategories.map((c) => ({ href: `/shop/${c.slug}`, label: c.name }));
  // No box on sale (e.g. before launch): don't link to an empty Gift Boxes page.
  const hasBoxes = (await getBundles()).length > 0;
  const links = NAV_LINKS.filter((l) => hasBoxes || l.href !== "/boxes");
  return (
    <header className="sticky top-0 z-40 border-b bg-cream/90 backdrop-blur">
      <Container className="flex h-16 items-center gap-2">
        <div className="md:hidden">
          <MobileMenu links={links} categories={categories} />
        </div>
        <Logo className="mr-auto md:mr-0" />
        <nav className="ml-8 hidden flex-1 items-center gap-1 md:flex">
          <ShopMenu categories={shopCategories} />
          {links
            .filter((l) => l.href !== "/shop")
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-2 font-semibold transition hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
        </nav>
        <Link
          href="/search"
          aria-label={messages.nav.search}
          className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
        >
          <Search className="size-5" aria-hidden />
        </Link>
        {/* Static link: the header never reads the session, so shop pages stay cached. */}
        <Link
          href="/account"
          aria-label={messages.account.navLabel}
          className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
        >
          <UserRound className="size-5" aria-hidden />
        </Link>
        <CartDrawer showBoxes={hasBoxes} />
      </Container>
    </header>
  );
}
