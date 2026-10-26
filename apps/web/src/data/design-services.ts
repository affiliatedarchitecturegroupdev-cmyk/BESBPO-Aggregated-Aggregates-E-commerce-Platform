/**
 * Bellwether Architecture & Engineering (BAE) — the group's in-house design
 * practice — offered through the store (DESIGN_SERVICES.md). Most work is
 * quoted per project after a brief; a few well-defined jobs have a fixed fee,
 * and the rest carry an indicative rate (per m² or a share of the building
 * cost) so customers can budget before they send a brief. Every fee is
 * confirmed on BAE's written proposal and terms of engagement; council
 * submission fees, NHBRC enrolment and specialist reports are paid at cost.
 *
 * Rates were derived from published South African benchmarks (see
 * DESIGN_SERVICES.md, "Where the rates come from"); approved by the owner on
 * 11 October 2026. Fees exclude VAT; "excl. VAT" is shown only once the business is VAT-registered (docs/vat.md).
 */
export type Discipline = "architectural" | "structural" | "civil" | "compliance" | "quantities";

export type DesignFee =
  /** One price for a defined scope. */
  | { kind: "fixed"; amount: number; scope: string }
  /** Rand per m² of floor area, with a minimum fee. */
  | { kind: "perM2"; rate: number; minimum: number }
  /** A share of the estimated cost of the building work, as a range. */
  | { kind: "percent"; low: number; high: number; minimum?: number }
  /** Priced from the brief. */
  | { kind: "quote" };

export type DesignService = {
  slug: string;
  name: string;
  discipline: Discipline;
  summary: string;
  /** What the customer gets. */
  deliverables: string[];
  /** Who it's for / when it's needed. */
  whenNeeded: string[];
  fee: DesignFee;
  /** What the fee leaves out. */
  excludes?: string;
  /** Store links that follow on from the design. */
  related?: { label: string; href: string }[];
};

export const DISCIPLINES: Record<Discipline, { name: string; blurb: string }> = {
  architectural: { name: "Architectural", blurb: "Plans, council submissions and full design-and-site services for houses, additions and commercial buildings." },
  structural: { name: "Structural engineering", blurb: "Foundations, slabs, frames, roofs and retaining walls designed, inspected and signed off." },
  civil: { name: "Civil engineering", blurb: "Stormwater, drainage, paving and access roads for sites and developments." },
  compliance: { name: "Compliance", blurb: "Energy, approvals and the paperwork that gets a building signed off." },
  quantities: { name: "Quantities", blurb: "Bills of quantities and schedules that turn drawings into an order." },
};

