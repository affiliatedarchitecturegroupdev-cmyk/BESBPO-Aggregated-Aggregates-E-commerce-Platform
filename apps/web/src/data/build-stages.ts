/**
 * Shop by Build Stage (BUILD_STAGES.md): for each stage of a build, the
 * materials that go into it — one pick per job ("Concrete stone", "Main
 * bars"), the categories to browse, and the hire and services the stage
 * needs. Stages are the same as on project lists, so a stage saves straight
 * to a project. New categories (bricks, paving, pipes…) slot in by adding
 * their slug and picks here.
 */
import { CATEGORIES } from "@/data/categories";
import { PLANT, SERVICES } from "@/data/plant-services";
import { findQuotable } from "@/data/quotable";
import { STAGES, type BuildStage } from "@/lib/project-lists";

type Pick = { sku: string; role: string; unit?: string };
type Link = { label: string; href: string };

type StageShop = {
  stage: Exclude<BuildStage, "OTHER">;
  intro: string;
  picks: Pick[];
  categories: string[];
  /** Plant and service SKUs from the hire catalogue. */
  hire: string[];
  tools: Link[];
};

const SHOP: StageShop[] = [
  {
    stage: "SITE_PREP",
    intro: "Bulk earthworks first: fill to level the site, then compacted layers to build on — and a pioneer layer where the ground is soft.",
    picks: [
      { sku: "AA-SBC-10", role: "Selected fill & subgrade" },
      { sku: "AA-SBC-07", role: "Sub-base layer" },
      { sku: "AA-SBC-05", role: "Selected layer" },
      { sku: "AA-CRS-11", role: "Pioneer layer on soft ground" },
      { sku: "AA-REC-01", role: "Recycled fill" },
      { sku: "AA-SND-04", role: "Filling sand" },
    ],
    categories: ["sub-base-base-course", "recycled-sustainable", "crusher-run-road-building"],
    hire: ["AA-SVC-CLEAR", "AA-PLT-TLB-4X4", "AA-PLT-ROL-PAD", "AA-PLT-WATER-TRUCK", "AA-SVC-SKIP-6M3"],
    tools: [{ label: "Project estimator", href: "/estimator" }],
  },
  {
    stage: "FOUNDATIONS",
    intro: "Footings, rafts and ground beams: concrete mixed on site or delivered ready-mixed, with the steel cut, tied and kept at cover.",
    picks: [
      { sku: "AA-RMX-25MPA-001", role: "Ready-mix for footings" },
      { sku: "AA-CRS-04", role: "Concrete stone" },
      { sku: "AA-SND-05", role: "Concrete sand" },
      { sku: "AA-CEM-AFS-ALLPURPOSE-425N", role: "Cement for concrete", unit: "BAG_50KG" },
      { sku: "AA-STL-Y12", role: "Main bars", unit: "LENGTH_6M" },
      { sku: "AA-STL-ACC-TIE-WIRE", role: "Tie wire" },
    ],
    categories: ["ready-mix-concrete", "crushed-stone", "cement-hydraulic-binders", "reinforcing-bar", "steel-fixing-accessories"],
    hire: ["AA-PLT-EXC-3T", "AA-PLT-TLB-4X4", "AA-SVC-STEEL-FIX", "AA-SVC-RUBBLE-6M3"],
    tools: [
      { label: "Bar mass calculator", href: "/reinforcing-steel" },
      { label: "Send a bar bending schedule", href: "/reinforcing-steel/cut-and-bend" },
    ],
  },
  {
    stage: "SLABS",
    intro: "Surface beds and suspended slabs: compacted fill, mesh held at cover on chairs, the concrete itself, and a screed to finish.",
    picks: [
      { sku: "AA-RMX-25MPA-001", role: "Surface beds" },
      { sku: "AA-RMX-30MPA-001", role: "Suspended slabs" },
      { sku: "AA-STL-MESH-193", role: "Slab mesh", unit: "SHEET" },
      { sku: "AA-STL-ACC-BAR-CHAIRS", role: "Chairs & spacers" },
      { sku: "AA-SND-06", role: "Screed sand" },
      { sku: "AA-ADM-PLAST-001", role: "Plasticiser" },
    ],
    categories: ["ready-mix-concrete", "mesh-brickforce", "steel-fixing-accessories", "mortars-grouts-admixtures"],
    hire: ["AA-PLT-ROL-1-3T", "AA-SVC-STEEL-FIX", "AA-PLT-SITE-DUMPER"],
    tools: [{ label: "Ready-mix volume calculator", href: "/products/ready-mix-concrete-25mpa" }],
  },
  {
    stage: "WALLS",
    intro: "Brickwork and plaster: mortar and plaster sand, cement and lime, brickforce in the bed joints and ties to hold it together.",
    picks: [
      { sku: "AA-SND-03", role: "Mortar sand" },
      { sku: "AA-SND-02", role: "Plaster sand" },
      { sku: "AA-CEM-AFS-STARBUILD-325N", role: "Mortar & plaster cement", unit: "BAG_50KG" },
      { sku: "AA-AGR-03", role: "Hydrated lime for mortar" },
      { sku: "AA-STL-BRICKFORCE-150", role: "Brickforce" },
      { sku: "AA-STL-ACC-WALL-TIES", role: "Wall ties" },
    ],
    categories: ["sand-fine-aggregates", "cement-hydraulic-binders", "mesh-brickforce", "structural-steel"],
    hire: ["AA-PLT-SITE-DUMPER", "AA-SVC-SKIP-6M3"],
    tools: [{ label: "Project estimator", href: "/estimator" }],
  },
  {
    stage: "PAVING_ROADS",
    intro: "Driveways, yards and roads: a compacted sub-base and base course, a bedding layer, and cement where the base is stabilised.",
    picks: [
      { sku: "AA-SBC-07", role: "Sub-base" },
      { sku: "AA-CRR-01", role: "Base course" },
      { sku: "AA-SBC-05", role: "Base for light traffic" },
      { sku: "AA-SND-01", role: "Bedding sand" },
      { sku: "AA-REC-03", role: "Recycled surfacing (RAP)" },
      { sku: "AA-CEM-AFS-ROADSTAB-325N", role: "Stabilising cement", unit: "BAG_50KG" },
    ],
    categories: ["crusher-run-road-building", "sub-base-base-course", "recycled-sustainable"],
    hire: ["AA-PLT-ROL-8-12T", "AA-PLT-WATER-TRUCK", "AA-PLT-TIP-10M3", "AA-SVC-HAUL-10M3"],
    tools: [{ label: "Project estimator", href: "/estimator" }],
  },
  {
    stage: "DRAINAGE",
    intro: "French drains, subsoil drains and pipe trenches: clean single-size stone around the pipe, bedding sand under it, rock where water leaves the site.",
    picks: [
      { sku: "AA-DRN-01", role: "French drain stone" },
      { sku: "AA-DRN-05", role: "Washed filter stone" },
      { sku: "AA-DRN-04", role: "Subsoil drainage stone" },
      { sku: "AA-SND-08", role: "Pipe bedding sand" },
      { sku: "AA-DRN-03", role: "Weeping-tile bedding" },
      { sku: "AA-CRR-03", role: "Outlet protection (rip rap)" },
    ],
    categories: ["drainage-filter", "sand-fine-aggregates", "crusher-run-road-building"],
    hire: ["AA-PLT-EXC-1-7T", "AA-PLT-TLB-4X4", "AA-SVC-RUBBLE-6M3"],
    tools: [{ label: "Project estimator", href: "/estimator" }],
  },
  {
    stage: "LANDSCAPING",
    intro: "The finish: decorative stone for beds and paths, stone mulch to hold moisture, and lime for the soil — bulk or by the bag.",
    picks: [
      { sku: "AA-DEC-01", role: "River pebble" },
      { sku: "AA-DEC-03", role: "Pea gravel paths" },
      { sku: "AA-DEC-02", role: "Decorative chips" },
      { sku: "AA-DEC-04", role: "Stone mulch" },
      { sku: "AA-CRS-10", role: "Path base (crusher dust)" },
      { sku: "AA-AGR-01", role: "Garden lime" },
    ],
    categories: ["decorative-landscaping", "agricultural-industrial", "crushed-stone"],
    hire: ["AA-PLT-SKID-STEER", "AA-PLT-SITE-DUMPER", "AA-SVC-SKIP-6M3"],
    tools: [{ label: "Project estimator", href: "/estimator" }],
  },
];

