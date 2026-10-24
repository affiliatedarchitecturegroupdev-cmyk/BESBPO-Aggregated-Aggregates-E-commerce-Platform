/**
 * Product families (ROADMAP 2.6, docs/product-families.md): products that are the same thing in different sizes
 * — "CCA Treated Pole 100–125 mm × 3.0 m", "… × 3.6 m" — shown together so a listing isn't sixty near-identical
 * cards. Grouping is presentation only: every size keeps its own page, search result and link.
 *
 * Deliberately conservative, because a shopper who can't see a product assumes we don't sell it:
 * - only names that differ purely in numbers and units group (sizes, lengths, capacities, ratings) — colour,
 *   material or type words keep products apart;
 * - only within one category;
 * - only when there are at least MIN_FAMILY of them; smaller sets stay as separate products.
 *
 * Pure (no app imports) so it can be tested on its own.
 */

/** Fewer sizes than this stay as separate cards — grouping three things saves nothing and hides two. */
export const MIN_FAMILY = 4;

/** Words that are part of a size when they follow a number: "6 mm", "2.4 m", "50 kg", "18 V", "12-Step"… */
const UNIT_WORDS = new Set([
  "mm", "cm", "m", "km", "mm²", "m²", "m³", "dm³", "kg", "g", "t", "l", "ml", "kw", "w", "v", "a", "ah", "kva", "btu", "cc",
  "in", "inch", "ft", "mpa", "kpa", "bar", "rungs", "step", "steps", "way", "ways", "station", "core", "pole", "pin", "pack",
  "lengths", "length", "sheets", "sheet", "roll", "litre", "litres", "ton", "tonne", "x", "×", "–", "-", "/", "+", "&", "to", "of",
]);

/** Words that describe a size when they sit next to one: "Grade 8.8", "6 m Wide", "13 mm Wall". */
const BEFORE_SIZE = new Set(["grade", "class", "ref", "size", "no", "type"]);
const AFTER_SIZE = new Set(["wide", "wall", "thick", "deep", "long", "high", "dia", "diameter", "pile", "capacity", "rated", "bore"]);

/** A ratio like "2:3:2" names a product (a fertiliser formulation), not a size — it stays in the title. */
const isRatio = (t: string) => /^\d+:\d+(:\d+)?$/.test(bare(t));
const hasDigit = (t: string) => /\d/.test(t) && !isRatio(t);
function bare(t: string) {
  return t.toLowerCase().replace(/^[(\[,]+|[)\],.;:]+$/g, "");
}

export type FamilyParts = { title: string; variant: string };

/**
 * Splits a product name into what it is (the family title) and which one it is (the variant):
 * "CCA Treated Pole 100–125 mm × 3.0 m" → { title: "CCA Treated Pole", variant: "100–125 mm × 3.0 m" }.
 * A name with no size in it is its own title with an empty variant.
 */
export function familyParts(name: string): FamilyParts {
  const tokens = name.split(/\s+/).filter(Boolean);
  const isSize: boolean[] = tokens.map(() => false);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("(")) {
      const close = tokens.findIndex((x, j) => j >= i && x.endsWith(")"));
      const group = tokens.slice(i, close === -1 ? i + 1 : close + 1);
      if (group.some(hasDigit)) {
        for (let j = i; j < i + group.length; j++) isSize[j] = true;
        i += group.length - 1;
        continue;
      }
    }
    if (hasDigit(t)) {
      isSize[i] = true;
      continue;
    }
    // A unit or joiner next to a number belongs to the size: "6 mm", "100 × 50", "2 × 8 Rungs".
    const prevSize = i > 0 && isSize[i - 1];
    const nextHasDigit = i + 1 < tokens.length && hasDigit(tokens[i + 1]);
    if (UNIT_WORDS.has(bare(t)) && (prevSize || (nextHasDigit && ["x", "×", "–", "-", "/", "+", "to", "of"].includes(bare(t))))) isSize[i] = true;
    else if (AFTER_SIZE.has(bare(t)) && prevSize) isSize[i] = true;
    else if (BEFORE_SIZE.has(bare(t)) && nextHasDigit) isSize[i] = true;
  }
  const title = tokens
    .filter((_, i) => !isSize[i])
    .join(" ")
    .replace(/\s+([,;:)])/g, "$1")
    .replace(/[\s,;:–-]+$/g, "")
    .replace(/^[\s,;:–-]+/g, "")
    .replace(/,\s*,/g, ",")
    .trim();
  const variant = tokens
    .filter((_, i) => isSize[i])
    .join(" ")
    .replace(/,$/, "")
    .trim();
  return { title: title || name, variant };
}

/** The key products must share to be one family: same category, same title, and the title isn't empty. */
export function familyKey(categorySlug: string, name: string): string | null {
  const { title, variant } = familyParts(name);
  if (!variant || title.length < 3) return null;
  return `${categorySlug}|${title.toLowerCase()}`;
}

export type Family<T> = { key: string; title: string; members: T[] };

/** Groups products into families (MIN_FAMILY or more); everything else is returned as a family of one. */
export function buildFamilies<T extends { sku: string; name: string; categorySlug: string }>(products: T[]): { families: Map<string, Family<T>>; familyOf: Map<string, string> } {
  const byKey = new Map<string, T[]>();
  for (const p of products) {
    const key = familyKey(p.categorySlug, p.name);
    if (key) byKey.set(key, [...(byKey.get(key) ?? []), p]);
  }
  const families = new Map<string, Family<T>>();
  const familyOf = new Map<string, string>();
  for (const [key, members] of byKey) {
    if (members.length < MIN_FAMILY) continue;
    families.set(key, { key, title: familyParts(members[0].name).title, members });
    for (const m of members) familyOf.set(m.sku, key);
  }
  return { families, familyOf };
}

export type Card<T> = { kind: "product"; product: T } | { kind: "family"; family: Family<T>; /** The members in these results, best match first. */ shown: T[] };

/**
 * Turns a ranked list of products into listing cards: each family appears once, where its best-ranked member
 * would have been, carrying the members that matched; products outside families stay as they are.
 */
export function groupForListing<T extends { sku: string }>(ranked: T[], families: Map<string, Family<T>>, familyOf: Map<string, string>): Card<T>[] {
  const cards: Card<T>[] = [];
  const placed = new Map<string, Card<T> & { kind: "family" }>();
  for (const p of ranked) {
    const key = familyOf.get(p.sku);
    if (!key) {
      cards.push({ kind: "product", product: p });
      continue;
    }
    const existing = placed.get(key);
    if (existing) {
      existing.shown.push(p);
      continue;
    }
    const card = { kind: "family" as const, family: families.get(key)!, shown: [p] };
    placed.set(key, card);
    cards.push(card);
  }
  // A family with only one member in these results reads better as that product.
  return cards.map((c) => (c.kind === "family" && c.shown.length === 1 ? { kind: "product" as const, product: c.shown[0] } : c));
}