export const DESIGN_SERVICES: DesignService[] = [
  {
    slug: "house-plans",
    name: "House plans & council submission",
    discipline: "architectural",
    summary: "Concept to council-ready drawings for a new house: site plan, floor plans, elevations, sections and the SANS 10400 notes, submitted to your municipality.",
    deliverables: ["Concept sketches and one round of changes", "Council drawings: site plan, floor plans, elevations, sections", "SANS 10400 compliance notes and schedules", "Submission to the municipality and replies to council comments"],
    whenNeeded: ["Building a new house", "Any new building that needs council approval"],
    fee: { kind: "perM2", rate: 120, minimum: 18000 },
    excludes: "Municipal plan fees, the engineer's design, energy (XA) calculations and surveys are separate.",
    related: [{ label: "Estimate the building cost", href: "/design#fee-estimator" }],
  },
  {
    slug: "additions-alterations",
    name: "Additions & alterations",
    discipline: "architectural",
    summary: "Drawings for an extension, second storey, garage, granny flat or internal changes, showing the existing building and the new work, submitted to council.",
    deliverables: ["Measured survey of the existing building", "Council drawings of existing and new work", "Submission to the municipality"],
    whenNeeded: ["Extending or converting a house", "A new garage, carport, flatlet or boundary wall that needs approval"],
    fee: { kind: "perM2", rate: 120, minimum: 12000 },
    excludes: "Priced on the new floor area. Municipal plan fees and any engineer's design are separate.",
  },
  {
    slug: "full-architectural-service",
    name: "Full architectural service",
    discipline: "architectural",
    summary: "BAE runs the design from brief to completion: design development, council approval, construction drawings, tender documents and site inspections through the build.",
    deliverables: ["Brief, concept and design development", "Council approval", "Construction and detail drawings, specifications", "Tender documents and contractor appointment", "Site inspections and the completion certificate"],
    whenNeeded: ["Custom homes and larger buildings", "Owners who want one practice to manage design and quality on site"],
    fee: { kind: "percent", low: 5, high: 7 },
    excludes: "Engineers, quantity surveying and municipal fees are added only where BAE is appointed for them.",
  },
  {
    slug: "measured-as-built-drawings",
    name: "Measured as-built drawings",
    discipline: "architectural",
    summary: "BAE measures the building as it stands and draws it — the starting point for alterations, a sale, a valuation or plans you've lost.",
    deliverables: ["Site visit and measurement", "Floor plans, elevations and a site plan as built", "PDF and CAD files"],
    whenNeeded: ["No plans for a property you own or are buying", "Before designing alterations"],
    fee: { kind: "fixed", amount: 6500, scope: "One house up to 250 m² in a metro; larger buildings and outlying sites are quoted" },
  },
  {
    slug: "plan-regularisation",
    name: "Plan regularisation",
    discipline: "architectural",
    summary: "Get unapproved work approved: BAE measures what was built, draws it to council standard and submits it as a rider or a regularisation application.",
    deliverables: ["Measured survey of the unapproved work", "Council drawings and the application", "Engineer's assessment where the structure needs one (quoted)"],
    whenNeeded: ["Selling a property with unapproved additions", "A council notice about unapproved building work"],
    fee: { kind: "fixed", amount: 18500, scope: "One house with additions up to 250 m² in total" },
    excludes: "Municipal fees and any penalties council charges for building without approval are paid at cost.",
  },
  {
    slug: "structural-design",
    name: "Structural design",
    discipline: "structural",
    summary: "Foundations, slabs, beams, columns and roof structures designed for your drawings, with the calculations and engineer's drawings council asks for.",
    deliverables: ["Structural calculations", "Foundation, slab and reinforcement drawings", "Rational design (A19 / B1 forms as the municipality requires)"],
    whenNeeded: ["Double storeys, suspended slabs and long spans", "Anything outside the deemed-to-satisfy rules of SANS 10400"],
    fee: { kind: "percent", low: 1.5, high: 2, minimum: 12000 },
    related: [
      { label: "Reinforcing steel", href: "/reinforcing-steel" },
      { label: "Cut & bend", href: "/reinforcing-steel/cut-and-bend" },
    ],
  },
  {
    slug: "foundation-inspections",
    name: "Foundation inspections & completion certificate",
    discipline: "structural",
    summary: "An engineer inspects the excavations and the steel before each pour and signs the completion certificate the municipality asks for at the end.",
    deliverables: ["Foundation trench inspection", "Pre-pour reinforcement inspection", "Engineer's completion certificate"],
    whenNeeded: ["A new single house", "Council's occupation certificate"],
    fee: { kind: "fixed", amount: 7500, scope: "Three site visits on one single-storey house in a metro" },
    related: [
      { label: "Foundations stage", href: "/shop-by-stage?stage=FOUNDATIONS" },
      { label: "Ready-mix concrete", href: "/ready-mix" },
    ],
  },
  {
    slug: "structural-assessment",
    name: "Crack & structural assessment",
    discipline: "structural",
    summary: "An engineer inspects cracks, sagging or damp, finds the cause and writes up the repair — for owners, buyers and insurers.",
    deliverables: ["Site inspection", "Written report with the cause and the repair"],
    whenNeeded: ["Cracks in walls or floors", "Before buying a property", "An insurance claim"],
    fee: { kind: "fixed", amount: 6500, scope: "One house in a metro; repair designs are quoted" },
  },
  {
    slug: "retaining-wall-design",
    name: "Retaining wall design",
    discipline: "structural",
    summary: "Design and drawings for a retaining wall — concrete block, gabion or reinforced concrete — with the engineer's sign-off.",
    deliverables: ["Design calculations", "Drawings and a specification", "Inspection and sign-off on completion"],
    whenNeeded: ["A wall retaining more than about 1 m of soil", "Terracing a sloping site"],
    fee: { kind: "fixed", amount: 8500, scope: "One wall up to 1.5 m high on a residential site; higher walls are quoted" },
    related: [
      { label: "Retaining blocks & gabions", href: "/products?category=retaining-erosion-control" },
    ],
  },
  {
    slug: "steel-structure-design",
    name: "Steel & roof structure design",
    discipline: "structural",
    summary: "Steel portal frames, carports, mezzanines and roof structures designed and detailed for fabrication.",
    deliverables: ["Calculations and general arrangement drawings", "Fabrication details and connection design"],
    whenNeeded: ["Warehouses, workshops, carports and canopies", "Steel roofs over long spans"],
    fee: { kind: "quote" },
    related: [
      { label: "Complete roofs — designed, made and installed", href: "/services/complete-roofs" },
      { label: "Roofing", href: "/roofing" },
    ],
  },
  {
    slug: "stormwater-drainage-design",
    name: "Stormwater & drainage design",
    discipline: "civil",
    summary: "A stormwater plan for the site: levels, falls, channels, pipes, soakaways and attenuation, to council's requirements.",
    deliverables: ["Stormwater management plan and calculations", "Layout and long-section drawings"],
    whenNeeded: ["New developments and large paved areas", "Sites that flood or pond"],
    fee: { kind: "quote" },
    related: [{ label: "Drainage products", href: "/drainage" }],
  },
  {
    slug: "roads-paving-design",
    name: "Roads, parking & paving design",
    discipline: "civil",
    summary: "Layerworks, levels and layouts for access roads, driveways and parking — designed for the traffic they'll carry.",
    deliverables: ["Pavement (layerworks) design", "Layout, levels and kerb drawings"],
    whenNeeded: ["Estate roads and access roads", "Commercial parking and yards"],
    fee: { kind: "quote" },
    related: [
      { label: "Paving", href: "/paving" },
      { label: "Road-building aggregates", href: "/products?category=crusher-run-road-building" },
    ],
  },
  {
    slug: "energy-xa-design",
    name: "Energy (SANS 10400-XA) design",
    discipline: "compliance",
    summary: "The energy-efficiency calculations and specification council needs for a new building or extension — glazing, insulation and hot water.",
    deliverables: ["Rational XA calculation or deemed-to-satisfy schedule", "Insulation and glazing specification"],
    whenNeeded: ["Every new building and extension that heats or cools a space"],
    fee: { kind: "quote" },
    related: [{ label: "Ceiling insulation", href: "/products?category=roof-insulation-rainwater" }],
  },
  {
    slug: "bill-of-quantities",
    name: "Bill of quantities",
    discipline: "quantities",
    summary: "A measured bill of every material and trade from your drawings — and the materials loaded as a project list on this store, ready to price and order stage by stage.",
    deliverables: ["Measured bill of quantities", "Materials as a project list in your account, by build stage"],
    whenNeeded: ["Pricing a build before you commit", "Comparing builders' quotes like for like"],
    fee: { kind: "percent", low: 1, high: 1.5, minimum: 8500 },
    related: [
      { label: "Project lists", href: "/account/projects" },
      { label: "Shop by build stage", href: "/shop-by-stage" },
    ],
  },
  {
    slug: "bar-bending-schedule",
    name: "Bar bending schedule",
    discipline: "quantities",
    summary: "The bar schedule from the engineer's drawings — which goes straight to cut & bend on this store.",
    deliverables: ["Bar bending schedule to SANS 282", "Mass by bar size"],
    whenNeeded: ["Ordering cut and bent reinforcement"],
    fee: { kind: "quote" },
    related: [{ label: "Cut & bend", href: "/reinforcing-steel/cut-and-bend" }],
  },
];

