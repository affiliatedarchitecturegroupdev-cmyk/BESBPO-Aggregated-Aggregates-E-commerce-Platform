/**
 * The free, rules-based shopping assistant (SHOPPING_ASSISTANT.md). It
 * answers only from the store's own data — catalogue, list prices, the
 * calculators' maths, FAQs, policies and services — and says so; anything it
 * can't answer goes to a quote, WhatsApp or the contact page. No model, no
 * outside calls, nothing stored.
 */
import { resolveJob, jobKeyFor, type JobKey } from "@/data/complete-the-job";
import { COVERAGE_TOWNS } from "@/data/coverage-towns";
import { EXPRESS } from "@/data/express";
import { feeFor, feeLabel, nhbrcEnrolmentFee } from "@/data/design-services";
import { wallTakeOff } from "@/data/masonry";
import { CUT_TO_LENGTH } from "@/data/roofing";
import { barTakeOff, BAR_MASS_KG_PER_M, Y_BARS } from "@/data/steel";
import { WHATSAPP_NUMBER } from "@/data/social";
import { formatZAR } from "@/lib/pricing";
import { card, clearProduct, faq, priceLine, productDoc, searchDesign, searchFaqs, searchHire, searchPages, searchProducts, unitName, visible, type ProductDoc } from "./knowledge";
import { has, measures, normalise, queryTokens, type Measure } from "./text";
import type { AssistantCard, AssistantContext, AssistantEngine, AssistantLink, AssistantReply, AssistantState } from "./types";

const QUOTE: AssistantLink = { label: "Request a quote", href: "/quote" };
const CONTACT: AssistantLink = { label: "Contact sales", href: "/contact" };
const whatsapp = (text: string): AssistantLink => ({ label: "Chat on WhatsApp", href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}` });
const num = (n: number, dp = 2) => n.toLocaleString("en-US", { maximumFractionDigits: dp });

/** Words that point at a job, most specific first ("french drain" before "drain", "retaining wall" before "wall"). */
const JOB_WORDS: [JobKey, string[]][] = [
  ["frenchDrain", ["french drain", "subsoil drain", "soakaway"]],
  ["precast", ["manhole", "culvert", "channel drain"]],
  ["drains", ["drain", "drains", "drainage", "sewer", "pipe", "pipes"]],
  ["retaining", ["retaining", "terrace", "embankment"]],
  ["gabions", ["gabion", "gabions"]],
  ["tiledRoof", ["roof tile", "roof tiles", "tiled roof", "tile roof"]],
  ["rainwater", ["gutter", "gutters", "downpipe", "downpipes", "rainwater"]],
  ["sheetRoof", ["roof", "roofing", "roof sheet", "roof sheets", "carport", "shed"]],
  ["layerworks", ["driveway", "road", "roads", "parking", "yard", "layerworks"]],
  ["paving", ["paving", "pavers", "paver", "patio"]],
  ["slab", ["slab", "surface bed", "floor slab", "floor"]],
  ["plaster", ["plaster", "plastering", "render", "screed"]],
  ["walls", ["wall", "walls", "brickwork", "bricklaying", "boundary wall", "house walls"]],
  ["steelFixing", ["steel fixing", "reinforcement", "reinforcing", "rebar"]],
  ["concrete", ["concrete", "footing", "footings", "foundation", "foundations", "column", "columns"]],
  ["garden", ["garden", "landscaping", "path", "paths", "pathway", "flower bed"]],
  ["earthworks", ["level the site", "fill", "platform", "earthworks", "build up the site", "backfill"]],
];

function jobIn(text: string): JobKey | null {
  return jobMatch(text)?.key ?? null;
}

function jobMatch(text: string): { key: JobKey; phrase: string } | null {
  for (const [key, words] of JOB_WORDS) {
    const phrase = words.find((w) => has(text, w));
    if (phrase) return { key, phrase };
  }
  return null;
}

const greetingSuggestions = ["Tons of G5 for 6 x 4 m, 150 mm deep?", "What do I need for a driveway?", "Price of 19mm stone", "Do you deliver to Polokwane?"];

function productSuggestions(name: string) {
  return ["How much do I need?", "What else do I need for this job?", `Price of ${name.split(/[,(]/)[0].trim()}`, "Do you deliver to my area?"];
}

// ---------------------------------------------------------------------------
// Sizes from the message

type Sizes = { lengths: number[]; depthM: number | null; areaM2: number | null; volumeM3: number | null; tons: number | null };

function sizes(ms: Measure[]): Sizes {
  const lengths: number[] = [];
  let depthM: number | null = null;
  let areaM2: number | null = null;
  let volumeM3: number | null = null;
  let tons: number | null = null;
  for (const m of ms) {
    if (m.unit === "m2") areaM2 = m.value;
    else if (m.unit === "m3") volumeM3 = m.value;
    else if (m.unit === "ton") tons = m.value;
    else if (m.unit === "mm") depthM = m.value / 1000;
    else if (m.unit === "cm") depthM = m.value / 100;
    else if (m.unit === "m" || m.unit === "none") lengths.push(m.value);
  }
  // "6 x 4 x 100": a bare third number of 25 or more is a depth in millimetres.
  if (lengths.length >= 3 && depthM === null && lengths[2] >= 25) depthM = lengths.splice(2, 1)[0] / 1000;
  return { lengths, depthM, areaM2, volumeM3, tons };
}

function volumeOf(s: Sizes): number | null {
  if (s.volumeM3) return s.volumeM3;
  const [a, b, c] = s.lengths;
  if (s.areaM2 && s.depthM) return s.areaM2 * s.depthM;
  if (a && b && s.depthM) return a * b * s.depthM;
  if (a && b && c) return a * b * c;
  return null;
}

function areaOf(s: Sizes): number | null {
  if (s.areaM2) return s.areaM2;
  const [a, b] = s.lengths;
  return a && b ? a * b : null;
}

// ---------------------------------------------------------------------------
// Answers

function greet(context: AssistantContext): AssistantReply {
  const doc = context.sku ? productDoc(context.sku) : undefined;
  return {
    intent: "greeting",
    text:
      "Hi — I'm the Aggregated Aggregates assistant, an automated helper that works from our own catalogue. I can find materials, give list prices, work out quantities, suggest what else a job needs, and point you to delivery, hire and design services." +
      (doc ? `\n\nYou're looking at ${doc.product.name} — ask me about it.` : "") +
      "\n\nFor a firm, delivered price, request a quote and our team confirms it.",
    suggestions: doc ? productSuggestions(doc.product.name) : greetingSuggestions,
    ...(doc ? { state: { sku: doc.product.sku } } : {}),
  };
}

