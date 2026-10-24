/**
 * Collections (ROADMAP 3.4, docs/merchandising.md): the rules staff edit in Admin → Collections, checked here so
 * the storefront only ever gets well-formed collections.
 */
export type CollectionRule = { query?: string; department?: string; category?: string; availability?: "online" | "quote"; maxPrice?: number };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEMENT = /^(HOMEPAGE|DEPARTMENT:[a-z0-9-]+)$/;

/** A URL slug from a title: "Back to site 2027!" → "back-to-site-2027". */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Problems with a collection as staff entered it; empty when it's fine to save. */
export function collectionProblems(c: { slug: string; skus: string[]; rule: CollectionRule | null; placements: string[]; startsAt: Date | null; endsAt: Date | null }): string[] {
  const problems: string[] = [];
  if (!SLUG.test(c.slug)) problems.push("The link name may only use lower-case letters, numbers and single dashes.");
  for (const p of c.placements) if (!PLACEMENT.test(p)) problems.push(`Unknown placement "${p}".`);
  if (c.skus.length > 60) problems.push("A collection holds at most 60 hand-picked products.");
  const rule = c.rule ?? {};
  const hasRule = Boolean(rule.query || rule.department || rule.category || rule.availability || rule.maxPrice);
  if (!c.skus.length && !hasRule) problems.push("Pick some products, or set a rule (search words, department, category, availability or a price limit).");
  if (rule.maxPrice !== undefined && (!(rule.maxPrice > 0) || rule.maxPrice > 1_000_000)) problems.push("The price limit must be between R1 and R1,000,000.");
  if (rule.availability && !["online", "quote"].includes(rule.availability)) problems.push('Availability must be "online" or "quote".');
  if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt) problems.push("The end date must be after the start date.");
  return problems;
}

/** Only the rule fields the storefront understands, trimmed; null when nothing is set. */
export function cleanRule(rule: Partial<Record<keyof CollectionRule, unknown>> | null | undefined): CollectionRule | null {
  if (!rule) return null;
  const out: CollectionRule = {};
  const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  const query = text(rule.query, 100);
  const department = text(rule.department, 60);
  const category = text(rule.category, 60);
  if (query) out.query = query;
  if (department) out.department = department;
  if (category) out.category = category;
  if (rule.availability === "online" || rule.availability === "quote") out.availability = rule.availability;
  const max = Number(rule.maxPrice);
  if (rule.maxPrice !== undefined && rule.maxPrice !== null && rule.maxPrice !== "") out.maxPrice = Number.isFinite(max) ? max : -1;
  return Object.keys(out).length ? out : null;
}

/** Live: active, and today falls between its start and end dates (either may be open). */
export function isLive(c: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now = new Date()): boolean {
  return c.isActive && (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt > now);
}
