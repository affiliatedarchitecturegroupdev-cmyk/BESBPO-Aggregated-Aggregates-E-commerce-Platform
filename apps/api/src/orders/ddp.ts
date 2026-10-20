/**
 * Distributed Delivery Premium (docs/delivery-premium.md). An order of 3 or
 * more different products that has to be collected from more than one supply
 * point pays for the extra collections: the standard delivery fee covers the
 * main supply point, and the premium covers the others —
 *
 *   DDP = origin fee (R0 / R200 / R450, +R225 per point beyond 3)
 *       + R150 per ton (or part) of heavy goods from the extra points.
 *
 * Rates are the owner's (Admin → Delivery premium), defaulting to the
 * owner's research (DISTRIBUTED_DELIVERY_PREMIUM, Oct 2026). Pure, so it's
 * unit-tested without a database.
 */
export type DdpPolicy = {
  enabled: boolean;
  /** Different products an order needs before the premium can apply. */
  minProducts: number;
  twoOriginFee: number;
  threeOriginFee: number;
  /** Each supply point beyond three. */
  extraOriginFee: number;
  /** Per ton, or part of a ton, of heavy goods from the extra supply points. */
  heavyPerTon: number;
};

export const DEFAULT_DDP_POLICY: DdpPolicy = { enabled: true, minProducts: 3, twoOriginFee: 200, threeOriginFee: 450, extraOriginFee: 225, heavyPerTon: 150 };

/** Supply-point groups: each category's catalogueGroup — the kind of supplier that stocks it. */
export const ORIGIN_GROUP_LABEL: Record<string, string> = {
  core: "Quarry (aggregates & sand)",
  "b2b-bulk": "Cement & binders",
  masonry: "Brickyard & precast",
  "ready-mix": "Batching plant",
  roofing: "Roofing & timber",
  steel: "Steel merchant",
  supplies: "Building supplies",
};

/** Heavy bulk goods carry the weight charge; light goods (supplies) and ready-mix (the plant's own mixer) don't. */
export const HEAVY_GROUPS = new Set(["core", "b2b-bulk", "masonry", "steel", "roofing"]);

export type DdpLine = { productId: string; categorySlug: string; group: string; tons: number };
/** A verified partner supplier within reach of the site, and the categories it stocks. */
export type DdpSupplier = { id: string; categorySlugs: string[]; distanceKm?: number | null };

export type DdpOrigin = {
  /** "supplier:<id>" for a partner supplier, "group:<group>" for a kind of supplier. */
  key: string;
  /** What comes from it, e.g. "Quarry (aggregates & sand) + Cement & binders" — never a supplier's name. */
  label: string;
  products: number;
  tons: number;
  heavyTons: number;
};

export type DdpTier = "CONSOLIDATED" | "DUAL_ORIGIN" | "DISTRIBUTED";

export type DdpAssessment = {
  applies: boolean;
  fee: number;
  tier: DdpTier;
  products: number;
  origins: DdpOrigin[];
  originFee: number;
  weightFee: number;
  /** Heavy tons from the supply points after the main one (the weight charge's basis). */
  extraHeavyTons: number;
  /** Why it is or isn't charged, in a sentence for the customer. */
  summary: string;
};

const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

/** The origin fee for a number of supply points. */
export function originFee(origins: number, policy: DdpPolicy): number {
  if (origins <= 1) return 0;
  if (origins === 2) return policy.twoOriginFee;
  return policy.threeOriginFee + (origins - 3) * policy.extraOriginFee;
}

/**
 * The fewest supply points that cover the order: partner suppliers within
 * reach that stock several of its categories, else one point per kind of
 * supplier. Greedy (largest cover first) and never more points than the
 * kinds of supplier involved, so a shopper's estimate can only come down.
 */