function productAnswer(doc: ProductDoc): AssistantReply {
  const p = doc.product;
  const units = p.units.filter((u) => u.code !== "METRE");
  const priced = units.filter((u) => u.retailPrice !== null);
  const lines: string[] = [];
  if (priced.length) lines.push(`${p.name}: ${priced.map((u) => priceLine(u)).join(" · ")} (retail list price; approved trade accounts may pay less, delivery is extra).`);
  else lines.push(`${p.name} is priced on request — we confirm a supplier-backed price on a quote rather than guess.`);
  if (p.minimumQuantity) lines.push(`Ready-mix comes by the mixer truck: at least ${p.minimumQuantity} m³ per order.`);
  if (p.units.some((u) => u.code === "METRE")) {
    lines.push(`Also cut to any length from ${CUT_TO_LENGTH.min_m} to ${CUT_TO_LENGTH.max_m} m on a quote — sheets cut to length can't be returned or refunded once cut.`);
  }
  if (doc.uses.length) lines.push(`Typical uses: ${doc.uses.slice(0, 3).join("; ")}.`);
  const companions = jobKeyFor(p.sku, p.categorySlug);
  return {
    intent: "product",
    text: lines.join("\n\n"),
    cards: [card(p)],
    suggestions: ["How much do I need?", ...(companions ? ["What else do I need for this job?"] : []), "Do you deliver to my area?"],
    state: { sku: p.sku },
  };
}

function suitabilityAnswer(doc: ProductDoc, text: string, words: string[], context: AssistantContext): AssistantReply {
  const useTokens = new Set(doc.uses.flatMap((u) => queryTokens(u)));
  const asked = words.filter((w) => !doc.nameTokens.has(w) && !["good", "suitable", "use", "used", "ok", "okay", "right", "work"].includes(w));
  const fits = asked.length > 0 && asked.some((w) => useTokens.has(w));
  const uses = doc.uses.length ? doc.uses.join("; ") : "not listed";
  if (fits) {
    return {
      intent: "suitability",
      text: `Yes — ${doc.product.name} is listed for: ${uses}. For structural or engineered work, check the specification and the batch certificate first.`,
      cards: [card(doc.product)],
      suggestions: ["How much do I need?", "What else do I need for this job?"],
      state: { sku: doc.product.sku },
    };
  }
  const job = jobIn(text);
  const alternative = job ? jobAnswer(job, context, `For that job`) : null;
  return {
    intent: "suitability",
    text: `${doc.product.name} isn't listed for that — its typical uses are: ${uses}.${alternative ? "\n\n" + alternative.text : " Tell me the job and I'll suggest the right material."}`,
    cards: alternative?.cards,
    links: alternative?.links,
    state: { sku: doc.product.sku },
  };
}

