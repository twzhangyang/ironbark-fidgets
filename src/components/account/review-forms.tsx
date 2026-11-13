"use client";

import { Star } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  deleteReviewAction,
  type ReviewState,
  saveReviewAction,
  uploadReviewPhoto,
} from "@/actions/account/reviews";
import { PhotoField } from "@/components/admin/photo-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fill, messages } from "@/content/messages";
import type { ReviewTarget } from "@/lib/account/reviews";
import { cn } from "@/lib/utils";

const t = messages.account.reviewsPage;

function Note({ state }: { state: ReviewState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm font-semibold text-destructive">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="text-sm font-semibold text-success">
        {state.message}
      </p>
    );
  return null;
}

function StarInput({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">{t.rating}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className="cursor-pointer rounded-md p-0.5 has-focus-visible:ring-2">
            <input
              type="radio"
              name="rating"
              value={i}
              required
              checked={value === i}
              onChange={() => setValue(i)}
              className="sr-only"
              aria-label={fill(t.stars, { count: String(i) })}
            />
            <Star
              aria-hidden
              className={cn(
                "size-8",
                i <= value ? "fill-amber-500 text-amber-500" : "text-muted-foreground/50",
              )}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type ReviewDraft = {
  rating: number;
  title: string;
  body: string;
  photoPath: string | null;
};

/** Write or edit one review. */
export function ReviewForm({
  target,
  initial,
  onDone,
}: {
  target: ReviewTarget;
  initial?: ReviewDraft;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(async (prev, data) => {
    const result = await saveReviewAction(prev, data);
    if (result.ok) onDone?.();
    return result;
  }, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="type" value={target.type} />
      <input type="hidden" name="id" value={target.id} />
      <StarInput initial={initial?.rating ?? 0} />
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">{t.titleLabel}</span>
        <Input
          name="title"
          maxLength={80}
          defaultValue={initial?.title ?? ""}
          className="h-11 bg-background text-base"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">{t.bodyLabel}</span>
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          defaultValue={initial?.body ?? ""}
          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="block text-xs text-muted-foreground">{t.bodyHint}</span>
      </label>
      <div className="space-y-1">
        <PhotoField
          name="photo"
          single
          label={t.photoLabel}
          initial={initial?.photoPath ? [initial.photoPath] : []}
          upload={uploadReviewPhoto}
        />
        <p className="text-xs text-muted-foreground">{t.photoHint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="h-10 rounded-full px-5" disabled={pending}>
          {pending ? t.saving : t.submit}
        </Button>
        <Note state={state} />
      </div>
    </form>
  );
}

/** "Write a review" button that opens the form in place. */
export function WriteReview({ target }: { target: ReviewTarget }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button className="rounded-full" onClick={() => setOpen(true)}>
        {t.write}
      </Button>
    );
  return (
    <div className="w-full space-y-3">
      <ReviewForm target={target} />
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
        {t.cancel}
      </Button>
    </div>
  );
}

/** Edit and delete buttons for one of your reviews. */
export function MyReviewControls({
  id,
  target,
  initial,
}: {
  id: string;
  target: ReviewTarget;
  initial: ReviewDraft;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<ReviewState>({});
  const [pending, start] = useTransition();

  if (editing)
    return (
      <div className="space-y-3 border-t pt-4">
        <ReviewForm target={target} initial={initial} onDone={() => setEditing(false)} />
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
          {t.cancel}
        </Button>
      </div>
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(true)}>
        {t.edit}
      </Button>
      {confirming ? (
        <>
          <span className="text-sm">{t.deleteConfirm}</span>
          <Button
            variant="destructive"
            size="sm"
            className="rounded-full"
            disabled={pending}
            onClick={() => start(async () => setState(await deleteReviewAction(id)))}
          >
            {t.delete}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            {t.cancel}
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => setConfirming(true)}
        >
          {t.delete}
        </Button>
      )}
      <Note state={state} />
    </div>
  );
}
