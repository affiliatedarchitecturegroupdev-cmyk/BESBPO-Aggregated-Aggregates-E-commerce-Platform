/**
 * Seed data for local development and demos.
 *
 * Categories, the 48-SKU catalogue, price bands, customer tiers and delivery
 * bands all come from services/pricing/data/pricing_framework.json, which is
 * generated from the pricing framework workbook
 * (docs/pricing/aggregated-aggregates-pricing-framework.xlsx) by
 * services/pricing/scripts/import_pricing_framework.py. To change a price,
 * change the workbook and re-run that script — never edit figures here
 * (AGENTIC_RULES.md rule 1).
 *
 * Partner suppliers are not seeded: staff import them from the supplier
 * database CSV in the admin (/admin/suppliers), so the list never lives in
 * the public repository.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { CustomerTierName, DeliveryBandLabel, LoadSize, PrismaClient, UnitOfSale } from "@prisma/client";

const prisma = new PrismaClient();

type Unit = "ton" | "m3" | "bag";

type PricingFramework = {
  categories: {
    slug: string;
    name: string;
    bulk_density_kg_per_m3: number;
    base_cost_per_ton: number;
    markup: number;
    bag_premium_multiplier: number;
  }[];
  customer_tiers: {
    name: CustomerTierName;
    discount: number;
    quote_only_min_m3: number | null;
    requires_po_invoice: boolean;
  }[];
  delivery: {
    bands: { label: DeliveryBandLabel; min_km: number; max_km: number; fees: Partial<Record<LoadSize, number>> }[];
    quote_over_km: number;
  };
  products: {
    sku: string;
    slug: string;
    name: string;
    category_slug: string;
    grading_standard: string | null;
    units: Unit[];
    bag_weight_kg: number | null;
    bulk_density_kg_per_m3: number;
    bag_premium_multiplier: number | null;
    list_prices: { ton: number; m3: number; bag?: number };
  }[];
};

const FRAMEWORK: PricingFramework = JSON.parse(
  readFileSync(join(__dirname, "../../../services/pricing/data/pricing_framework.json"), "utf8"),
);

const UNIT_OF_SALE: Record<Unit, UnitOfSale> = {
  ton: UnitOfSale.BULK_TON,
  m3: UnitOfSale.BULK_M3,
  bag: UnitOfSale.BAGGED,
};


async function seedCatalogue() {
  const categories = new Map(FRAMEWORK.categories.map((c) => [c.slug, c]));
  const categoryIds: Record<string, string> = {};
  for (const [index, category] of FRAMEWORK.categories.entries()) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: index + 1 },
      create: { slug: category.slug, name: category.name, sortOrder: index + 1 },
    });
    categoryIds[category.slug] = record.id;
  }

  for (const p of FRAMEWORK.products) {
    const category = categories.get(p.category_slug)!;
    const productData = {
      slug: p.slug,
      name: p.name,
      categoryId: categoryIds[p.category_slug],
      gradingStandard: p.grading_standard,
      unitsOfSale: p.units.map((u) => UNIT_OF_SALE[u]),
    };
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: productData,
      create: { sku: p.sku, ...productData },
    });

    const priceBand = {
      bulkDensityKgPerM3: p.bulk_density_kg_per_m3,
      baseCostPerTon: category.base_cost_per_ton,
      markupPercent: Math.round(category.markup * 10000) / 100,
      listPricePerTon: p.list_prices.ton,
      listPricePerM3: p.list_prices.m3,
      bagPremiumMultiplier: p.bag_premium_multiplier,
      bagWeightKg: p.bag_weight_kg,
      listPricePerBag: p.list_prices.bag ?? null,
    };
    await prisma.priceBand.upsert({
      where: { productId: product.id },
      update: priceBand,
      create: { productId: product.id, ...priceBand },
    });
  }
}

async function seedCustomerTiers() {
  for (const tier of FRAMEWORK.customer_tiers) {
    const data = {
      discountPercent: Math.round(tier.discount * 10000) / 100,
      minimumOrderM3: tier.quote_only_min_m3,
      requiresPoInvoice: tier.requires_po_invoice,
    };
    await prisma.customerTier.upsert({ where: { name: tier.name }, update: data, create: { name: tier.name, ...data } });
  }
}

async function upsertDeliveryBand(band: {
  label: DeliveryBandLabel;
  loadSize: LoadSize | null;
  minKm: number;
  maxKm: number | null;
  flatFee: number | null;
  isQuoteOnly: boolean;
}) {
  const existing = await prisma.deliveryBand.findFirst({ where: { label: band.label, loadSize: band.loadSize } });
  if (existing) {
    await prisma.deliveryBand.update({ where: { id: existing.id }, data: band });
  } else {
    await prisma.deliveryBand.create({ data: band });
  }
}

async function seedDeliveryBands() {
  for (const band of FRAMEWORK.delivery.bands) {
    const common = { label: band.label, minKm: band.min_km, maxKm: band.max_km, isQuoteOnly: false };
    const fees = Object.entries(band.fees) as [LoadSize, number][];
    if (fees.length === 0) {
      await upsertDeliveryBand({ ...common, loadSize: null, flatFee: 0 });
    }
    for (const [loadSize, fee] of fees) {
      await upsertDeliveryBand({ ...common, loadSize, flatFee: fee });
    }
  }
  await upsertDeliveryBand({
    label: DeliveryBandLabel.QUOTE_100_PLUS,
    loadSize: null,
    minKm: FRAMEWORK.delivery.quote_over_km,
    maxKm: null,
    flatFee: null,
    isQuoteOnly: true,
  });
}


async function main() {
  console.log("Seeding Aggregated Aggregates platform data...");
  await seedCatalogue();
  await seedCustomerTiers();
  await seedDeliveryBands();
  console.log(`Seed complete: ${FRAMEWORK.products.length} products across ${FRAMEWORK.categories.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