function productsAnswer(docs: ProductDoc[], lead: string): AssistantReply {
  return {
    intent: "products",
    text: lead,
    cards: docs.map((d) => card(d.product)),
    suggestions: [...new Set(docs.slice(0, 3).map((d) => `Tell me about ${d.product.name.split(",")[0].trim()}`))],
    state: docs.length === 1 ? { sku: docs[0].product.sku } : {},
  };
}

function jobAnswer(key: JobKey, context: AssistantContext, lead?: string): AssistantReply | null {
  const job = resolveJob(key, [...context.hiddenSkus, ...context.cart.map((l) => l.sku)]);
  if (!job) return null;
  const cards: AssistantCard[] = job.companions.map((c) => card(visible(c.sku, context.hiddenSkus)!, { unit: c.unit, quantity: c.quantity, note: c.why }));
  return {
    intent: "job",
    text: `${lead ?? `To ${job.title.charAt(0).toLowerCase()}${job.title.slice(1)}`}, this is what the job usually takes (${job.stageLabel} stage). Quantities depend on your sizes — tell me them and I'll work them out.`,
    cards,
    links: [{ label: `Shop the ${job.stageLabel.toLowerCase()} stage`, href: `/shop-by-stage?stage=${job.stage}` }],
    suggestions: ["How much do I need?", "Do you deliver to my area?"],
  };
}

function completeAnswer(context: AssistantContext, state: AssistantState): AssistantReply {
  const sku = context.sku ?? state.sku;
  const doc = sku ? productDoc(sku) : undefined;
  if (doc) {
    const key = jobKeyFor(doc.product.sku, doc.product.categorySlug);
    const reply = key && jobAnswer(key, { ...context, cart: [...context.cart, { sku: doc.product.sku, unit: "", quantity: 0 }] }, `With ${doc.product.name}`);
    if (reply) return { ...reply, state: { sku: doc.product.sku } };
  }
  if (context.cart.length) return cartAnswer(context);
  return {
    intent: "complete",
    text: "Tell me the job — a driveway, a slab, a boundary wall, a French drain, a roof — and I'll list what it usually takes.",
    suggestions: ["What do I need for a driveway?", "What do I need for a slab?", "What do I need for a roof?"],
  };
}

function cartAnswer(context: AssistantContext): AssistantReply {
  if (!context.cart.length) {
    return { intent: "cart", text: "Your cart is empty. Tell me what you're building and I'll suggest the materials.", suggestions: greetingSuggestions.slice(0, 2) };
  }
  const lines: string[] = [];
  let total = 0;
  let unpriced = 0;
  for (const l of context.cart) {
    const p = visible(l.sku, []);
    const u = p?.units.find((x) => x.code === l.unit);
    if (!p || !u) continue;
    if (u.retailPrice === null) unpriced++;
    else total += u.retailPrice * l.quantity;
    lines.push(`• ${num(l.quantity, 3)} × ${unitName(u)} ${p.name}${u.retailPrice === null ? " (priced on request)" : ""}`);
  }
  const cartSkus = context.cart.map((l) => l.sku);
  const seen = new Set<string>(cartSkus);
  const missing: AssistantCard[] = [];
  for (const l of context.cart) {
    const p = visible(l.sku, []);
    const key = p && jobKeyFor(p.sku, p.categorySlug);
    const job = key && resolveJob(key, [...context.hiddenSkus, ...cartSkus]);
    for (const c of job ? job.companions : []) {
      if (seen.has(c.sku) || missing.length >= 4) continue;
      seen.add(c.sku);
      missing.push(card(visible(c.sku, context.hiddenSkus)!, { unit: c.unit, quantity: c.quantity, note: c.why }));
    }
  }
  return {
    intent: "cart",
    text:
      `In your cart:\n${lines.join("\n")}\n\nAt retail list prices that's about ${formatZAR(Math.round(total * 100) / 100)}${unpriced ? `, plus ${unpriced} item${unpriced === 1 ? "" : "s"} priced on request` : ""} — before delivery and any trade discount. Checkout confirms the price.` +
      (missing.length ? "\n\nJobs like these usually also need:" : ""),
    cards: missing,
    links: [{ label: "Go to cart", href: "/cart" }],
  };
}

