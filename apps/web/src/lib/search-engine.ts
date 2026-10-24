/**
 * The storefront's product search engine (ROADMAP 4.1, docs/search.md): synonyms for South African trade terms,
 * simple stemming, typo tolerance, relevance ranking, facets, sorting and pages — in-process over the product
 * index, so it needs no extra service. It's pure (no app imports) so it can be tested on its own and swapped for
 * a hosted engine (Meilisearch or Typesense) later behind the same `search()` call.
 */

export type SearchDoc = {
  id: string;
  name: string;
  /** Fields searched but weighted below the name: SKU, category, department, brand, standard, summary. */
  text: string;
  facets: Record<string, string | null>;
  /** Lowest buy-online price, or null when every unit is quoted. */
  price: number | null;
};

export type SearchOptions = {
  query?: string;
  /** One value per facet; a facet left out isn't filtered. */
  filters?: Record<string, string | undefined>;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  /** Document ids to leave out (products staff have hidden). */
  exclude?: Set<string>;
};

export type SortKey = "relevance" | "price-asc" | "price-desc" | "name";
export const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Best match",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name A–Z",
};

export type FacetCount = { value: string; count: number };
export type SearchResult<T extends SearchDoc> = {
  hits: T[];
  total: number;
  page: number;
  pages: number;
  /** For each facet, the values present in the results with every *other* filter applied (so options never dead-end). */
  facets: Record<string, FacetCount[]>;
  /** Query words that matched nothing exactly and were read as a close catalogue word ("cemnt" → "cement"). */
  corrections: { from: string; to: string }[];
};

/**
 * Words and phrases that mean the same on a building site. A query term matches any phrase in its group.
 * Keep entries lower-case and already normalised (no punctuation).
 */
export const SYNONYMS: string[][] = [
  ["aggregate", "stone", "crushed stone", "gravel"],
  ["ibr", "roof sheet", "roofing sheet", "roof sheeting", "sheeting"],
  ["corrugated", "corro", "zinc sheet"],
  ["rebar", "y bar", "ybar", "reinforcing bar", "reinforcing steel", "reinforcement"],
  ["brickforce", "brick force"],
  ["ready mix", "readymix", "ready mixed"],
  ["dpc", "damp proof course"],
  ["dpm", "damp proof membrane", "builders plastic", "plastic sheeting"],
  ["geyser", "water heater", "hot water cylinder"],
  ["water tank", "jojo", "jojo tank", "rainwater tank"],
  ["upvc", "pvc"],
  ["hdpe", "poly pipe", "polypipe", "polyethylene pipe"],
  ["fibre cement", "fiber cement", "nutec"],
  ["gypsum board", "rhinoboard", "plasterboard", "drywall board", "ceiling board"],
  ["shutterply", "shutter ply", "shuttering ply", "shutter board", "shutterboard"],
  ["formwork", "shuttering"],
  ["prop", "acrow", "acrow prop", "steel prop"],
  ["scaffold", "scaffolding"],
  ["wheelbarrow", "barrow"],
  ["spade", "shovel"],
  ["tile adhesive", "tile glue", "tile cement"],
  ["sealant", "silicone", "mastic"],
  ["timber", "wood", "lumber"],
  ["lath", "latte", "latten"],
  ["braai", "bbq", "barbecue"],
  ["air conditioner", "aircon", "air con", "air conditioning", "split unit"],
  ["extractor fan", "extraction fan", "exhaust fan"],
  ["cctv", "security camera", "surveillance camera"],
  ["instant lawn", "lawn", "grass", "turf", "roll on lawn"],
  ["topsoil", "top soil"],
  ["deck", "decking"],
  ["generator", "genset", "genny"],
  ["solar panel", "pv panel", "pv module"],
  ["borehole pump", "submersible pump"],
  ["pressure reducing valve", "prv"],
  ["kerb", "curb", "kerbstone"],
  ["paver", "paving", "paving brick", "paving block"],
  ["cement block", "concrete block", "maxi block"],
  ["rhinolite", "rhino lite", "skim", "skimming plaster"],
  ["laminate", "laminated flooring", "laminate flooring"],
  ["worktop", "countertop", "counter top"],
  ["kitchen unit", "kitchen cabinet", "kitchen cupboard"],
  ["hob", "stove top", "cooktop"],
  ["grating", "grid mesh", "floor grating"],
  ["asphalt", "tar", "premix", "cold mix"],
  ["road marking", "road paint", "line marking"],
  ["geotextile", "geofabric", "bidim"],
  ["gate motor", "gate opener"],
  ["burglar bar", "burglar bars", "security bars"],
  ["electric fence", "electric fencing"],
  ["insulation", "isotherm", "lagging"],
  ["isoboard", "xps board", "polystyrene board"],
  ["ladder", "step ladder", "stepladder"],
  ["concrete mixer", "cement mixer"],
  ["compactor", "wacker", "plate compactor"],
  ["angle grinder", "grinder"],
  ["sleeper", "sleepers", "railway sleeper"],
  ["pole", "gum pole", "treated pole", "droppers"],
  ["sand", "river sand", "building sand"],
  ["mortar", "dagha", "daga"],
];

