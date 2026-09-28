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
 * The B2B Bulk & Infrastructure packaged goods (CAT-10/11) come from
 * services/pricing/data/b2b_packaged_catalogue.json, transcribed from the
 * B2B pricing workbook — including its gaps (null prices where there is no
 * benchmark).
 *
 * Payment routing, promotions and the starter blog posts are created once
 * and then left alone, so admin edits survive every deploy. Partner
 * suppliers are imported separately (apps/api seed-suppliers script and the
 * /admin/suppliers CSV import).
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  CustomerTierName,
  DeliveryBandLabel,
  LoadSize,
  PaymentGateway,
  PaymentMethodKey,
  PrismaClient,
  PromotionSlot,
  UnitOfSale,
} from "@prisma/client";

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

type PackagedCatalogue = {
  categories: { slug: string; name: string; code: string }[];
  products: {
    sku: string;
    slug: string;
    name: string;
    category_slug: string;
    grading_standard: string | null;
    units: {
      unit: UnitOfSale;
      market_benchmark_price: number | null;
      cost_basis_percent: number;
      cost_per_unit: number | null;
      markup_percent: number;
      list_price_per_unit: number | null;
      pricing_status: string;
      source_note: string;
    }[];
  }[];
};

const PACKAGED: PackagedCatalogue = JSON.parse(
  readFileSync(join(__dirname, "../../../services/pricing/data/b2b_packaged_catalogue.json"), "utf8"),
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
      update: { name: category.name, sortOrder: index + 1, catalogueGroup: "core" },
      create: { slug: category.slug, name: category.name, sortOrder: index + 1, catalogueGroup: "core" },
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

/** CAT-10/11 packaged goods: categories after the core nine, products, and a price band per packaged unit. */
async function seedPackagedCatalogue() {
  const categoryIds: Record<string, string> = {};
  for (const [index, category] of PACKAGED.categories.entries()) {
    const data = { name: category.name, sortOrder: FRAMEWORK.categories.length + index + 1, catalogueGroup: "b2b-bulk" };
    const record = await prisma.category.upsert({ where: { slug: category.slug }, update: data, create: { slug: category.slug, ...data } });
    categoryIds[category.slug] = record.id;
  }
  for (const p of PACKAGED.products) {
    const productData = {
      slug: p.slug,
      name: p.name,
      categoryId: categoryIds[p.category_slug],
      gradingStandard: p.grading_standard,
      unitsOfSale: p.units.map((u) => u.unit),
    };
    const product = await prisma.product.upsert({ where: { sku: p.sku }, update: productData, create: { sku: p.sku, ...productData } });
    for (const u of p.units) {
      const band = {
        marketBenchmarkPrice: u.market_benchmark_price,
        costBasisPercent: u.cost_basis_percent,
        costPerUnit: u.cost_per_unit,
        markupPercent: u.markup_percent,
        listPricePerUnit: u.list_price_per_unit,
        pricingStatus: u.pricing_status,
        sourceNote: u.source_note,
      };
      await prisma.packagedPriceBand.upsert({
        where: { productId_unit: { productId: product.id, unit: u.unit } },
        update: band,
        create: { productId: product.id, unit: u.unit, ...band },
      });
    }
    // A unit dropped from the workbook stops being sold.
    await prisma.packagedPriceBand.deleteMany({ where: { productId: product.id, unit: { notIn: p.units.map((u) => u.unit) } } });
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

/**
 * Payment routing (the backend twin of apps/web/src/data/payment-methods.ts).
 * PayFast's merchant account covers most consumer methods; Peach's BNPL
 * network covers PayJustNow, Happy Pay and Float; Ozow, Stitch and Lulapay
 * integrate directly. A researched default, not a confirmed merchant setup
 * (PAYMENT_PROVIDER_TERMS.md) — created once, then owned by /admin/payments.
 */
const PAYMENT_METHODS: {
  methodKey: PaymentMethodKey;
  displayName: string;
  activeGateway: PaymentGateway;
  fallbackGateway?: PaymentGateway;
  minOrderValue?: number;
  maxOrderValue?: number;
  tradeOnly?: boolean;
}[] = [
  { methodKey: "CARD", displayName: "Card (Visa / Mastercard / Amex)", activeGateway: "PAYFAST", fallbackGateway: "PEACH" },
  { methodKey: "INSTANT_EFT", displayName: "Instant EFT", activeGateway: "PAYFAST", fallbackGateway: "STITCH_DIRECT" },
  { methodKey: "CAPITEC_PAY", displayName: "Capitec Pay", activeGateway: "PAYFAST" },
  { methodKey: "APPLE_PAY", displayName: "Apple Pay", activeGateway: "PAYFAST" },
  { methodKey: "GOOGLE_PAY", displayName: "Google Pay", activeGateway: "PAYFAST" },
  { methodKey: "SAMSUNG_PAY", displayName: "Samsung Pay", activeGateway: "PAYFAST" },
  { methodKey: "SNAPSCAN", displayName: "SnapScan", activeGateway: "PAYFAST" },
  { methodKey: "ZAPPER", displayName: "Zapper", activeGateway: "PAYFAST", fallbackGateway: "STITCH_DIRECT" },
  { methodKey: "PAYJUSTNOW", displayName: "PayJustNow", activeGateway: "PEACH" },
  { methodKey: "PAYFLEX", displayName: "Payflex", activeGateway: "PAYFAST", fallbackGateway: "PEACH" },
  { methodKey: "MOBICRED", displayName: "Mobicred", activeGateway: "PAYFAST" },
  { methodKey: "MORETYME", displayName: "MoreTyme", activeGateway: "PAYFAST" },
  { methodKey: "HAPPY_PAY", displayName: "Happy Pay", activeGateway: "PEACH" },
  { methodKey: "FLOAT", displayName: "Float", activeGateway: "PEACH" },
  { methodKey: "OZOW", displayName: "Ozow", activeGateway: "OZOW_DIRECT", fallbackGateway: "PEACH" },
  { methodKey: "STITCH", displayName: "Stitch", activeGateway: "STITCH_DIRECT" },
  { methodKey: "LULAPAY", displayName: "Lulapay", activeGateway: "LULAPAY_DIRECT", minOrderValue: 10000, maxOrderValue: 5000000, tradeOnly: true },
  { methodKey: "EFT_PO", displayName: "EFT / Purchase Order", activeGateway: "MANUAL_EFT", tradeOnly: true },
];

async function seedPaymentMethods() {
  for (const [index, m] of PAYMENT_METHODS.entries()) {
    await prisma.paymentMethodConfig.upsert({
      where: { methodKey: m.methodKey },
      update: {},
      create: {
        methodKey: m.methodKey,
        displayName: m.displayName,
        activeGateway: m.activeGateway,
        fallbackGateway: m.fallbackGateway,
        minOrderValue: m.minOrderValue,
        maxOrderValue: m.maxOrderValue,
        tradeOnly: m.tradeOnly ?? false,
        sortOrder: index + 1,
      },
    });
  }
}

/** One starter creative per ad slot (media-library photography), only on a fresh database. */
async function seedPromotions() {
  if ((await prisma.promotion.count()) > 0) return;
  const promotions: { slot: PromotionSlot; title: string; imageUrl: string; linkUrl: string }[] = [
    { slot: "HOMEPAGE_SECONDARY_BANNER", title: "Civil & Road Works — Bulk Sub-Base to Surface, One Supplier", imageUrl: "media:road-paving", linkUrl: "/products?category=sub-base-base-course" },
    { slot: "CATEGORY_TOP_BANNER", title: "Washed Sand, Delivered by the Ton or the m³", imageUrl: "media:sand-pile-construction", linkUrl: "/products?category=sand-fine-aggregates" },
    { slot: "QUOTE_FLOW_UPSELL", title: "Civil Bulk Order? Open a Trade Account for Standing Pricing", imageUrl: "media:gravel-surface", linkUrl: "/account/apply" },
    { slot: "FOOTER_STRIP", title: "French Drain & Soakaway Stone — Site-Ready Grading", imageUrl: "media:drainage-gravel-closeup", linkUrl: "/products?category=drainage-filter" },
  ];
  await prisma.promotion.createMany({ data: promotions });
}

const BLOG_POSTS = [
  {
    slug: "ton-vs-m3-which-should-you-order",
    title: "Ton vs. m³: Which Should You Order?",
    excerpt: "A quick guide to buying aggregates by weight or by volume — and why the numbers convert live on every product page.",
    category: { slug: "buying-guides", name: "Buying Guides" },
    publishedAt: "2026-08-04",
    coverImageUrl: "media:gravel-surface",
    bodyMarkdown: `Aggregates are sold by weight (tons) or by volume (m³), and the right choice depends on how your project measures material.

- **Civil and road-building specifications** (SANS 1200, COLTO/TRH14) are usually written in m³ of compacted layer.
- **Trucking and invoicing** is usually done in tons.

Every product page on Aggregated Aggregates converts live between the two using the material's own bulk density, so you never have to do the maths yourself — enter either unit and see the other update instantly.

## A quick example

Sub-base gravel at 1,700 kg/m³ means **6 m³ is 10.2 tons**. Washed river sand at 1,550 kg/m³ means the same 6 m³ is 9.3 tons. That difference is why a ton price and an m³ price for the same material are never the same number.`,
  },
  {
    slug: "understanding-sans-1083-grading",
    title: "Understanding SANS 1083 Grading for Concrete Aggregates",
    excerpt: "What the grading standard actually specifies, and why it matters for concrete mix design.",
    category: { slug: "technical", name: "Technical" },
    publishedAt: "2026-08-18",
    coverImageUrl: "media:stone-fragments",
    bodyMarkdown: `SANS 1083 is the South African standard for aggregates used in concrete. It covers particle-size distribution, grading limits, and quality requirements such as flakiness and durability.

Every crushed stone product graded to SANS 1083 on our platform shows the standard on its product page. Compliance documents — and a batch-specific **Certificate of Analysis** where available — are attached to the product page and to your order record.

Always confirm the batch certificate before specifying material for structural or engineered work: real quarry output varies from batch to batch.`,
  },
  {
    slug: "bulk-cement-buying-guide",
    title: "Buying Bulk Cement: Bag, Bulk Bag, or Tanker?",
    excerpt: "How to choose the right cement format for your project — and why some formats are quote-only for now.",
    category: { slug: "buying-guides", name: "Buying Guides" },
    publishedAt: "2026-09-15",
    coverImageUrl: "media:yellow-loader",
    bodyMarkdown: `Our Cement & Hydraulic Binders range offers 42.5N and 52.5N cement in three formats:

1. **50kg bags** for smaller jobs,
2. **1.5-ton bulk bags** for mid-size pours, and
3. **tanker loads (per ton)** for ready-mix and precast operations.

Bagged 42.5N is fully benchmarked and priced live today. Bulk-bag, tanker and 52.5N pricing is still being confirmed directly with our cement suppliers, so those go to a quick quote instead of an instant price — we'd rather ask than guess.`,
  },
];

/** The starter articles, created once by slug — after that they belong to /admin/blog. */
async function seedBlog() {
  for (const post of BLOG_POSTS) {
    if (await prisma.blogPost.findUnique({ where: { slug: post.slug } })) continue;
    const category = await prisma.blogCategory.upsert({ where: { slug: post.category.slug }, update: {}, create: post.category });
    await prisma.blogPost.create({
      data: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        bodyMarkdown: post.bodyMarkdown,
        coverImageUrl: post.coverImageUrl,
        categoryId: category.id,
        isPublished: true,
        publishedAt: new Date(`${post.publishedAt}T08:00:00Z`),
      },
    });
  }
}

async function main() {
  console.log("Seeding Aggregated Aggregates platform data...");
  await seedCatalogue();
  await seedPackagedCatalogue();
  await seedCustomerTiers();
  await seedDeliveryBands();
  await seedPaymentMethods();
  await seedPromotions();
  await seedBlog();
  console.log(
    `Seed complete: ${FRAMEWORK.products.length} products across ${FRAMEWORK.categories.length} categories, ` +
      `plus ${PACKAGED.products.length} B2B packaged products.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
