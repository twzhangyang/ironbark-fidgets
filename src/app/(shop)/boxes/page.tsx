import type { Metadata } from "next";
import Link from "next/link";

import { BoxGrid } from "@/components/box/box-card";
import { Container } from "@/components/site/container";
import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/content/messages";
import { getBundles } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const t = messages.box;

export const metadata: Metadata = {
  title: t.listTitle,
  description: t.listText,
  alternates: { canonical: "/boxes" },
};

export default async function BoxesPage() {
  const boxes = await getBundles();
  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-8 max-w-2xl space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t.listTitle}</h1>
        <p className="text-muted-foreground">{t.listText}</p>
      </header>
      {boxes.length > 0 ? (
        <BoxGrid boxes={boxes} priorityCount={3} />
      ) : (
        <div className="rounded-3xl bg-muted/60 p-8 text-center sm:p-12">
          <p className="mx-auto max-w-md text-lg">{t.listEmpty}</p>
          <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full")}>
            {t.listEmptyCta}
          </Link>
        </div>
      )}
    </Container>
  );
}
