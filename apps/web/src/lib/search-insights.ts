import "server-only";
import { headers } from "next/headers";
import { api, apiCached } from "@/lib/api";

/** Crawlers, link previews and monitoring aren't shoppers, so their searches and views aren't counted. */
export const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|uptime|monitor/i;

/**
 * The synonym groups staff added in Admin → Insights → Search, merged with the built-in ones by the search engine
 * (docs/search-insights.md). Cached for five minutes; saving a group refreshes it straight away.
 */
export async function getStaffSynonyms(): Promise<string[][]> {
  const groups = await apiCached<string[][]>("/discovery/synonyms", 300, ["synonyms"]);
  return Array.isArray(groups) ? groups.filter((g) => Array.isArray(g) && g.length >= 2) : [];
}

/**
 * Counts a search and how many products it found (docs/search-insights.md). Counts only — the API never stores
 * who searched, and drops anything that looks like an email address or phone number. Never waits on the API:
 * a slow count must not slow the page.
 */
export function logSearch(query: string, results: number) {
  const h = headers();
  // Next.js prefetches links before they're clicked; only a real visit counts.
  if (h.get("next-router-prefetch") || h.get("purpose") === "prefetch" || BOT.test(h.get("user-agent") ?? "")) return;
  if (!query.trim()) return;
  void api("/discovery/searches", { method: "POST", body: { query: query.slice(0, 200), results } }).catch(() => undefined);
}
