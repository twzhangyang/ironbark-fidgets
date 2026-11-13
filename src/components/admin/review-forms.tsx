"use client";

import { useActionState } from "react";

import type { ActionState } from "@/actions/admin/orders";
import { hideReviewAction } from "@/actions/admin/reviews";
import { Feedback } from "@/components/admin/action-button";
import { Button } from "@/components/ui/button";
import { HIDE_REASONS } from "@/lib/account/review-rules";

/** Hide with a required reason (D10). */
export function HideReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(hideReviewAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select
        name="reason"
        required
        defaultValue=""
        className="h-9 rounded-lg border bg-background px-2 text-sm"
        aria-label="Reason to hide"
      >
        <option value="" disabled>
          Reason to hide…
        </option>
        {HIDE_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Hide
      </Button>
      <Feedback state={state} />
    </form>
  );
}