export function findDesignService(slug: string) {
  return DESIGN_SERVICES.find((s) => s.slug === slug);
}

const zar = (n: number) => `R${Math.round(n).toLocaleString("en-US")}`;

/**
 * One line describing a fee: "R6,500 fixed", "R120/m², minimum R18,000", "1.5–2% of building cost", "Quoted per
 * project" — with ", excl. VAT" once the business is VAT-registered (docs/vat.md).
 */
export function feeLabel(fee: DesignFee, vatRegistered = false): string {
  const vat = vatRegistered ? ", excl. VAT" : "";
  switch (fee.kind) {
    case "fixed":
      return `${zar(fee.amount)} fixed${vat}`;
    case "perM2":
      return `${zar(fee.rate)}/m², minimum ${zar(fee.minimum)}${vat}`;
    case "percent":
      return `${fee.low}–${fee.high}% of building cost${fee.minimum ? `, minimum ${zar(fee.minimum)}` : ""}${vat}`;
    default:
      return "Quoted per project";
  }
}

/** A fee as a range for a building of the given area and cost, or null where it's quoted. */
export function feeFor(fee: DesignFee, areaM2: number, buildCost: number): { low: number; high: number } | null {
  switch (fee.kind) {
    case "fixed":
      return { low: fee.amount, high: fee.amount };
    case "perM2": {
      const v = Math.max(fee.minimum, fee.rate * areaM2);
      return { low: v, high: v };
    }
    case "percent":
      return { low: Math.max(fee.minimum ?? 0, (buildCost * fee.low) / 100), high: Math.max(fee.minimum ?? 0, (buildCost * fee.high) / 100) };
    default:
      return null;
  }
}

/**
 * Building cost per m² for the estimator — a starting point the customer
 * can change. Mid-range figures from 2026 South African cost guides
 * (DESIGN_SERVICES.md); finishes, site and region move them a lot.
 */
export const BUILD_COST_PER_M2 = {
  economy: { label: "Economy", rate: 9500 },
  standard: { label: "Standard", rate: 14000 },
  highSpec: { label: "High spec", rate: 20000 },
} as const;

/**
 * NHBRC home enrolment fee — statutory, set by the Rules regarding NHBRC
 * Fees (GN R.1407, rule 2) under the Housing Consumers Protection Measures
 * Act, on the selling price or contract value: 1.3% of the first R500 000,
 * 1% from R500 000 to R1m, 0.75% from R1m to R2m and 0.5% from R2m to R5m;
 * nothing more above R5m. Excludes VAT. The NHBRC confirms the amount at
 * enrolment, which the home builder does before building starts.
 */
export const NHBRC_BANDS: [upTo: number, rate: number][] = [
  [500_000, 0.013],
  [1_000_000, 0.01],
  [2_000_000, 0.0075],
  [5_000_000, 0.005],
];

export function nhbrcEnrolmentFee(value: number): number {
  let fee = 0;
  let from = 0;
  for (const [upTo, rate] of NHBRC_BANDS) {
    if (value <= from) break;
    fee += (Math.min(value, upTo) - from) * rate;
    from = upTo;
  }
  return Math.round(fee * 100) / 100;
}
