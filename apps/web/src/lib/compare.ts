"use client";

import { useSyncExternalStore } from "react";

/**
 * Compare list (ROADMAP 4.3): up to three SKUs the shopper has ticked, kept in
 * this browser only (localStorage) and shared across tabs. The compare page
 * reads them from its URL, so a comparison can be shared as a link.
 */
const KEY = "aa-compare";
export const COMPARE_LIMIT = 3;
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cached: { raw: string | null; skus: string[] } = { raw: null, skus: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cached.raw) return cached.skus;
  let skus: string[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    skus = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, COMPARE_LIMIT) : EMPTY;
  } catch {
    skus = EMPTY;
  }
  cached = { raw, skus };
  return skus;
}

function write(skus: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(skus));
  } catch {
    // Storage blocked: the comparison simply isn't remembered.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCompare(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const compare = {
  /** Adds or removes a SKU; returns false when adding would go past the limit. */
  toggle(sku: string): boolean {
    const current = read();
    if (current.includes(sku)) {
      write(current.filter((s) => s !== sku));
      return true;
    }
    if (current.length >= COMPARE_LIMIT) return false;
    write([...current, sku]);
    return true;
  },
  remove(sku: string) {
    write(read().filter((s) => s !== sku));
  },
  clear() {
    write([]);
  },
};
