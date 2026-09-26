/**
 * Illustrative sample catalogue for the storefront scaffold — one SKU per
 * category, matching packages/database/prisma/seed.ts and the wireframes.
 * Reconcile every figure against the real pricing engine xlsx before launch.
 */
export type SampleProduct = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  gradingStandard: string | null;
  bulkDensityKgPerM3: number;
  listPricePerTon: number;
  listPricePerM3: number;
  bagPremiumMultiplier: number | null;
  bagWeightKg: number | null;
  listPricePerBag: number | null;
};

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    sku: "AA-SBC-G5-001",
    slug: "g5-natural-gravel",
    name: "G5 Natural Gravel",
    categorySlug: "sub-base-base-course",
    gradingStandard: "SANS 1200-G5",
    bulkDensityKgPerM3: 1600,
    listPricePerTon: 319.0,
    listPricePerM3: 510.4,
    bagPremiumMultiplier: 1.4,
    bagWeightKg: 40,
    listPricePerBag: 17.86,
  },
  {
    sku: "AA-CRS-19MM-DOL",
    slug: "19mm-crushed-stone-dolomite",
    name: "19mm Crushed Stone (Dolomite)",
    categorySlug: "crushed-stone",
    gradingStandard: "SANS 1083",
    bulkDensityKgPerM3: 1450,
    listPricePerTon: 400.0,
    listPricePerM3: 580.0,
    bagPremiumMultiplier: 1.4725,
    bagWeightKg: 20,
    listPricePerBag: 11.78,
  },
  {
    sku: "AA-SND-RIVER-001",
    slug: "river-sand-washed",
    name: "River Sand (Washed)",
    categorySlug: "sand-fine-aggregates",
    gradingStandard: "SANS 1083",
    bulkDensityKgPerM3: 1500,
    listPricePerTon: 270.0,
    listPricePerM3: 405.0,
    bagPremiumMultiplier: 1.35,
    bagWeightKg: 40,
    listPricePerBag: 14.58,
  },
  {
    sku: "AA-CRUN-0-19MM",
    slug: "crusher-run-0-19mm",
    name: "Crusher Run 0–19mm",
    categorySlug: "crusher-run",
    gradingStandard: "COLTO/TRH14",
    bulkDensityKgPerM3: 1550,
    listPricePerTon: 270.0,
    listPricePerM3: 418.5,
    bagPremiumMultiplier: 1.3,
    bagWeightKg: 40,
    listPricePerBag: 14.04,
  },
  {
    sku: "AA-BAL-RAIL-001",
    slug: "rail-ballast",
    name: "Rail Ballast",
    categorySlug: "ballast-rail",
    gradingStandard: "SANS 1200-G14",
    bulkDensityKgPerM3: 1350,
    listPricePerTon: 364.0,
    listPricePerM3: 491.4,
    bagPremiumMultiplier: null,
    bagWeightKg: null,
    listPricePerBag: null,
  },
  {
    sku: "AA-DRN-FRENCH-001",
    slug: "french-drain-stone",
    name: "French Drain Stone",
    categorySlug: "drainage-stone",
    gradingStandard: "SANS 1083",
    bulkDensityKgPerM3: 1400,
    listPricePerTon: 444.0,
    listPricePerM3: 621.6,
    bagPremiumMultiplier: 1.5,
    bagWeightKg: 20,
    listPricePerBag: 13.32,
  },
  {
    sku: "AA-DEC-PEBBLE-001",
    slug: "river-pebble",
    name: "River Pebble",
    categorySlug: "decorative-landscaping",
    gradingStandard: null,
    bulkDensityKgPerM3: 1500,
    listPricePerTon: 560.0,
    listPricePerM3: 840.0,
    bagPremiumMultiplier: 1.6,
    bagWeightKg: 20,
    listPricePerBag: 17.92,
  },
  {
    sku: "AA-AGL-LIME-001",
    slug: "agricultural-lime",
    name: "Agricultural Lime",
    categorySlug: "agricultural-lime",
    gradingStandard: null,
    bulkDensityKgPerM3: 1250,
    listPricePerTon: 284.0,
    listPricePerM3: 355.0,
    bagPremiumMultiplier: 1.35,
    bagWeightKg: 25,
    listPricePerBag: 9.59,
  },
  {
    sku: "AA-REC-RCA-001",
    slug: "recycled-crushed-concrete-rca",
    name: "Recycled Crushed Concrete (RCA)",
    categorySlug: "recycled-aggregates",
    gradingStandard: "COLTO/TRH14",
    bulkDensityKgPerM3: 1400,
    listPricePerTon: 210.0,
    listPricePerM3: 294.0,
    bagPremiumMultiplier: 1.3,
    bagWeightKg: 40,
    listPricePerBag: 10.92,
  },
];
