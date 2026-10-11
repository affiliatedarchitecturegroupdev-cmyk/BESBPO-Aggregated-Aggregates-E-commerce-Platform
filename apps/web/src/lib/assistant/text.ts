/** Text handling for the rules engine: normalising, tokens, South African building-trade synonyms and numbers with units. */

const STOP = new Set(
  "a an the and or of for to in on at is are be do does i im i'm me my we you your it its this that these those with what which how much many can could would should need want get have has any some some about please there their them they from by per just also like if so than then".split(
    " ",
  ),
);

/** Words people use → the words in our product names and pages. Keys and values are already normalised tokens. */
const SYNONYMS: Record<string, string[]> = {
  builder: ["building"],
  builders: ["building"],
  brick: ["brick", "bricks"],
  mortar: ["building", "mortar"],
  premix: ["ready", "mix", "concrete"],
  readymix: ["ready", "mix", "concrete"],
  redimix: ["ready", "mix", "concrete"],
  rebar: ["rebar", "reinforcing", "bar"],
  ybar: ["rebar", "high", "tensile"],
  zinc: ["roof", "sheet", "sheeting"],
  corrugated: ["corrugated", "roof", "sheet"],
  chromadek: ["pre", "painted", "colour", "coated", "roof", "sheet"],
  colorbond: ["pre", "painted", "colour", "coated"],
  dust: ["crusher", "dust"],
  gravel: ["gravel", "stone"],
  pebbles: ["pebble"],
  pavers: ["paver"],
  paving: ["paver", "paving"],
  kerb: ["kerb"],
  curb: ["kerb"],
  gutters: ["gutter"],
  aerolite: ["glass", "wool", "insulation"],
  isotherm: ["polyester", "insulation"],
  dpc: ["damp", "proof", "course", "dpc"],
  dpm: ["damp", "proof", "membrane", "dpm"],
  bidim: ["geotextile", "nonwoven"],
  lime: ["lime"],
  tlb: ["tlb", "backhoe"],
  bobcat: ["skid", "steer"],
  digger: ["excavator", "tlb"],
  skips: ["skip"],
};

export function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/m³/g, "m3")
    .replace(/m²/g, "m2")
    .replace(/[’']/g, "")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/(\d)\s*[x×*]\s*(?=\d)/g, "$1 x ")
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plural-insensitive stem: "bricks" → "brick", "sands" → "sand" (but not "glass" or "ballast"). */
export function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us") && !word.endsWith("ast")) return word.slice(0, -1);
  return word;
}

/** Content tokens of a text, stemmed, without stop words. */
export function tokens(text: string): string[] {
  return normalise(text)
    .split(/[\s-]+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

/** Bare units and whole numbers say nothing about which product is meant — sizes are read separately by measures(). */
const NOISE = /^(\d+|x|mm|cm|m|m2|m3|km|kg|t|ton|tons|tonne|tonnes|cube|cubes|metre|metres|meter|meters|long|wide|high|deep|thick)$/;

/** Tokens of a customer's message plus the synonyms they imply. */
export function queryTokens(text: string): string[] {
  const out = new Set<string>();
  for (const t of normalise(text).split(/[\s-]+/)) {
    if (!t || STOP.has(t) || NOISE.test(t)) continue;
    out.add(stem(t));
    for (const s of SYNONYMS[t] ?? SYNONYMS[stem(t)] ?? []) out.add(stem(s));
  }
  return [...out];
}

export type Measure = { value: number; unit: "mm" | "cm" | "m" | "m2" | "m3" | "ton" | "kg" | "km" | "none" };

/** Every number in the message with the unit written after it ("6m", "100 mm", "3 m3", "2 tons"). */
export function measures(text: string): Measure[] {
  const out: Measure[] = [];
  const re = /(\d+(?:\.\d+)?)\s*(mm|cm|m2|m3|sqm|cubes?|cubic|tons?|tonnes?|t\b|kg|km|metres?|meters?|m\b)?/g;
  const s = normalise(text);
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const value = Number(m[1]);
    if (!Number.isFinite(value)) continue;
    const u = m[2] ?? "";
    const unit: Measure["unit"] =
      u === "mm" ? "mm"
      : u === "cm" ? "cm"
      : u === "m2" || u === "sqm" ? "m2"
      : u === "m3" || u.startsWith("cube") || u === "cubic" ? "m3"
      : u.startsWith("ton") || u.startsWith("tonne") || u === "t" ? "ton"
      : u === "kg" ? "kg"
      : u === "km" ? "km"
      : u ? "m"
      : "none";
    out.push({ value, unit });
  }
  return out;
}

/** True when any of the phrases appears as whole words in the normalised text. */
export function has(text: string, ...phrases: string[]): boolean {
  const s = ` ${normalise(text)} `;
  return phrases.some((p) => s.includes(` ${p} `) || (p.endsWith("*") && s.includes(` ${p.slice(0, -1)}`)));
}
