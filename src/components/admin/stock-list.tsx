"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { matchesStockQuery } from "@/lib/admin/stock-search";
import { cn } from "@/lib/utils";

export type StockListRow = {
  id: string;
  label: string;
  sku: string;
  category: string;
  stock: number;
  lowStockAt: number;
  active: boolean;
  sold30: number;
  isTest: boolean;
};

type Filter = "all" | "low";

/**
 * The Stock list, searched in the browser (about 70 designs). Unsellable designs are hidden
 * unless ticked. The search, filter and tick live in the address, so Back keeps them.
 */
export function StockList({
  rows,
  reorderIds,
  initial,
}: {
  rows: StockListRow[];
  /** "Low or sold out", in reorder order (best sellers first). Sellable designs only. */
  reorderIds: string[];
  initial: { filter: Filter; q: string; hidden: boolean };
}) {
  const [filter, setFilter] = useState(initial.filter);
  const [q, setQ] = useState(initial.q);
  const [hidden, setHidden] = useState(initial.hidden);

  // After Receive → Confirm the URL carries the banner values (?received=…). Drop them once
  // shown, so a reload doesn't show "Received…" again. The banner stays until you leave.
  useEffect(() => {
    const url = new URL(window.location.href);
    const banner = ["received", "designs", "alerts"].filter((k) => url.searchParams.has(k));
    if (!banner.length) return;
    for (const k of banner) url.searchParams.delete(k);
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  function update(next: Partial<{ filter: Filter; q: string; hidden: boolean }>) {
    const s = { filter, q, hidden, ...next };
    if (next.filter !== undefined) setFilter(next.filter);
    if (next.q !== undefined) setQ(next.q);
    if (next.hidden !== undefined) setHidden(next.hidden);
    const params = new URLSearchParams();
    if (s.filter === "low") params.set("filter", "low");
    if (s.q.trim()) params.set("q", s.q.trim());
    if (s.hidden) params.set("hidden", "1");
    const query = params.toString();
    // Also drops the "received" banner values, so a reload doesn't show it again.
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const low = reorderIds.flatMap((id) => byId.get(id) ?? []);
  const unsellable = rows.filter((r) => !r.active).length;
  const all = hidden ? rows : rows.filter((r) => r.active);
  const base = filter === "low" ? low : all;
  const list = base.filter((r) => matchesStockQuery(r, q));

  return (
    <>
      <div className="mb-3 space-y-3">
        <Input
          type="search"
          value={q}
          onChange={(e) => update({ q: e.target.value })}
          aria-label="Search by SKU, name or category"
          placeholder="Search SKU, name or category"
          className="h-11 bg-background text-base"
        />
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all", label: `All (${all.length})` },
              { key: "low", label: `Low or sold out (${low.length})` },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => update({ filter: f.key })}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-border",
                filter === f.key
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
          {unsellable > 0 && (
            <label className="ml-1 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hidden}
                onChange={(e) => update({ hidden: e.target.checked })}
                className="size-4 accent-primary"
              />
              Show unsellable ({unsellable})
            </label>
          )}
        </div>
      </div>

      {q.trim() && (
        <p className="mb-2 text-sm text-muted-foreground">
          {list.length} of {base.length} match “{q.trim()}”
        </p>
      )}

      <ul className="divide-y rounded-2xl bg-card ring-1 ring-border">
        {list.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/stock/${r.id}`}
              className="flex items-center gap-3 p-3 hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", !r.active && "text-muted-foreground line-through")}>
                  {r.label}
                  {r.isTest && (
                    <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white no-underline">
                      Test
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{r.sku}</span> · {r.category} · {r.sold30} sold in 30
                  days · low at {r.lowStockAt}
                </p>
              </div>
              <span
                className={cn(
                  "min-w-12 rounded-full px-2.5 py-1 text-center font-semibold tabular-nums",
                  r.stock === 0
                    ? "bg-destructive/10 text-destructive"
                    : r.stock <= r.lowStockAt
                      ? "bg-butter"
                      : "bg-muted",
                )}
              >
                {r.stock}
              </span>
            </Link>
          </li>
        ))}
        {list.length === 0 && (
          <li className="p-4 text-center text-sm text-muted-foreground">
            {q.trim()
              ? `Nothing matches “${q.trim()}”.`
              : filter === "low"
                ? "Nothing is low. 🎉"
                : "No designs yet."}
          </li>
        )}
      </ul>
    </>
  );
}