function quantityAnswer(text: string, context: AssistantContext, state: AssistantState): AssistantReply {
  const s = sizes(measures(text));
  const sku = context.sku ?? state.sku;
  const doc = sku ? productDoc(sku) : undefined;
  const cat = doc?.product.categorySlug ?? "";
  const job = jobIn(text);
  const kind: AssistantState["pending"] =
    state.pending && !job && !has(text, "brick*", "block*", "paver*", "paving", "y8", "y10", "y12", "y16", "rebar")
      ? state.pending
      : has(text, "y8", "y10", "y12", "y16", "y20", "y25", "rebar", "bar") || cat === "reinforcing-bar"
        ? "rebar"
        : has(text, "brick*", "block*") || job === "walls" || cat === "bricks-blocks"
          ? "wall"
          : has(text, "paver*") || job === "paving" || cat === "paving-kerbs-edging"
            ? "paving"
            : "volume";

  if (job === "sheetRoof" || job === "tiledRoof" || cat === "roof-sheeting" || cat === "concrete-roof-tiles") {
    return {
      intent: "quantity",
      text: "A roof needs the pitch and the overhangs as well as the plan size — the roof calculator works out sheets or tiles, ridge, underlay, insulation, gutters and downpipes, and adds them to your cart.",
      links: [{ label: "Open the roof calculator", href: "/roofing#roof-calculator" }],
    };
  }

  if (kind === "rebar") {
    const d = Number((normalise(text).match(/\by(8|10|12|16|20|25|32)\b/) ?? normalise(text).match(/\b(8|10|12|16|20|25|32)\s*mm\b/) ?? [])[1] ?? doc?.product.name.match(/Y(\d+)/)?.[1] ?? 0);
    const metres = s.lengths.find((l) => l !== d) ?? null;
    if (!d || !metres || !BAR_MASS_KG_PER_M[d]) {
      return { intent: "quantity", text: "Which bar size, and how many metres of bar in total? For example: \"120 m of Y12\".", state: { pending: "rebar", sku } };
    }
    const t = barTakeOff(d, metres);
    const bar = Y_BARS.find((b) => b.diameterMm === d);
    const product = bar && visible(bar.sku, context.hiddenSkus);
    return {
      intent: "quantity",
      text: `${num(metres)} m of Y${d} at ${t.kgPerM} kg/m (SANS 920 nominal) is ${num(t.kg)} kg — ${t.lengths} stock lengths of 6 m, with no allowance for laps or offcuts. The engineer's bar schedule governs.`,
      cards: product ? [card(product, { unit: "LENGTH_6M", quantity: t.lengths })] : [],
      links: [{ label: "Cut & bend to your schedule", href: "/reinforcing-steel/cut-and-bend" }],
      state: { sku: product?.sku },
    };
  }

  if (kind === "wall") {
    const area = areaOf(s);
    if (!area) return { intent: "quantity", text: "How long and how high is the wall? For example: \"12 m long, 1.8 m high\". Say \"double\" for a two-leaf (230 mm) wall.", state: { pending: "wall", sku } };
    const leaves = has(text, "double", "two leaves", "2 leaves", "230", "230mm", "one brick") ? 2 : 1;
    const preferred = doc?.unitsPerM2 && cat === "bricks-blocks" ? doc.product.sku : has(text, "block*") ? "AA-MAS-BLOCK-140" : "AA-MAS-CLAY-STOCK";
    const brick = productDoc(preferred);
    if (!brick?.unitsPerM2 || context.hiddenSkus.includes(preferred)) return { intent: "quantity", text: "The wall calculator works this out for each brick and block.", links: [{ label: "Wall calculator", href: "/bricks-blocks#wall-calculator" }] };
    const t = wallTakeOff(brick.unitsPerM2, area, leaves);
    const perThousand = brick.product.units.some((u) => u.code === "THOUSAND");
    return {
      intent: "quantity",
      text: `${num(area)} m² of ${leaves === 2 ? "double-leaf" : "single-leaf"} wall in ${brick.product.name} takes about ${num(t.net, 0)} units, ${num(t.withBreakage, 0)} with 5% for breakage${perThousand ? ` — ${Math.ceil(t.withBreakage / 1000)} lots of 1,000` : ""}. Doors and windows aren't taken off; the wall calculator does that.`,
      cards: [card(brick.product, { quantity: perThousand ? Math.ceil(t.withBreakage / 1000) : t.withBreakage })],
      links: [{ label: "Wall calculator", href: "/bricks-blocks#wall-calculator" }],
      suggestions: ["What else do I need for the walls?"],
      state: { sku: brick.product.sku },
    };
  }

  if (kind === "paving") {
    const area = areaOf(s);
    if (!area) return { intent: "quantity", text: "What's the area to pave? Give the length and width (\"8 x 5 m\") or the m².", state: { pending: "paving", sku } };
    const paver = doc?.unitsPerM2 && cat === "paving-kerbs-edging" ? doc : productDoc("AA-PAV-BEVEL-50");
    const sand = productDoc("AA-SND-01");
    const cards: AssistantCard[] = [];
    const parts: string[] = [];
    if (paver?.unitsPerM2 && !context.hiddenSkus.includes(paver.product.sku)) {
      const count = Math.ceil(area * paver.unitsPerM2 * 1.05);
      parts.push(`${num(area)} m² in ${paver.product.name} is about ${num(count, 0)} pavers with 5% for cuts.`);
      cards.push(card(paver.product, { quantity: count }));
    }
    if (sand?.densityKgPerM3 && !context.hiddenSkus.includes(sand.product.sku)) {
      const tons = (area * 0.03 * sand.densityKgPerM3) / 1000;
      parts.push(`A 30 mm sand bedding layer is about ${num(area * 0.03)} m³ — ${num(tons, 1)} tons of river sand.`);
      cards.push(card(sand.product, { unit: "ton", quantity: tons, note: "Bedding sand" }));
    }
    parts.push("Driveways also need a compacted sub-base and base course — ask \"what do I need for a driveway\".");
    return { intent: "quantity", text: parts.join(" "), cards, links: [{ label: "Paving calculator", href: "/paving#paving-calculator" }], state: { sku: paver?.product.sku } };
  }

  // Volume: aggregates by the ton, concrete by the m³.
  const volume = volumeOf(s);
  const aggregateWords = has(text, "sand", "stone", "gravel", "crusher run", "fill", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9", "g10", "dust", "pebble*");
  const concrete = cat === "ready-mix-concrete" || has(text, "concrete", "ready mix", "readymix", "premix") || ((job === "concrete" || job === "slab") && !aggregateWords && !doc?.densityKgPerM3);
  if (!volume) {
    const what = concrete ? "the slab or footing" : doc ? `the ${doc.product.name.toLowerCase()}` : "the area";
    return {
      intent: "quantity",
      text: `What are the length, width and depth of ${what}? For example: "6 x 4 m, 100 mm deep".`,
      state: { pending: "volume", sku },
    };
  }
  if (concrete && (!doc || cat === "ready-mix-concrete" || !doc.densityKgPerM3)) {
    const rmx = visible(cat === "ready-mix-concrete" && sku ? sku : "AA-RMX-25MPA-001", context.hiddenSkus);
    const m3 = Math.ceil(volume * 2) / 2;
    return {
      intent: "quantity",
      text:
        `That's ${num(volume)} m³ of concrete — order about ${num(m3)} m³.` +
        (rmx?.minimumQuantity ? ` Ready-mix ${rmx.name.replace("Ready-Mix Concrete ", "")} comes by the truck, minimum ${rmx.minimumQuantity} m³; for less, mix on site.` : "") +
        " Your engineer specifies the strength.",
      cards: rmx ? [card(rmx, { quantity: Math.max(m3, rmx.minimumQuantity ?? 0) })] : [],
      links: [{ label: "Ready-mix calculator", href: "/products/ready-mix-concrete-25mpa#calculator" }],
      suggestions: ["What do I need to mix concrete on site?"],
      state: { sku: rmx?.sku },
    };
  }
  const material = doc?.densityKgPerM3 ? doc : null;
  if (!material) {
    return {
      intent: "quantity",
      text: `That's ${num(volume)} m³. Which material — river sand, G5, 19mm stone, crusher run…? I'll convert it to tons.`,
      state: { volumeM3: Math.round(volume * 1000) / 1000 },
    };
  }
  const tons = (volume * material.densityKgPerM3!) / 1000;
  const sellsTon = material.product.units.some((u) => u.code === "ton");
  return {
    intent: "quantity",
    text: `${num(volume)} m³ of ${material.product.name} weighs about ${num(tons, 1)} tons (bulk density ${num(material.densityKgPerM3!, 0)} kg/m³). That's the loose volume of the space — compacted layers take more; the calculator on the product page adds delivery.`,
    cards: [card(material.product, sellsTon ? { unit: "ton", quantity: tons } : { unit: "m3", quantity: volume })],
    links: [{ label: "Open the calculator", href: `/products/${material.product.slug}#calculator` }],
    suggestions: ["What else do I need for this job?", "Do you deliver to my area?"],
    state: { sku: material.product.sku },
  };
}

/** AA 60/120 express delivery (data/express.ts; the API decides each cart). */
function expressAnswer(): AssistantReply {
  return {
    intent: "delivery",
    text: `AA 60/120 delivers cement in bags, bagged sand and stone, bricks, blocks, lintels, DPC, small steel and roofing within ${EXPRESS.promiseMinutes} minutes, for ${formatZAR(EXPRESS.fee)} on top of delivery. Your site must be within ${EXPRESS.radiusKm} km of a partner supplier for every item, and orders are taken ${EXPRESS.hours} (card or PayFast). The clock starts ${EXPRESS.prepMinutes} minutes after our sales team confirms the supplier, and if we're more than an hour late the express fee is refunded. Checkout tells you if your cart qualifies.`,
    links: [
      { label: "How AA 60/120 works", href: "/aa-60-120" },
      { label: "Check your site", href: "/aa-60-120#check" },
    ],
  };
}

function deliveryAnswer(text: string): AssistantReply {
  const s = ` ${normalise(text)} `;
  const town = COVERAGE_TOWNS.find((t) => [t.name, ...(t.aliases ?? [])].some((n) => s.includes(` ${normalise(n)} `)));
  const delivery = faq("Do you deliver")!;
  if (town) {
    return {
      intent: "delivery",
      text: `Yes — ${town.name} (${town.province}) is on our delivery list. We deliver from the approved partner supplier nearest your site; the delivery charge depends on the distance, and the calculator on each product page estimates it.\n\n${delivery.answer}`,
      links: [
        { label: "Delivery areas & charges", href: "/delivery-areas" },
        { label: "Where we deliver", href: "/coverage" },
      ],
    };
  }
  const named = has(text, "to", "in") && /\b(to|in)\s+[a-z]{3,}/.test(normalise(text));
  return {
    intent: "delivery",
    text: named
      ? `${faq("Which provinces")!.answer}\n\nI couldn't match that town to our list — request a quote with your site address and we'll confirm.`
      : delivery.answer,
    links: [
      { label: "Where we deliver", href: "/coverage" },
      { label: "Delivery areas & charges", href: "/delivery-areas" },
      QUOTE,
    ],
  };
}

function designAnswer(text: string, words: string[]): AssistantReply {
  const ms = measures(text);
  const amount = ms.find((m) => m.value >= 10000)?.value ?? null;
  if (has(text, "nhbrc") && amount) {
    return {
      intent: "design",
      text: `The statutory NHBRC enrolment fee on ${formatZAR(amount)} is about ${formatZAR(nhbrcEnrolmentFee(amount))} plus VAT (Rules regarding NHBRC Fees: 1.3% of the first R500,000, then sliding to 0.5% up to R5m). The home builder pays it; the NHBRC confirms the amount.`,
      links: [{ label: "Design fee estimator", href: "/design#fee-estimator" }],
    };
  }
  const services = searchDesign(words);
  const area = ms.find((m) => m.unit === "m2")?.value ?? (has(text, "plan*", "house") ? ms.find((m) => m.value >= 20 && m.value <= 5000)?.value : undefined);
  if (services.length) {
    const top = services[0];
    const fee = area ? feeFor(top.fee, area, 0) : null;
    const estimate = fee && top.fee.kind === "perM2" ? ` For ${num(area!, 0)} m² that's about ${formatZAR(fee.low)}, excl. VAT.` : "";
    return {
      intent: "design",
      text: `Bellwether Architecture & Engineering (BAE), our group's design practice: ${top.name} — ${feeLabel(top.fee)}.${estimate} ${top.summary}\n\nBAE confirms every fee on a written proposal; send a brief to get one.`,
      links: [
        { label: top.name, href: `/design/${top.slug}#brief` },
        ...services.slice(1).map((sv) => ({ label: sv.name, href: `/design/${sv.slug}` })),
        { label: "Design fee estimator", href: "/design#fee-estimator" },
      ],
    };
  }
  return {
    intent: "design",
    text: "Bellwether Architecture & Engineering (BAE), our group's design practice, does house plans and council submissions, additions, plan regularisation, structural design and inspections, retaining walls, stormwater and roads, energy (XA) design and bills of quantities — with fixed fees for defined jobs and a fee estimator for the rest.",
    links: [
      { label: "Design services", href: "/design" },
      { label: "Fee estimator", href: "/design#fee-estimator" },
    ],
  };
}

function hireAnswer(words: string[]): AssistantReply {
  const items = searchHire(words);
  const why = faq("Why can't I see a price for plant hire")!.answer;
  return {
    intent: "hire",
    text: items.length
      ? `${items.map((i) => i.name).join(", ")} — done by vetted partners near your site. ${why} Request it from the page and nothing is booked until you accept the quote.`
      : `Plant hire (TLBs, excavators, rollers, tippers and more) and site services (haulage, rubble removal, skips, clearing, demolition, steel fixing) are done by vetted partners near your site. ${why}`,
    links: [...items.map((i) => ({ label: i.name, href: i.href })), { label: "Plant hire", href: "/plant-hire" }, { label: "Site services", href: "/services" }].slice(0, 4),
  };
}

function policyAnswer(text: string): AssistantReply {
  const cut = has(text, "cut", "cut to length", "bent", "bend", "made to order", "rebar", "roof sheet*", "sheet*");
  return {
    intent: "returns",
    text: cut
      ? "Materials cut or made to your specification — roof sheets cut to length and steel cut and bent — can't be returned, exchanged or refunded once cut or made, unless what's delivered doesn't match the quote you accepted or the material is defective. Check every length and shape before you accept the quote."
      : "Aggregates are delivered as bulk loads or bags to your quantity, so they're non-returnable once dispatched — unless the wrong product or grading was delivered, it's defective or out of specification, or the load is materially short. Cut-to-length sheets and cut-and-bent steel can't be refunded once cut. The policy sets out how to report a problem and the remedies.",
    links: [{ label: "Returns & Refunds Policy", href: "/legal/returns-refunds" }, { label: "Handling Fee Policy", href: "/legal/handling-fee" }, CONTACT],
  };
}

function fallback(words: string[], context: AssistantContext): AssistantReply {
  const pages = searchPages(words);
  return {
    intent: "fallback",
    text: pages.length
      ? "I'm not sure I've understood — these pages look closest:"
      : "I couldn't find that in our catalogue. Try a material (\"river sand\", \"Y12\", \"IBR sheet\"), a job (\"driveway\", \"slab\", \"boundary wall\") or a question about delivery, payment or hire — or ask our team.",
    links: [...pages.map((p) => ({ label: p.title, href: p.href })), QUOTE, whatsapp("Hi, I have a question about a building materials order.")],
    suggestions: context.sku ? productSuggestions(productDoc(context.sku)?.product.name ?? "this") : greetingSuggestions,
  };
}

// ---------------------------------------------------------------------------

export async function respondWithRules(message: string, context: AssistantContext, state: AssistantState): Promise<AssistantReply> {
  const text = message.trim();
  if (!text) return greet(context);
  const words = queryTokens(text);
  const ms = measures(text);
  const aboutThis = has(text, "this", "it", "these", "that one", "this one");
  const contextSku = context.sku ?? state.sku ?? null;

  // A follow-up giving the sizes the last answer asked for.
  if (state.pending && ms.length && !has(text, "price", "cost", "deliver*")) return quantityAnswer(text, context, state);
  // A follow-up naming the material for a volume already worked out.
  if (state.volumeM3 && !ms.length) {
    const material = clearProduct(words, context.hiddenSkus);
    if (material?.densityKgPerM3) return quantityAnswer(`${state.volumeM3} m3`, { ...context, sku: material.product.sku }, { sku: material.product.sku });
  }

  if (/^(hi|hello|hey|howzit|good (morning|afternoon|evening)|help|start|menu)\b/.test(normalise(text)) && words.length <= 3) return greet(context);
  if (has(text, "what can you do", "who are you", "are you a bot", "are you human", "are you real")) return greet(context);

  if (has(text, "human", "person", "agent", "consultant", "call me", "phone", "speak to", "talk to", "contact", "whatsapp", "email you")) {
    return {
      intent: "contact",
      text: "Our sales team can help directly — WhatsApp is quickest for smaller orders; bulk and civil orders go through a quote for delivered pricing.",
      links: [whatsapp("Hi Aggregated Aggregates, I'd like some help with an order."), CONTACT, QUOTE],
    };
  }
  if (has(text, "my order", "track*", "order status", "where is my", "delivery status", "invoice", "my quote", "my booking")) {
    return {
      intent: "orders",
      text: "Sign in to your account to see your orders, quotes, invoices and bookings and where each one is. I can't see account details from this chat.",
      links: [
        { label: "My account", href: "/account/dashboard" },
        { label: "My orders", href: "/account/orders" },
      ],
    };
  }
  if (has(text, "return*", "refund*", "exchange", "send back", "money back", "cancel*")) return policyAnswer(text);
  if (has(text, "pay", "payment*", "paying", "eft", "card", "credit", "instalment*", "installment*", "payflex", "payjustnow", "capitec", "snapscan", "zapper", "lulapay", "account terms")) {
    return { intent: "payment", text: faq("What payment methods")!.answer, links: [{ label: "Ways to pay", href: "/ways-to-pay" }, { label: "Trade accounts", href: "/trade-accounts" }] };
  }
  if (has(text, "trade account", "trade price*", "discount*", "contractor price*", "bulk price*", "tier*", "wholesale")) {
    return { intent: "trade", text: faq("What are the Retail")!.answer, links: [{ label: "Trade accounts", href: "/trade-accounts" }, QUOTE] };
  }
  if (has(text, "architect*", "plans", "house plan*", "building plan*", "draughts*", "drafts*", "council", "engineer*", "structural", "regularis*", "as built", "nhbrc", "bill of quantities", "boq", "quantity surveyor", "design*", "bae", "bellwether", "xa", "energy rating")) {
    return designAnswer(text, words);
  }
  if (has(text, "hire", "rent*", "tlb", "excavator*", "digger", "bobcat", "skid steer", "roller", "tipper*", "skip*", "rubble", "demolition", "demolish", "clearing", "site clearing", "haulage", "water truck", "steel fixer*", "operator")) {
    return hireAnswer(words);
  }
  if (has(text, "60/120", "60 120", "express", "urgent*", "same day", "same-day", "within 2 hours", "within two hours", "in 2 hours", "asap", "rush")) return expressAnswer();
  if (has(text, "deliver*", "delivery", "shipping", "transport", "collect*", "do you come to", "available in", "you service")) return deliveryAnswer(text);
  if (has(text, "what else", "go with", "goes with", "complete the job", "anything else", "am i missing", "forgot*", "also need", "else do i need")) return completeAnswer(context, state);
  if (has(text, "my cart", "cart", "basket", "trolley")) return cartAnswer(context);

  const job = jobIn(text);
  const asksQuantity = has(text, "how much", "how many", "calculate", "work out", "quantity", "estimate", "convert", "how many tons", "how many cubes") || (ms.some((m) => m.unit !== "none" || ms.length >= 2) && !has(text, "price*", "cost*"));
  if (asksQuantity && (ms.length || has(text, "need") || job || contextSku)) {
    const specific = clearProduct(words, context.hiddenSkus);
    if (specific && !aboutThis) return quantityAnswer(text, { ...context, sku: specific.product.sku }, { ...state, sku: specific.product.sku });
    if (ms.length || contextSku || job) return quantityAnswer(text, context, state);
  }

  // "Is this good for plaster?" — answered from the product's own listed uses.
  if (contextSku && has(text, "good for", "suitable", "use it for", "use this for", "used for", "ok for", "okay for", "right for", "work for", "can i use")) {
    const doc = productDoc(contextSku);
    if (doc) return suitabilityAnswer(doc, text, words, context);
  }

  const asksPrice = has(text, "price*", "cost*", "how much is", "how much are", "how much does", "rate", "per ton", "per cube", "per m3", "cheap*", "expensive");
  const clear = clearProduct(words, context.hiddenSkus);
  if (contextSku && !clear && (aboutThis || asksPrice) && (asksPrice || words.length <= 4)) {
    const doc = productDoc(contextSku);
    if (doc) return productAnswer(doc);
  }
  // A product named outright beats the job it belongs to ("plaster sand", "G5").
  // …unless the only words it shares are the job's own ("french drain" is the job, not just the stone).
  const jobWords = new Set(queryTokens(jobMatch(text)?.phrase ?? ""));
  const beyondJob = words.filter((w) => clear?.nameTokens.has(w) && !jobWords.has(w)).length;
  if (clear && (asksPrice || !job || beyondJob >= 1)) return productAnswer(clear);

  if (job && (has(text, "what do i need", "what do you need", "need for", "materials for", "for a", "for my", "for the", "building a", "build a", "laying", "lay a", "which", "best", "what") || !asksPrice)) {
    const reply = jobAnswer(job, context);
    if (reply) return reply;
  }

  if (clear) return productAnswer(clear);
  const found = searchProducts(words, context.hiddenSkus, 4);
  if (found.length === 1) return productAnswer(found[0]);
  if (found.length) return productsAnswer(found, asksPrice ? "Several products match — here are their list prices:" : "Here's what matches in our catalogue:");

  const answer = searchFaqs(words)[0];
  if (answer) return { intent: "faq", text: answer.answer, links: [{ label: "All FAQs", href: "/faq" }] };

  if (aboutThis && contextSku) {
    const doc = productDoc(contextSku);
    if (doc) return productAnswer(doc);
  }
  return fallback(words, context);
}

export const rulesEngine: AssistantEngine = { name: "rules", respond: respondWithRules };
