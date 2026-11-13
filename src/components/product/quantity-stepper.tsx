"use client";

import { Minus, Plus } from "lucide-react";

import { messages } from "@/content/messages";

const t = messages.product;

export function QuantityStepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const button =
    "flex size-11 items-center justify-center rounded-full transition hover:bg-muted disabled:opacity-40";
  return (
    <div
      className="inline-flex items-center rounded-full border bg-card"
      role="group"
      aria-label={t.quantity}
    >
      <button
        type="button"
        className={button}
        aria-label={t.decrease}
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <Minus className="size-4" />
      </button>
      <output aria-live="polite" className="w-8 text-center font-bold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={button}
        aria-label={t.increase}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
