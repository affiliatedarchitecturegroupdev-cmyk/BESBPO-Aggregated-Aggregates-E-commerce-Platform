/**
 * Deploy-time import of the sourced product photography in
 * packages/database/prisma/seed-data/product-images (manifest.json + WebP
 * files). Two kinds of photo live there:
 *
 * - Open-licence photos (an `openLicence` entry — Wikimedia Commons CC0,
 *   public domain, CC BY, CC BY-SA) are published straight away as CLEARED,
 *   with the licence and any required credit stored for the storefront.
 * - Everything else was found on other companies' websites and is attached as
 *   PERMISSION_PENDING — visible to staff, never to the public — until staff
 *   record permission for its source in Admin → Image permissions.
 *
 * See PRODUCT_IMAGES.md.
 *
 * Create-only and idempotent: a photo already imported for a product (by
 * importKey, even if staff since removed it) is never touched again, so
 * staff decisions survive every deploy.
 *
 * Run after migrations: node apps/api/dist/merchandising/seed-product-images.js
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@aggregates/database";

export const SEED_IMAGE_PREFIX = "seed:";
export const SEED_IMAGE_DIR = join(__dirname, "../../../../packages/database/prisma/seed-data/product-images");

export type SeedImage = {
  file: string;
  width: number;
  height: number;
  bytes: number;
  source: string;
  sourceCountry: string | null;
  sourcePage: string | null;
  sourcingNote: string | null;
  flags: ("LOW_RES" | "BRAND_VISIBLE" | "NON_SA" | "SHARED")[];
  /** Set only for photos under a licence that already allows commercial use. */
  openLicence?: OpenLicence;
};
export type OpenLicence = {
  name: string; // "CC BY-SA 4.0", "CC0", "Public domain"
  url: string | null;
  author: string;
  /** The credit line the licence requires on the page; null for CC0 / public domain. */
  credit: string | null;
};
export type SeedManifest = { images: SeedImage[]; products: Record<string, string[]> };

const FLAG_NOTE: Record<SeedImage["flags"][number], string> = {
  LOW_RES: "Low resolution — replace with a larger photo when possible",
  BRAND_VISIBLE: "Another company's brand is visible — only use if we sell that brand",
  NON_SA: "Photo from outside South Africa",
  SHARED: "Same photo used for similar products — shows the material, not necessarily this exact grading",
};

export function readManifest(dir = SEED_IMAGE_DIR): SeedManifest {
  return JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as SeedManifest;
}

/** Only plain "<hex>.webp" names from our own manifest ever map to a file. */
export function seedImagePath(file: string, dir = SEED_IMAGE_DIR): string | null {
  return /^[a-f0-9]{12}\.webp$/.test(file) ? join(dir, file) : null;
}

export async function seedProductImages(prisma: PrismaClient, dir = SEED_IMAGE_DIR) {
  const manifest = readManifest(dir);
  const images = new Map(manifest.images.map((image) => [image.file, image]));
  const products = await prisma.product.findMany({ where: { sku: { in: Object.keys(manifest.products) } }, select: { id: true, sku: true } });
  const productId = new Map(products.map((p) => [p.sku, p.id]));
  const existing = new Set(
    (await prisma.productImage.findMany({ where: { importKey: { not: null } }, select: { importKey: true } })).map((i) => i.importKey),
  );

  let created = 0;
  for (const [sku, files] of Object.entries(manifest.products)) {
    const id = productId.get(sku);
    if (!id) continue; // SKU not in this database (e.g. a trimmed dev seed)
    // Sourced photos go after any photography staff have already added.
    let order = await prisma.productImage.count({ where: { productId: id } });
    for (const file of files) {
      const importKey = `${sku}:${file}`;
      const image = images.get(file);
      const path = seedImagePath(file, dir);
      if (existing.has(importKey) || !image || !path || !existsSync(path)) continue;
      const notes = [image.sourcingNote, ...image.flags.map((f) => FLAG_NOTE[f])].filter(Boolean).join(" · ");
      const open = image.openLicence;
      await prisma.productImage.create({
        data: {
          productId: id,
          // One file can back several products, so the storage key carries the SKU to stay unique.
          storageKey: `${SEED_IMAGE_PREFIX}${sku}/${file}`,
          contentType: "image/webp",
          sizeBytes: image.bytes,
          altText: null,
          sortOrder: order++,
          licence: open ? "CLEARED" : "PERMISSION_PENDING",
          sourceName: image.source,
          sourceUrl: image.sourcePage,
          sourceNote: notes || null,
          licenceName: open?.name ?? null,
          licenceUrl: open?.url ?? null,
          credit: open?.credit ?? null,
          importKey,
        },
      });
      created++;
    }
  }
  return created;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedProductImages(prisma)
    .then((created) => console.log(`Product images: ${created} photo(s) added.`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