const STOP = new Set(["a", "an", "and", "for", "of", "the", "to", "with", "in", "on", "x"]);

/** Lower-case, accents off, "42,5" = "42.5", "×" = "x", punctuation to spaces (dots inside numbers kept). */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/×/g, " x ")
    .replace(/(\d)\s*x\s*(\d)/g, "$1x$2")
    .replace(/(?<!\d)\.|\.(?!\d)/g, " ")
    .replace(/[^a-z0-9.²³\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A light English stem: pipes → pipe, boxes → box, batteries → battery. Numbers and short words are left alone. */
export function stem(word: string): string {
  if (word.length <= 3 || /\d/.test(word)) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

const stemAll = (text: string) => text.split(" ").map(stem).join(" ");

/** Damerau–Levenshtein distance, stopping early once it passes `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

type Prepared<T extends SearchDoc> = { doc: T; name: string; all: string };

/** A clause is one idea in the query; a product must match one of its alternative phrases. */
type Clause = { term: string; alternatives: string[]; fuzzy: boolean };

/** Builds an index over the documents once; `search()` then runs per request. */
export function createSearchIndex<T extends SearchDoc>(docs: T[], synonyms: string[][] = SYNONYMS) {
  const prepared: Prepared<T>[] = docs.map((doc) => {
    const name = stemAll(normalise(doc.name));
    const all = `${name} ${stemAll(normalise(doc.text))}`;
    // "38x114" is also findable as "38 114".
    return { doc, name: ` ${name} `, all: ` ${all} ${all.replace(/(\d)x(\d)/g, "$1 $2")} ` };
  });
  const vocabulary = new Set<string>();
  for (const p of prepared) for (const w of p.all.split(" ")) if (w.length >= 4 && !/\d/.test(w)) vocabulary.add(w);
  const groups = synonyms.map((g) => g.map((phrase) => stemAll(normalise(phrase))));
  const phraseGroups = new Map<string, string[]>();
  for (const g of groups) for (const phrase of g) phraseGroups.set(phrase, [...new Set([...(phraseGroups.get(phrase) ?? []), ...g])]);
  const longestPhrase = Math.max(1, ...[...phraseGroups.keys()].map((p) => p.split(" ").length));

  /** Splits the query into clauses, matching the longest synonym phrases first ("roof sheet" before "roof"). */
  function clauses(query: string): Clause[] {
    const words = stemAll(normalise(query)).split(" ").filter((w) => w && !STOP.has(w));
    const out: Clause[] = [];
    for (let i = 0; i < words.length; ) {
      let matched = false;
      for (let n = Math.min(longestPhrase, words.length - i); n >= 1; n--) {
        const phrase = words.slice(i, i + n).join(" ");
        const group = phraseGroups.get(phrase);
        if (group) {
          out.push({ term: phrase, alternatives: group, fuzzy: false });
          i += n;
          matched = true;
          break;
        }
      }
      if (!matched) {
        out.push({ term: words[i], alternatives: [words[i]], fuzzy: words[i].length >= 4 && !/\d/.test(words[i]) });
        i += 1;
      }
    }
    return out;
  }

  /** Matches at the start of a word, so "tile" finds "tiles" and "cem" finds "cement", but "rod" never finds "products". */
  const contains = (haystack: string, phrase: string) => haystack.includes(` ${phrase}`);

  function correctionsFor(word: string): string[] {
    const max = word.length >= 8 ? 2 : 1;
    const close: { w: string; d: number }[] = [];
    for (const v of vocabulary) {
      if (Math.abs(v.length - word.length) > max || v[0] !== word[0]) continue;
      const d = editDistance(word, v, max);
      if (d <= max) close.push({ w: v, d });
    }
    return close.sort((a, b) => a.d - b.d).slice(0, 4).map((c) => c.w);
  }

  function search(options: SearchOptions = {}): SearchResult<T> {
    const { query = "", filters = {}, sort = "relevance", pageSize = 48 } = options;
    const parsed = clauses(query);
    const corrections: { from: string; to: string }[] = [];
    // A word no product contains is read as its closest catalogue words.
    for (const c of parsed) {
      if (!c.fuzzy || prepared.some((p) => contains(p.all, c.term))) continue;
      const close = correctionsFor(c.term);
      if (close.length) {
        c.alternatives = close;
        corrections.push({ from: c.term, to: close[0] });
      }
    }

    const scored: { doc: T; score: number }[] = [];
    for (const p of prepared) {
      if (options.exclude?.has(p.doc.id)) continue;
      let score = 0;
      let ok = true;
      for (const c of parsed) {
        const inName = c.alternatives.find((a) => contains(p.name, a));
        if (inName) {
          score += 3 + (inName === c.term ? 1 : 0) + (p.name.includes(` ${inName} `) ? 1 : 0);
          continue;
        }
        const inText = c.alternatives.find((a) => contains(p.all, a));
        if (!inText) {
          ok = false;
          break;
        }
        score += 1;
      }
      if (!ok) continue;
      if (parsed.length) {
        const whole = ` ${parsed.map((c) => c.term).join(" ")}`;
        if (p.name.startsWith(whole)) score += 6;
        else if (p.name.includes(whole)) score += 3;
      }
      if (p.doc.price !== null) score += 1;
      scored.push({ doc: p.doc, score });
    }

    const passes = (doc: T, skip?: string) => Object.entries(filters).every(([facet, value]) => !value || facet === skip || doc.facets[facet] === value);
    const facetNames = [...new Set(docs.flatMap((d) => Object.keys(d.facets)))];
    const facets: Record<string, FacetCount[]> = {};
    for (const facet of facetNames) {
      const counts = new Map<string, number>();
      for (const s of scored) {
        const value = s.doc.facets[facet];
        if (value && passes(s.doc, facet)) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      facets[facet] = [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    }

    const filtered = scored.filter((s) => passes(s.doc));
    const byName = (a: { doc: T }, b: { doc: T }) => a.doc.name.localeCompare(b.doc.name);
    const priced = (a: { doc: T }, b: { doc: T }, dir: 1 | -1) =>
      a.doc.price === null ? (b.doc.price === null ? byName(a, b) : 1) : b.doc.price === null ? -1 : dir * (a.doc.price - b.doc.price) || byName(a, b);
    const sorters: Record<SortKey, (a: { doc: T; score: number }, b: { doc: T; score: number }) => number> = {
      relevance: (a, b) => b.score - a.score || (parsed.length ? a.doc.name.length - b.doc.name.length : 0) || byName(a, b),
      "price-asc": (a, b) => priced(a, b, 1),
      "price-desc": (a, b) => priced(a, b, -1),
      name: byName,
    };
    // With no query, "best match" keeps the catalogue order (by line and category), buy-online first.
    const ordered = !parsed.length && sort === "relevance"
      ? [...filtered].sort((a, b) => (a.doc.price === null ? 1 : 0) - (b.doc.price === null ? 1 : 0))
      : [...filtered].sort(sorters[sort] ?? sorters.relevance);
    const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
    const page = Math.min(Math.max(1, Math.floor(options.page ?? 1)), pages);
    return {
      hits: ordered.slice((page - 1) * pageSize, page * pageSize).map((s) => s.doc),
      total: ordered.length,
      page,
      pages,
      facets,
      corrections,
    };
  }

  return { search, size: prepared.length };
}
