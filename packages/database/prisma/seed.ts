/**
 * Seed data for local development and demos.
 *
 * IMPORTANT: pricing figures here are ILLUSTRATIVE — drawn from the sample
 * SKUs shown in the platform spec's wireframes (the 19mm Crushed Stone
 * Dolomite figures match the product-detail wireframe exactly: R400/ton,
 * R580/m³, R11.78/20kg bag). Reconcile every figure against the real
 * Aggregated Aggregates pricing engine xlsx before this reaches a customer —
 * see AGENTIC_RULES.md, rule 1.
 */
import { PrismaClient, CustomerTierName, DeliveryBandLabel, LoadSize } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "sub-base-base-course", name: "Sub-Base & Base Course", sortOrder: 1 },
  { slug: "crushed-stone", name: "Crushed Stone", sortOrder: 2 },
  { slug: "sand-fine-aggregates", name: "Sand & Fine Aggregates", sortOrder: 3 },
  { slug: "crusher-run", name: "Crusher Run", sortOrder: 4 },
  { slug: "ballast-rail", name: "Ballast & Rail", sortOrder: 5 },
  { slug: "drainage-stone", name: "Drainage Stone", sortOrder: 6 },
  { slug: "decorative-landscaping", name: "Decorative & Landscaping", sortOrder: 7 },
  { slug: "agricultural-lime", name: "Agricultural Lime", sortOrder: 8 },
  { slug: "recycled-aggregates", name: "Recycled Aggregates", sortOrder: 9 },
] as const;

// One representative SKU per category — matches the 9-tile category-listing
// wireframe. bulkDensityKgPerM3 drives the ton<->m3 calculator; list prices
// are derived as: listPricePerM3 = listPricePerTon * (density / 1000);
// listPricePerBag = (listPricePerTon / 1000 * bagWeightKg) * bagPremiumMultiplier.
const PRODUCTS = [
  {
    sku: "AA-SBC-G5-001",
    slug: "g5-natural-gravel",
    name: "G5 Natural Gravel",
    category: "sub-base-base-course",
    gradingStandard: "SANS 1200-G5",
    bulkDensityKgPerM3: 1600,
    baseCostPerTon: 220,
    markupPercent: 45,
    listPricePerTon: 319,
    listPricePerM3: 510.4,
    bagPremiumMultiplier: 1.4,
    bagWeightKg: 40,
    listPricePerBag: 17.86,
  },
  {
    sku: "AA-CRS-19MM-DOL",
    slug: "19mm-crushed-stone-dolomite",
    name: "19mm Crushed Stone (Dolomite)",
    category: "crushed-stone",
    gradingStandard: "SANS 1083",
    bulkDensityKgPerM3: 1450,
    baseCostPerTon: 276,
    markupPercent: 45,
    listPricePerTon: 400,
    listPricePerM3: 580,
    bagPremiumMultiplier: 1.4725,
    bagWeightKg: 20,
    listPricePerBag: 11.78,
  },
  {
    sku: "AA-SND-RIVER-001",
    slug: "river-sand-washed",
    name: "River Sand (Washed)",
    category: "sand-fine-aggregates",
    gradingStandard: "SANS 1083",
    bulkDensityKgPerM3: 1500,
    baseCostPerTon: 180,
    markupPercent: 50,
    listPricePerTon: 270,
    listPricePerM3: 405,
    bagPremiumMultiplier: 1.35,
    bagWeightKg: 40,
    listPricePerBag: 14.58,
  },
  {
    sku: "AA-CRUN-0-19MM",
    slug: "crusher-run-0-19mm",
    name: "Crusher Run 0–19mm",
    category: "crusher-run",
    gradingStandard: "COLTO/TRH14",
    bulkDensityKgPerM3: 1550,
    baseCostPerTon: 190,
    markupPercent: 42,
    listPricePerTon: 270,
    listPricePerM3: 418.5,
    bagPremiumMultiplier: 1.3,
    bagWeightKg: 40,
    listPricePerBag: 14.04,
  },
  {
    sku: "AA-BAL-RAIL-001",
    slug: "rail-ballast",
    name: "Rail Ballast",
    category: "ballast-rail",
    gradingStandard: "SANS 1200-G14",
    bulkDensityKgPerM3: 1350,
    baseCostPerTon: 260,
    markupPercent: 40,
    listPricePerTon: 364,
    listPricePerM3: 491.4,
    bagPremiumMultiplier: null,
    bagWeightKg: null,
    listPricePerBag: null,
  },
  {
    sku: "AA-DRN-FRENCH-001",
    slug: "french-drain-stone",
    name: "French Drain Stone",
    category: "drainage-stone",
    gradingStandard: "SANS 1083",
    bulkDensityKgPerM3: 1400,
    baseCostPerTon: 300,
    markupPercent: 48,
    listPricePerTon: 444,
    listPricePerM3: 621.6,
    bagPremiumMultiplier: 1.5,
    bagWeightKg: 20,
    listPricePerBag: 13.32,
  },
  {
    sku: "AA-DEC-PEBBLE-001",
    slug: "river-pebble",
    name: "River Pebble",
    category: "decorative-landscaping",
    gradingStandard: null,
    bulkDensityKgPerM3: 1500,
    baseCostPerTon: 350,
    markupPercent: 60,
    listPricePerTon: 560,
    listPricePerM3: 840,
    bagPremiumMultiplier: 1.6,
    bagWeightKg: 20,
    listPricePerBag: 17.92,
  },
  {
    sku: "AA-AGL-LIME-001",
    slug: "agricultural-lime",
    name: "Agricultural Lime",
    category: "agricultural-lime",
    gradingStandard: null,
    bulkDensityKgPerM3: 1250,
    baseCostPerTon: 210,
    markupPercent: 35,
    listPricePerTon: 284,
    listPricePerM3: 355,
    bagPremiumMultiplier: 1.35,
    bagWeightKg: 25,
    listPricePerBag: 9.59,
  },
  {
    sku: "AA-REC-RCA-001",
    slug: "recycled-crushed-concrete-rca",
    name: "Recycled Crushed Concrete (RCA)",
    category: "recycled-aggregates",
    gradingStandard: "COLTO/TRH14",
    bulkDensityKgPerM3: 1400,
    baseCostPerTon: 150,
    markupPercent: 40,
    listPricePerTon: 210,
    listPricePerM3: 294,
    bagPremiumMultiplier: 1.3,
    bagWeightKg: 40,
    listPricePerBag: 10.92,
  },
];

