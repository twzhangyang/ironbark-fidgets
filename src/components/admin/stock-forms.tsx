"use client";

import { useActionState, useMemo, useState } from "react";

import type { ActionState } from "@/actions/admin/orders";
import { adjust, receive } from "@/actions/admin/stock";
import { Feedback } from "@/components/admin/action-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { matchesStockQuery } from "@/lib/admin/stock-search";
import { cn } from "@/lib/utils";

type Design = {
  id: string;
  label: string;
  sku: string;
  category: string;
  stock: number;
  active: boolean;
  isTest: boolean;
  boxQty: number | null;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "= 2 boxes + 3" for products sold by the box (Phase 11). */
function boxes(qty: number, boxQty: number) {
  const full = Math.floor(qty / boxQty);
  const loose = qty % boxQty;
  return `= ${plural(full, "pack", "packs")}${loose ? ` + ${loose}` : ""}`;
}

/** A whole number 0–10,000, or null when the box holds something else. Empty counts as 0. */
function parseQty(raw: string | undefined): number | null {
  if (!raw?.trim()) return 0;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 10_000 ? n : null;
}

/**
 * One shipment, many designs (D7). Search to find a design; the numbers stay while you search.
 * "Add to stock" shows a summary first; only Confirm saves, then the Stock page opens.
 */
export function ReceiveForm({ designs }: { designs: Design[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(receive, {});
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [onlyEntered, setOnlyEntered] = useState(false);
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState("");

  // Sellable designs first; unsellable ones stay at the bottom, greyed out.
  const ordered = useMemo(
    () => [...designs.filter((d) => d.active), ...designs.filter((d) => !d.active)],
    [designs],
  );
  const entered = ordered.flatMap((d) => {
    const n = parseQty(qty[d.id]);
    return n ? [{ ...d, qty: n }] : [];
  });
  const invalid = ordered.some((d) => parseQty(qty[d.id]) === null);
  const pieces = entered.reduce((sum, d) => sum + d.qty, 0);
  const shown = (d: Design) =>
    onlyEntered ? (parseQty(qty[d.id]) ?? 1) !== 0 : matchesStockQuery(d, q);
  const visible = ordered.filter(shown).length;

  function review() {
    if (invalid) return setProblem("Quantities must be whole numbers (0–10,000).");
    if (!entered.length) return setProblem("Enter at least one quantity.");
    setProblem("");
    setOpen(true);
  }

  return (
    <form
      id="receive-form"
      action={formAction}
      // Enter in a box opens the summary too: nothing saves without Confirm.
      onSubmit={(e) => {
        if (!open) {
          e.preventDefault();
          review();
        }
      }}
      className="space-y-4"
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Note (optional)</span>
        <Input
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="e.g. Supplier order #12"
          className="h-11 bg-background"
        />
      </label>

      <div className="sticky top-0 z-10 space-y-2 bg-background/95 py-2 backdrop-blur">
        <Input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOnlyEntered(false);
          }}
          // Not part of the shipment: no name, so the form never sends it.
          aria-label="Search by SKU, name or category"
          placeholder="Search SKU, name or category"
          className="h-11 bg-background text-base"
        />
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {entered.length
              ? `${plural(entered.length, "design")} · ${plural(pieces, "piece")} entered`
              : "Nothing entered yet"}
          </span>
          {entered.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setOnlyEntered((v) => !v);
                setQ("");
              }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {onlyEntered ? "Show all" : "Show entered only"}
            </button>
          )}
        </div>
      </div>

      <ul className="divide-y rounded-2xl bg-card ring-1 ring-border">
        {ordered.map((d) => {
          const n = parseQty(qty[d.id]);
          return (
            // Hidden, not removed: a number typed before a search is kept and still sent.
            <li key={d.id} hidden={!shown(d)} className="flex items-center gap-3 p-3">
              <label
                htmlFor={`qty-${d.id}`}
                className={cn("min-w-0 flex-1", !d.active && "text-muted-foreground")}
              >
                <span className="block font-medium">
                  {d.label}
                  {d.isTest && (
                    <span className="ml-1.5 text-xs font-semibold text-destructive">· test</span>
                  )}
                  {!d.active && <span className="ml-1.5 text-xs font-normal">· not for sale</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-mono">{d.sku}</span> · {d.stock} on the shelf
                  {d.boxQty && (
                    <>
                      {" "}
                      · pack of {d.boxQty}
                      {n ? (
                        <strong className="text-foreground"> {boxes(n, d.boxQty)}</strong>
                      ) : null}
                    </>
                  )}
                </span>
              </label>
              <Input
                id={`qty-${d.id}`}
                name={`qty:${d.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                placeholder="0"
                value={qty[d.id] ?? ""}
                onChange={(e) => setQty((t) => ({ ...t, [d.id]: e.target.value }))}
                aria-invalid={n === null || undefined}
                className="h-11 w-24 bg-background text-right text-base"
              />
            </li>
          );
        })}
        {visible === 0 && (
          <li className="p-4 text-center text-sm text-muted-foreground">Nothing matches “{q}”.</li>
        )}
      </ul>

      <div className="sticky bottom-0 space-y-2 bg-background/95 py-3 backdrop-blur">
        {problem ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {problem}
          </p>
        ) : (
          !open && <Feedback state={state} />
        )}
        <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base">
          Add to stock
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Add this to stock?</DialogTitle>
            <DialogDescription>
              {plural(pieces, "piece")} across {plural(entered.length, "design")}. Nothing is saved
              until you confirm.
            </DialogDescription>
          </DialogHeader>
          <ul className="-mx-1 max-h-[50vh] divide-y overflow-y-auto px-1">
            {entered.map((d) => (
              <li key={d.id} className="flex items-start gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{d.label}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{d.sku}</span>
                    {d.boxQty && ` · ${boxes(d.qty, d.boxQty)}`}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <p className="font-semibold">+{d.qty}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.stock} → {d.stock + d.qty}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {note.trim() && (
            <p className="text-sm">
              <span className="text-muted-foreground">Note:</span> {note.trim()}
            </p>
          )}
          {state.error && open && !pending && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline" className="h-11 rounded-full" />}
              disabled={pending}
            >
              Cancel
            </DialogClose>
            {/* The popup sits outside the form in the page, so the button names its form. */}
            <Button
              type="submit"
              form="receive-form"
              className="h-11 rounded-full"
              disabled={pending}
            >
              {pending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

const REASONS = ["Damaged", "Count fix", "Giveaway", "Sample", "Other"] as const;

export function AdjustForm({ variantId }: { variantId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(adjust, {});
  return (
    <form action={formAction} key={state.message} className="space-y-3">
      <input type="hidden" name="variantId" value={variantId} />
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Change</span>
          <Input
            name="delta"
            type="number"
            inputMode="numeric"
            required
            placeholder="-1 or 5"
            className="h-11 bg-background text-base"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Reason</span>
          <select
            name="reason"
            required
            className="h-11 w-full rounded-lg border border-input bg-background px-2 text-base"
          >
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>
      <Input
        name="note"
        maxLength={200}
        placeholder="Note (optional)"
        className="h-11 bg-background"
      />
      <Button
        type="submit"
        variant="outline"
        className="h-11 w-full rounded-full"
        disabled={pending}
      >
        {pending ? "Saving…" : "Adjust stock"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
