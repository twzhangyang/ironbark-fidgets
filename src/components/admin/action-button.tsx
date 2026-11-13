"use client";

import { useState, useTransition } from "react";

import type { ActionState } from "@/actions/admin/orders";
import { Button } from "@/components/ui/button";

/** A button that runs one server action and shows its result underneath. */
export function ActionButton({
  action,
  children,
  variant = "default",
  pendingText = "Working…",
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "destructive";
  pendingText?: string;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant={variant}
        size="lg"
        className="h-11 rounded-full px-5"
        disabled={pending}
        onClick={() => start(async () => setState(await action()))}
      >
        {pending ? pendingText : children}
      </Button>
      <Feedback state={state} />
    </div>
  );
}

export function Feedback({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm font-medium text-destructive">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="text-sm font-medium text-success">
        {state.message}
      </p>
    );
  return null;
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" className="rounded-full" onClick={() => window.print()}>
      {label}
    </Button>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied" : label}
    </Button>
  );
}
