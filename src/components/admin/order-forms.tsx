"use client";

import { useActionState } from "react";

import { type ActionState, refund, shipOrder } from "@/actions/admin/orders";
import { Feedback } from "@/components/admin/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShipForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(shipOrder, {});
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Australia Post tracking number</span>
        <Input
          name="tracking"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. 33ABC1234567"
          className="h-11 bg-background font-mono text-base"
        />
      </label>
      <Button type="submit" size="lg" className="h-11 w-full rounded-full" disabled={pending}>
        {pending ? "Saving…" : "Mark shipped + email the customer"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

/**
 * Full refund. "Put back on the shelf" is ticked for orders not sent yet (the items are still
 * here) and unticked for sent ones: squishies are easily damaged once delivered, so only put
 * them back if they came back in perfect condition.
 */
export function RefundForm({
  orderId,
  total,
  sent,
  stockReleased = false,
}: {
  orderId: string;
  total: string;
  sent: boolean;
  /** Paid after being cancelled: its stock is already back, so there's nothing to put back. */
  stockReleased?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(refund, {});
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <label className={stockReleased ? "hidden" : "flex items-start gap-2 text-sm"}>
        <input
          type="checkbox"
          name="putBack"
          defaultChecked={!sent && !stockReleased}
          className="mt-0.5 size-4"
        />
        <span>
          Put the items back on the shelf
          <span className="block text-xs text-muted-foreground">
            {sent
              ? "Sent already: leave unticked unless they came back in perfect condition. You can still put them back later."
              : "Not sent yet, so the items are still here."}
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" value="yes" required className="mt-0.5 size-4" />
        <span>
          Yes, refund the full <strong>{total}</strong> to the customer&apos;s card. This can&apos;t
          be undone.
        </span>
      </label>
      <Button
        type="submit"
        variant="destructive"
        className="h-11 rounded-full px-5"
        disabled={pending}
      >
        {pending ? "Refunding…" : "Refund in full"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
