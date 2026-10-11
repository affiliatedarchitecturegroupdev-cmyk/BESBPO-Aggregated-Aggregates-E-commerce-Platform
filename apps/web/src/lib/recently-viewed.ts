"use client";

import { useSyncExternalStore } from "react";
import { findQuotable } from "@/data/quotable";

/**
 * Recently viewed products (RECENTLY_VIEWED.md): the SKUs of the last
 * product pages opened, newest first, kept only in this browser
 * (localStorage). Nothing is sent to the server; clearing it, or the
 * browser's site data, removes it.
 */
const KEY = "aa-recently-viewed";
const MAX = 12;
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cached: { raw: string | null; skus: string[] } = { raw: null, skus: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cached.skus;
  }
  if (raw === cached.raw) return cached.skus;
  let skus = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) skus = parsed.filter((s): s is string => typeof s === "string" && !!findQuotable(s)).slice(0, MAX);
  } catch {
    skus = EMPTY;
  }
  cached = { raw, skus };
  return skus;
}

function write(skus: string[]) {
  const raw = JSON.stringify(skus);
  try {
    if (skus.length) localStorage.setItem(KEY, raw);
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable (private mode): remember for this page only
  }
  cached = { raw: skus.length ? raw : null, skus };
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

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const recentlyViewed = {
  record(sku: string) {
    if (!findQuotable(sku)) return;
    const current = read();
    if (current[0] === sku) return;
    write([sku, ...current.filter((s) => s !== sku)].slice(0, MAX));
  },
  clear() {
    write([]);
  },
};