const SUPPLIER_LOCATIONS = [
  { name: "Pinetown Partner Yard", province: "KwaZulu-Natal", city: "Pinetown", latitude: -29.8167, longitude: 30.8672 },
  { name: "Cato Ridge Aggregates Partner", province: "KwaZulu-Natal", city: "Cato Ridge", latitude: -29.7333, longitude: 30.5 },
  { name: "Pietermaritzburg Quarry Partner", province: "KwaZulu-Natal", city: "Pietermaritzburg", latitude: -29.6006, longitude: 30.3794 },
  { name: "Germiston Aggregates Partner", province: "Gauteng", city: "Germiston", latitude: -26.2309, longitude: 28.1624 },
  { name: "Centurion Quarry Partner", province: "Gauteng", city: "Centurion", latitude: -25.8603, longitude: 28.1894 },
  { name: "Vereeniging Aggregates Partner", province: "Gauteng", city: "Vereeniging", latitude: -26.6731, longitude: 27.9316 },
];

async function main() {
  console.log("Seeding Aggregated Aggregates platform data...");

  const categoryRecords: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryRecords[cat.slug] = record.id;
  }

  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        categoryId: categoryRecords[p.category],
        gradingStandard: p.gradingStandard ?? undefined,
      },
    });

    await prisma.priceBand.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        bulkDensityKgPerM3: p.bulkDensityKgPerM3,
        baseCostPerTon: p.baseCostPerTon,
        markupPercent: p.markupPercent,
        listPricePerTon: p.listPricePerTon,
        listPricePerM3: p.listPricePerM3,
        bagPremiumMultiplier: p.bagPremiumMultiplier ?? undefined,
        bagWeightKg: p.bagWeightKg ?? undefined,
        listPricePerBag: p.listPricePerBag ?? undefined,
      },
    });
  }

  await prisma.customerTier.upsert({
    where: { name: CustomerTierName.RETAIL },
    update: {},
    create: { name: CustomerTierName.RETAIL, discountPercent: 0, requiresPoInvoice: false },
  });
  await prisma.customerTier.upsert({
    where: { name: CustomerTierName.CONTRACTOR_TRADE },
    update: {},
    create: { name: CustomerTierName.CONTRACTOR_TRADE, discountPercent: 8, requiresPoInvoice: false },
  });
  await prisma.customerTier.upsert({
    where: { name: CustomerTierName.VOLUME_CIVIL_BULK },
    update: {},
    create: {
      name: CustomerTierName.VOLUME_CIVIL_BULK,
      discountPercent: 15,
      minimumOrderM3: 10,
      requiresPoInvoice: true,
    },
  });

  // Distance-banded delivery: 0-30km included, 30-60/60-100km flat by load
  // size, >100km quote-only. Matches the Delivery & Additional Charges sheet.
  const bands = [
    { label: DeliveryBandLabel.INCLUDED_0_30, loadSize: null, minKm: 0, maxKm: 30, flatFee: 0, isQuoteOnly: false },
    { label: DeliveryBandLabel.BAND_30_60, loadSize: LoadSize.M3_6, minKm: 30, maxKm: 60, flatFee: 450, isQuoteOnly: false },
    { label: DeliveryBandLabel.BAND_30_60, loadSize: LoadSize.M3_10, minKm: 30, maxKm: 60, flatFee: 650, isQuoteOnly: false },
    { label: DeliveryBandLabel.BAND_30_60, loadSize: LoadSize.M3_14_PLUS, minKm: 30, maxKm: 60, flatFee: 850, isQuoteOnly: false },
    { label: DeliveryBandLabel.BAND_60_100, loadSize: LoadSize.M3_6, minKm: 60, maxKm: 100, flatFee: 750, isQuoteOnly: false },
    { label: DeliveryBandLabel.BAND_60_100, loadSize: LoadSize.M3_10, minKm: 60, maxKm: 100, flatFee: 1050, isQuoteOnly: false },
    { label: DeliveryBandLabel.BAND_60_100, loadSize: LoadSize.M3_14_PLUS, minKm: 60, maxKm: 100, flatFee: 1400, isQuoteOnly: false },
    { label: DeliveryBandLabel.QUOTE_100_PLUS, loadSize: null, minKm: 100, maxKm: null, flatFee: null, isQuoteOnly: true },
  ];
  for (const band of bands) {
    await prisma.deliveryBand.create({ data: band as any });
  }

  for (const supplier of SUPPLIER_LOCATIONS) {
    await prisma.supplierLocation.create({ data: supplier });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
