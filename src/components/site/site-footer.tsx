import Link from "next/link";

import { Container } from "@/components/site/container";
import { Logo } from "@/components/site/logo";
import { messages } from "@/content/messages";
import { getBundles, getShopCategories } from "@/lib/catalog";

const t = messages.footer;

const HELP_LINKS = [
  { href: "/safety", label: t.links.safety },
  { href: "/shipping-returns", label: t.links.shipping },
  { href: "/faq", label: t.links.faq },
  { href: "/guides", label: t.links.guides },
  { href: "/contact", label: t.links.contact },
];

export async function SiteFooter() {
  const collections = await getShopCategories();
  const hasBoxes = (await getBundles()).length > 0;
  return (
    <footer className="mt-16 border-t bg-muted/60">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{messages.brand.tagline}</p>
        </div>
        <FooterColumn title={t.shop}>
          <FooterLink href="/shop">{t.allProducts}</FooterLink>
          {collections.map((c) => (
            <FooterLink key={c.id} href={`/shop/${c.slug}`}>
              {c.name}
            </FooterLink>
          ))}
          {hasBoxes && <FooterLink href="/boxes">{messages.nav.boxes}</FooterLink>}
        </FooterColumn>
        <FooterColumn title={t.help}>
          {HELP_LINKS.map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </FooterColumn>
        <FooterColumn title={t.follow}>
          <FooterLink href={messages.brand.instagram}>Instagram</FooterLink>
          <FooterLink href={messages.brand.tiktok}>TikTok</FooterLink>
          <FooterLink href={`mailto:${messages.brand.email}`}>{messages.brand.email}</FooterLink>
        </FooterColumn>
      </Container>
      <Container className="flex flex-col gap-2 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{messages.brand.legal}</p>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            {t.links.privacy}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t.links.terms}
          </Link>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  return (
    <li>
      {external ? (
        <a href={href} className="text-muted-foreground hover:text-foreground">
          {children}
        </a>
      ) : (
        <Link href={href} className="text-muted-foreground hover:text-foreground">
          {children}
        </Link>
      )}
    </li>
  );
}