export function supplyPoints(lines: DdpLine[], suppliers: DdpSupplier[]): { key: string; categories: Set<string> }[] {
  const categories = new Set(lines.map((l) => l.categorySlug));
  const groupOf = new Map(lines.map((l) => [l.categorySlug, l.group]));
  const byGroup = new Map<string, Set<string>>();
  for (const [category, group] of groupOf) byGroup.set(group, (byGroup.get(group) ?? new Set()).add(category));
  const fallback = [...byGroup.entries()].map(([group, cats]) => ({ key: `group:${group}`, categories: cats }));

  const candidates = [
    ...[...suppliers]
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .map((s) => ({ key: `supplier:${s.id}`, categories: new Set(s.categorySlugs.filter((c) => categories.has(c))) }))
      .filter((s) => s.categories.size > 0),
    ...fallback,
  ];
  const uncovered = new Set(categories);
  const chosen: { key: string; categories: Set<string> }[] = [];
  while (uncovered.size > 0) {
    let best: (typeof candidates)[number] | null = null;
    let bestCount = 0;
    for (const c of candidates) {
      const count = [...c.categories].filter((cat) => uncovered.has(cat)).length;
      if (count > bestCount) [best, bestCount] = [c, count];
    }
    if (!best) break;
    const covers = new Set([...best.categories].filter((cat) => uncovered.has(cat)));
    covers.forEach((cat) => uncovered.delete(cat));
    chosen.push({ key: best.key, categories: covers });
  }
  return chosen.length <= fallback.length ? chosen : fallback;
}

export function assessDdp(lines: DdpLine[], suppliers: DdpSupplier[], policy: DdpPolicy = DEFAULT_DDP_POLICY): DdpAssessment {
  const products = new Set(lines.map((l) => l.productId)).size;
  const points = supplyPoints(lines, suppliers);
  const origins: DdpOrigin[] = points
    .map((p) => {
      const own = lines.filter((l) => p.categories.has(l.categorySlug));
      const groups = [...new Set(own.map((l) => l.group))];
      return {
        key: p.key,
        label: groups.map((g) => ORIGIN_GROUP_LABEL[g] ?? g).join(" + "),
        products: new Set(own.map((l) => l.productId)).size,
        tons: round(own.reduce((t, l) => t + l.tons, 0), 3),
        heavyTons: round(own.filter((l) => HEAVY_GROUPS.has(l.group)).reduce((t, l) => t + l.tons, 0), 3),
      };
    })
    // The main supply point — covered by the standard delivery fee — is the heaviest.
    .sort((a, b) => b.tons - a.tons || b.products - a.products);

  const count = origins.length;
  const tier: DdpTier = count <= 1 ? "CONSOLIDATED" : count === 2 ? "DUAL_ORIGIN" : "DISTRIBUTED";
  const extraHeavyTons = round(origins.slice(1).reduce((t, o) => t + o.heavyTons, 0), 3);
  const base = { tier, products, origins, extraHeavyTons };

  if (!policy.enabled) return { ...base, applies: false, fee: 0, originFee: 0, weightFee: 0, summary: "No distributed delivery premium applies." };
  if (products < policy.minProducts || count <= 1) {
    const summary =
      count <= 1 ? "Everything comes from one supply point, so the standard delivery covers it." : `The premium only applies from ${policy.minProducts} different products.`;
    return { ...base, applies: false, fee: 0, originFee: 0, weightFee: 0, summary };
  }
  const fee0 = originFee(count, policy);
  const weightFee = extraHeavyTons > 0 ? Math.ceil(extraHeavyTons - 1e-9) * policy.heavyPerTon : 0;
  return {
    ...base,
    applies: true,
    fee: round(fee0 + weightFee),
    originFee: fee0,
    weightFee,
    summary: `Your order is collected from ${count} supply points. The delivery fee covers the main one; this covers the other ${count - 1}${
      weightFee > 0 ? `, including ${Math.ceil(extraHeavyTons - 1e-9)} ton${Math.ceil(extraHeavyTons - 1e-9) === 1 ? "" : "s"} of heavy goods` : ""
    }.`,
  };
}

/** Keeps admin edits sensible: whole rands, nothing negative, at least 2 products. */
export function normaliseDdpPolicy(input: Partial<DdpPolicy> | null | undefined): DdpPolicy {
  const p = { ...DEFAULT_DDP_POLICY, ...(input ?? {}) };
  const money = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.min(round(Number(v)), 100_000) : d);
  return {
    enabled: Boolean(p.enabled),
    minProducts: Number.isInteger(Number(p.minProducts)) ? Math.min(Math.max(Number(p.minProducts), 2), 50) : DEFAULT_DDP_POLICY.minProducts,
    twoOriginFee: money(p.twoOriginFee, DEFAULT_DDP_POLICY.twoOriginFee),
    threeOriginFee: money(p.threeOriginFee, DEFAULT_DDP_POLICY.threeOriginFee),
    extraOriginFee: money(p.extraOriginFee, DEFAULT_DDP_POLICY.extraOriginFee),
    heavyPerTon: money(p.heavyPerTon, DEFAULT_DDP_POLICY.heavyPerTon),
  };
}
