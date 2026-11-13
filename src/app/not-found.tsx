import Link from "next/link";

import { AnnouncementBar } from "@/components/site/announcement-bar";
import { Container } from "@/components/site/container";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/content/messages";
import { cn } from "@/lib/utils";

const t = messages.pages.notFound;

/** Rendered outside the (shop) layout, so it brings the shop chrome itself. */
export default function NotFound() {
  return (
    <>
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">
        <Container className="flex flex-col items-center gap-4 py-24 text-center">
          <span aria-hidden className="size-20 rounded-full bg-butter ring-8 ring-peach" />
          <h1 className="text-3xl font-semibold">{t.title}</h1>
          <p className="text-muted-foreground">{t.text}</p>
          <Link
            href="/shop"
            className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-6")}
          >
            {t.cta}
          </Link>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
