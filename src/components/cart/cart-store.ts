"use client";

/**
 * The browser cart: lines in localStorage plus whether the drawer is open. A tiny external
 * store (no provider), read with `useCart()`. Every storage access is wrapped in try/catch
 * (private windows), and tabs stay in sync through the `storage` event.
 */
import { useSyncExternalStore } from "react";

import { addLine, type CartLine, parseStoredLines, setLineQty } from "@/lib/checkout/cart";

const KEY = "sa-cart-v1";

type CartState = { lines: CartLine[]; open: boolean; ready: boolean };

const SERVER: CartState = { lines: [], open: false, ready: false };
let state: CartState | null = null;
const listeners = new Set<() => void>();

function load(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? parseStoredLines(JSON.parse(raw)?.lines) : [];
  } catch {
    return [];
  }
}

function current(): CartState {
  state ??= { lines: load(), open: false, ready: true };
  return state;
}

function set(next: Partial<CartState>, persist = true) {
  state = { ...current(), ...next };
  if (persist && next.lines) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ lines: next.lines }));
    } catch {
      // Storage blocked: the cart still works for this page view.
    }
  }
  for (const l of listeners) l();
}

function onStorage(e: StorageEvent) {
  if (e.key === KEY) set({ lines: load() }, false);
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartState {
  return useSyncExternalStore(subscribe, current, () => SERVER);
}

export const cart = {
  add(line: CartLine, max?: number) {
    set({ lines: addLine(current().lines, line, max), open: true });
  },
  setQty(key: string, qty: number) {
    set({ lines: setLineQty(current().lines, key, qty) });
  },
  replace(lines: CartLine[]) {
    set({ lines });
  },
  clear() {
    set({ lines: [] });
  },
  open() {
    set({ open: true }, false);
  },
  close() {
    set({ open: false }, false);
  },
};
