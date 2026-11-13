"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { getCart } from "@/actions/cart";
import { startCheckout } from "@/actions/checkout";
import { cart, useCart } from "@/components/cart/cart-store";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { fill, messages } from "@/content/messages";
import { type CartLine, itemCount } from "@/lib/checkout/cart";
import type { CartDetails, CartLineDetails } from "@/lib/checkout/cart-details";
import { formatAud } from "@/lib/money";
import {
  EXPRESS_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  MAX_ITEMS_PER_ORDER,
  MAX_QTY_PER_LINE,
} from "@/lib/site";
import { cn } from "@/lib/utils";

const t = messages.cart;

/** Header bag button + slide-out cart (Phase 3 §2). Prices and stock always come fresh. */
export function CartDrawer({ showBoxes = true }: { showBoxes?: boolean }) {
  const { lines, open, ready } = useCart();
  const [fetched, setFetched] = useState<{ for: CartLine[]; details: CartDetails } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [redirecting, startRedirect] = useTransition();
  const count = itemCount(lines);

  useEffect(() => {
    if (!open || lines.length === 0) return;
    let cancelled = false;
    getCart(lines).then((details) => {
      if (cancelled) return;
      setFetched({ for: lines, details });
      // Keep the stored cart in line with what can be bought (lowered quantities).
      if (details.lines.some((l) => l.status === "reduced")) {
        cart.replace(details.lines.map((l) => l.line));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, lines, refresh]);

  const details = fetched?.for === lines ? fetched.details : null;
  const loading = lines.length > 0 && !details;

  function checkout() {
    setError(null);
    startRedirect(async () => {
      const result = await startCheckout(lines);
      if (result.ok) {
        window.location.assign(result.url);
        return;
      }
      const name = result.index !== undefined ? (details?.lines[result.index]?.name ?? "") : "";
      setError(
        result.error === "sold_out"
          ? fill(t.errorSoldOut, { name })
          : result.error === "unavailable"
            ? fill(t.errorUnavailable, { name })
            : result.error === "test_only"
              ? fill(t.errorTestOnly, { name })
              : result.error === "limit"
                ? fill(t.errorLimit, { max: MAX_ITEMS_PER_ORDER, perLine: MAX_QTY_PER_LINE })
                : result.error === "stripe"
                  ? t.errorStripe
                  : t.errorGeneric,
      );
      setRefresh((n) => n + 1);
    });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? cart.open() : cart.close())}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label={fill(messages.nav.cartCount, { count })}
            className="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
          />
        }
      >
        <ShoppingBag className="size-5" aria-hidden />
        {ready && count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.7rem] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 bg-cream sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-heading text-xl">{t.title}</SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-base">{t.empty}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/shop"
                onClick={cart.close}
                className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
              >
                {t.emptyShop}
              </Link>
              {showBoxes && (
                <Link
                  href="/boxes"
                  onClick={cart.close}
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full")}
                >
                  {t.emptyBoxes}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-4" aria-busy={loading}>
              {(details?.lines ?? []).map((l) => (
                <CartRow key={l.key} line={l} />
              ))}
              {loading && <li className="py-6 text-muted-foreground">{t.loading}</li>}
            </ul>
            <CartFooter
              details={details}
              error={error}
              busy={redirecting || loading}
              redirecting={redirecting}
              onCheckout={checkout}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartRow({ line: l }: { line: CartLineDetails }) {
  const blocked = l.status === "sold_out" || l.status === "unavailable";
  // A gone item has no name: call it "Removed item"; the line below says why once.
  const name = l.name || messages.cart.unavailableName;
  return (
    <li className="flex gap-3 py-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
        {l.image && <Image src={l.image} alt="" fill sizes="80px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {l.href ? (
              <Link href={l.href} onClick={cart.close} className="font-semibold hover:underline">
                {name}
              </Link>
            ) : (
              <span className="font-semibold">{name}</span>
            )}
            {l.variantName && <p className="text-sm text-muted-foreground">{l.variantName}</p>}
            {l.blindCount && (
              <p className="text-sm text-muted-foreground">
                {fill(t.blind, { count: l.blindCount })}
              </p>
            )}
            {l.contents && (
              <p className="text-xs text-muted-foreground">{l.contents.join(" · ")}</p>
            )}
          </div>
          <p className="shrink-0 font-semibold tabular-nums">
            {formatAud(l.unitPriceCents * l.line.qty)}
          </p>
        </div>
        {blocked ? (
          <p className="text-sm font-semibold text-destructive">
            {l.status === "sold_out" ? t.soldOut : t.unavailable}
          </p>
        ) : (
          l.status === "reduced" && (
            <p className="text-sm text-primary">{fill(t.reduced, { count: l.max })}</p>
          )
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          {blocked ? (
            <span />
          ) : (
            <QuantityStepper
              value={l.line.qty}
              max={l.max}
              onChange={(qty) => cart.setQty(l.key, qty)}
            />
          )}
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={fill(t.remove, { name })}
            onClick={() => cart.setQty(l.key, 0)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function CartFooter({
  details,
  error,
  busy,
  redirecting,
  onCheckout,
}: {
  details: CartDetails | null;
  error: string | null;
  busy: boolean;
  redirecting: boolean;
  onCheckout: () => void;
}) {
  const subtotal = details?.subtotalCents ?? 0;
  const gap = details?.freeShippingGapCents ?? FREE_SHIPPING_THRESHOLD_CENTS;
  const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100));
  return (
    <div className="space-y-3 border-t bg-card p-4">
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">
          {gap > 0 ? fill(t.freeShippingGap, { amount: formatAud(gap) }) : t.freeShippingDone}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>{t.subtotal}</dt>
          <dd className="tabular-nums">{details ? formatAud(subtotal) : "–"}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t.shipping}</dt>
          <dd className="tabular-nums">
            {details && subtotal > 0
              ? details.shippingCents === 0
                ? t.shippingFree
                : formatAud(details.shippingCents)
              : "–"}
          </dd>
        </div>
        <div className="flex justify-between pt-1 text-base font-bold">
          <dt>
            {t.total}{" "}
            <span className="text-xs font-normal text-muted-foreground">({t.gstIncluded})</span>
          </dt>
          <dd className="tabular-nums">{details ? formatAud(details.totalCents) : "–"}</dd>
        </div>
      </dl>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive"
        >
          {error}
        </p>
      )}
      <Button
        size="lg"
        className="h-12 w-full rounded-full text-base"
        disabled={busy || !details?.ready}
        onClick={onCheckout}
      >
        {redirecting ? t.redirecting : t.checkout}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {fill(t.expressNote, { price: formatAud(EXPRESS_SHIPPING_CENTS) })} {t.promoNote}
      </p>
    </div>
  );
}
