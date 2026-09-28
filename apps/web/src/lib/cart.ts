"use client";

import { useSyncExternalStore } from "react";
import { findQuotable, isWholeUnit } from "@/data/quotable";

/**
 * The shopping cart, kept in this browser (localStorage) until checkout —
 * nothing is sent anywhere until the customer prices or places the order,
 * and every price is recalculated by the pricing service at that point.
 */
export type CartLine = { sku: string; unit: string; quantity: number };
export type CartDelivery = { mode: "location"; latitude: number; longitude: number } | { mode: "distance"; distanceKm: number } | null;
export type Cart = { lines: CartLine[]; delivery: CartDelivery };

const KEY = "aa-cart";
const EMPTY: Cart = { lines: [], delivery: null };
const listeners = new Set<() => void>();
let cached: { raw: string | null; cart: Cart } = { raw: null, cart: EMPTY };

function valid(line: unknown): line is CartLine {
  const l = line as CartLine;
  const product = l && typeof l.sku === "string" ? findQuotable(l.sku) : undefined;
  return !!product && product.units.some((u) => u.code === l.unit) && typeof l.quantity === "number" && l.quantity > 0 && l.quantity <= 100000;
}

function read(): Cart {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cached.raw) return cached.cart;
  let cart = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.lines)) {
      cart = { lines: parsed.lines.filter(valid).slice(0, 30), delivery: parsed.delivery ?? null };
    }
  } catch {
    cart = EMPTY;
  }
  cached = { raw, cart };
  return cart;
}

function write(cart: Cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // storage unavailable (private mode): the cart lasts for this page only
    cached = { raw: JSON.stringify(cart), cart };
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

export function useCart(): Cart {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const cart = {
  add(line: CartLine) {
    const current = read();
    const quantity = isWholeUnit(line.unit) ? Math.round(line.quantity) : line.quantity;
    const existing = current.lines.findIndex((l) => l.sku === line.sku && l.unit === line.unit);
    const lines =
      existing >= 0
        ? current.lines.map((l, i) => (i === existing ? { ...l, quantity: Math.round((l.quantity + quantity) * 1000) / 1000 } : l))
        : [...current.lines, { ...line, quantity }];
    write({ ...current, lines: lines.slice(0, 30) });
  },
  update(index: number, patch: Partial<CartLine>) {
    const current = read();
    write({ ...current, lines: current.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)).filter(valid) });
  },
  remove(index: number) {
    const current = read();
    write({ ...current, lines: current.lines.filter((_, i) => i !== index) });
  },
  setDelivery(delivery: CartDelivery) {
    write({ ...read(), delivery });
  },
  clear() {
    write(EMPTY);
  },
};
