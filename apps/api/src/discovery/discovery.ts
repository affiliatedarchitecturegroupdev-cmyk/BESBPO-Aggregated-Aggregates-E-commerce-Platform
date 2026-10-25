/**
 * Pure helpers for search and merchandising insights (docs/search-insights.md): how a search or BOQ line is
 * normalised before it is counted, what is never stored, and which section names the storefront may report.
 */

/** Lower case, single spaces, letters/digits and a few size characters only, at most 80 characters. */
export function normaliseText(text: string, max = 80): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s.,×x/²³-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/**
 * Text that might identify a person is never stored: an email address, a phone or ID number (seven or more
 * digits in a row once spaces are taken out) or a web address.
 */
export function looksPersonal(text: string): boolean {
  if (/@|https?:|www\./i.test(text)) return true;
  return /\d{7,}/.test(text.replace(/[\s()+-]/g, ""));
}

/** Whether a search is worth counting: two or more characters, at least one letter or digit, nothing personal. */
export function searchKey(query: string): string | null {
  if (looksPersonal(query)) return null;
  const q = normaliseText(query);
  return q.length >= 2 && /[\p{L}\p{N}]/u.test(q) ? q : null;
}

/** BOQ descriptions are longer than searches; the same rules apply. */
export function boqKey(description: string): string | null {
  if (looksPersonal(description)) return null;
  const d = normaliseText(description, 120);
  return d.length >= 3 && /\p{L}/u.test(d) ? d : null;
}

/**
 * The merchandising sections the storefront reports on: a homepage section, a department page section or a
 * collection — "home:best-sellers", "department:timber:top-sellers", "collection:winter-ready".
 */
export const SECTION_SLOT = /^(home|department|collection):[a-z0-9]+(?:-[a-z0-9]+)*(?::[a-z0-9]+(?:-[a-z0-9]+)*)?$/;
export const isSectionSlot = (slot: unknown): slot is string => typeof slot === "string" && slot.length <= 100 && SECTION_SLOT.test(slot);

/**
 * A staff synonym group, cleaned: each term normalised, duplicates removed, 2–12 terms of 2–40 characters.
 * Returns the problems instead when it can't be used.
 */
export function cleanSynonyms(terms: string[]): { terms: string[] } | { problems: string[] } {
  const problems: string[] = [];
  if (terms.some((t) => looksPersonal(String(t)))) problems.push("Synonyms can't contain email addresses, links or long numbers.");
  const out = [...new Set(terms.map((t) => normaliseText(String(t), 40)).filter(Boolean))];
  if (out.length < 2) problems.push("A synonym group needs at least two different words or phrases.");
  if (out.length > 12) problems.push("Keep a synonym group to twelve words or phrases.");
  if (out.some((t) => t.length < 2)) problems.push("Each word or phrase needs at least two characters.");
  return problems.length ? { problems } : { terms: out };
}

/** Click-through as a percentage with two decimals, or null when nothing was shown. */
export const clickThrough = (clicks: number, impressions: number) => (impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : null);
