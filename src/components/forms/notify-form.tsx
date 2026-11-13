"use client";

import { useActionState, useId } from "react";

import { subscribe, type SubscribeState } from "@/actions/subscribe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messages } from "@/content/messages";
import { cn } from "@/lib/utils";

const t = messages.waitlist;

/**
 * Email capture. With no item it joins the waitlist; with `variantId` or `bundleId` it's a
 * back-in-stock alert for that item. Saved to `subscribers` by the `subscribe` action.
 */
export function NotifyForm({
  className,
  inverted,
  variantId,
  bundleId,
}: {
  className?: string;
  inverted?: boolean;
  variantId?: string;
  bundleId?: string;
}) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribe, {
    status: "idle",
  });
  const id = useId();
  const muted = inverted ? "text-cream/80" : "text-muted-foreground";

  if (state.status === "success") {
    return (
      <div className={className}>
        <p role="status" className={cn("text-sm font-medium", muted)}>
          {variantId || bundleId ? t.successItem : t.success}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className={cn("space-y-2", className)}>
      {variantId && <input type="hidden" name="variantId" value={variantId} />}
      {bundleId && <input type="hidden" name="bundleId" value={bundleId} />}
      {/* Honeypot: hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={id}>
          {t.label}
        </label>
        <Input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.placeholder}
          aria-invalid={state.status === "invalid" || undefined}
          className={cn("h-11 rounded-full bg-card px-4", inverted && "border-transparent")}
        />
        <Button type="submit" size="lg" disabled={pending} className="h-11 rounded-full px-5">
          {pending ? t.sending : t.submit}
        </Button>
      </div>
      <p role="status" className={cn("min-h-5 text-sm", muted)}>
        {state.status === "invalid" ? t.invalid : state.status === "error" ? t.error : t.consent}
      </p>
    </form>
  );
}