export type StagePickView = { sku: string; role: string; name: string; slug: string; categorySlug: string; unit: string; price: number | null; unitLabel: string };
export type StageView = {
  stage: BuildStage;
  label: string;
  hint: string;
  intro: string;
  picks: StagePickView[];
  categories: Link[];
  hire: Link[];
  tools: Link[];
};

/** The stages with everything resolved against the catalogue — plain data, so a client component can render it. */
export function buildStageShop(hiddenSkus: string[] = []): StageView[] {
  return SHOP.map((s) => {
    const meta = STAGES.find((x) => x.value === s.stage)!;
    const picks = s.picks.flatMap((pick) => {
      const product = findQuotable(pick.sku);
      if (!product || hiddenSkus.includes(pick.sku)) return [];
      const unit = product.units.find((u) => u.code === pick.unit) ?? product.units.find((u) => u.retailPrice !== null) ?? product.units[0];
      return [{ sku: product.sku, role: pick.role, name: product.name, slug: product.slug, categorySlug: product.categorySlug, unit: unit.code, price: unit.retailPrice, unitLabel: unit.label.replace(/\s*\(.*\)$/, "") }];
    });
    const hire = s.hire.flatMap((sku) => {
      const plant = PLANT.find((p) => p.sku === sku);
      if (plant) return [{ label: plant.name, href: `/plant-hire/${plant.slug}` }];
      const service = SERVICES.find((x) => x.sku === sku);
      return service ? [{ label: service.name, href: `/services/${service.slug}` }] : [];
    });
    const categories = s.categories.flatMap((slug) => {
      const c = CATEGORIES.find((x) => x.slug === slug);
      return c ? [{ label: c.name, href: `/products?category=${slug}` }] : [];
    });
    return { stage: s.stage, label: meta.label, hint: meta.hint, intro: s.intro, picks, categories, hire, tools: s.tools };
  });
}
