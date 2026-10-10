/**
 * The site's calculators in one list (CALCULATORS.md), for the homepage
 * strip and the /calculators page. Each one lives where its material is
 * sold; these entries only describe what it works out and link to it.
 */
export type CalculatorIcon = "tonnage" | "readyMix" | "wall" | "paving" | "drain" | "steel" | "estimator";

export type CalculatorLink = {
  key: string;
  name: string;
  /** What you put in and what you get out, in one line. */
  works: string;
  /** Longer note for the /calculators page. */
  detail: string;
  href: string;
  cta: string;
  icon: CalculatorIcon;
  /** Product page the calculator sits on — dropped if staff hide that product. */
  sku?: string;
};

export const CALCULATORS: CalculatorLink[] = [
  {
    key: "tonnage",
    name: "Tonnage & volume",
    works: "Tons ↔ m³ for any sand, stone or gravel, with a delivered estimate",
    detail:
      "Converts between tons and cubic metres using each material's own bulk density, switches to bags where a material is bagged, and adds a delivery estimate for your distance. On every aggregate product page.",
    href: "/products/river-sand-washed#calculator",
    cta: "Open on river sand",
    icon: "tonnage",
    sku: "AA-SND-01",
  },
  {
    key: "ready-mix",
    name: "Ready-mix concrete",
    works: "m³ of concrete priced by grade, never below a full truck",
    detail:
      "Prices the cubic metres at your tier, rounds up to the plant's minimum mixer-truck load and shows pump hire separately. On every ready-mix grade's page.",
    href: "/products/ready-mix-concrete-25mpa#calculator",
    cta: "Open on 25 MPa",
    icon: "readyMix",
    sku: "AA-RMX-25MPA-001",
  },
  {
    key: "wall",
    name: "Bricks & blocks",
    works: "Wall size less openings to the bricks or blocks to order",
    detail:
      "Length × height less doors and windows, one or two leaves, with 10 mm joints and 5% for breakage — bricks rounded up to the next thousand. Your builder's take-off and the drawings govern.",
    href: "/bricks-blocks#wall-calculator",
    cta: "Size a wall",
    icon: "wall",
  },
  {
    key: "paving",
    name: "Paving",
    works: "Area to pavers, slabs or grass blocks, with 5% for cuts",
    detail: "Length × width to the number of pavers, slabs or grass blocks for the area, with 5% for cuts and breakage. Kerbs and edge cuts are extra.",
    href: "/paving#paving-calculator",
    cta: "Size the paving",
    icon: "paving",
  },
  {
    key: "french-drain",
    name: "French drain",
    works: "Trench size to stone, perforated pipe and geotextile",
    detail: "From the trench length, width and depth: tonnes of drainage stone, 6 m lengths of perforated pipe and rolls of geotextile to wrap it.",
    href: "/drainage#french-drain-calculator",
    cta: "Size a drain",
    icon: "drain",
  },
  {
    key: "steel",
    name: "Rebar mass",
    works: "Bars × length to kilograms, tonnes and 6 m stock lengths",
    detail: "Uses the SANS 920 nominal mass per metre for each bar size. No allowance for laps or offcuts — the engineer's bar schedule governs.",
    href: "/reinforcing-steel#bar-mass-calculator",
    cta: "Work out the steel",
    icon: "steel",
  },
  {
    key: "estimator",
    name: "Project estimator",
    works: "Driveways, slabs, drains and platforms to volume, tonnes and truck loads",
    detail:
      "Pick the job and its size for the volume, an approximate weight and the number of tipper loads, with the job pack that covers it — then send the sizing with one quote request.",
    href: "/estimator",
    cta: "Estimate a job",
    icon: "estimator",
  },
];

export function availableCalculators(hiddenSkus: string[] = []) {
  return CALCULATORS.filter((c) => !c.sku || !hiddenSkus.includes(c.sku));
}
