import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ReleaseHold } from "@/components/checkout/release-hold";
import { Container } from "@/components/site/container";
import { OpenCartButton } from "@/components/cart/open-cart-button";
import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/content/messages";
import { cn } from "@/lib/utils";

const t = messages.checkout;

export const metadata: Metadata = { title: "Checkout cancelled", robots: { index: false } };

export default function CancelledPage({ searchParams }: PageProps<"/checkout/cancelled">) {
  return (
    <Container className="max-w-2xl space-y-4 py-12 md:py-16">
      <Suspense>
        <Release searchParams={searchParams} />
      </Suspense>
      <h1 className="text-3xl font-semibold">{t.cancelledTitle}</h1>
      <p className="text-muted-foreground">{t.cancelledText}</p>
      <div className="flex flex-wrap gap-2">
        <OpenCartButton />
        <Link
          href="/shop"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full")}
        >
          {t.keepShopping}
        </Link>
      </div>
    </Container>
  );
}

async function Release({ searchParams }: Pick<PageProps<"/checkout/cancelled">, "searchParams">) {
  const { order } = await searchParams;
  return typeof order === "string" ? <ReleaseHold orderId={order} /> : null;
}
