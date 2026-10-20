"use server";

import type { BestWithSuggestion } from "@/data/complete-the-job";
import { api } from "@/lib/api";

/** Best With for the cart (docs/best-with.md): pinned and order pairings for everything in it. */
export async function bestWithForCart(skus: string[]): Promise<BestWithSuggestion[]> {
  const clean = [...new Set(skus.filter((s) => /^[A-Z0-9-]{3,60}$/.test(s)))].slice(0, 50);
  if (!clean.length) return [];
  const result = await api<BestWithSuggestion[]>(`/merchandising/best-with?skus=${encodeURIComponent(clean.join(","))}&limit=8`);
  return result.ok && Array.isArray(result.data) ? result.data : [];
}
