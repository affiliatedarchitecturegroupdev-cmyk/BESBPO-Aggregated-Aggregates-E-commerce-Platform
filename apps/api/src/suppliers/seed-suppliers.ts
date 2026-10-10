/**
 * Deploy-time supplier seed: imports the supplier CSVs in
 * packages/database/prisma/seed-data — the verified partner network and
 * the B2B Bulk & Infrastructure research leads — creating only suppliers
 * whose supplier_id isn't in the database yet. Existing suppliers (and every
 * staff edit to them: map pins, contacts, activation) are never touched;
 * changes to existing rows go through the /admin/suppliers CSV import.
 *
 * Run after migrations: node apps/api/dist/suppliers/seed-suppliers.js
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@aggregates/database";
import { parseSupplierCsv, SERVICE_PROVINCES } from "./supplier-csv";

const FILES = ["suppliers-aggregates.csv", "suppliers-b2b-bulk.csv", "suppliers-ready-mix.csv", "suppliers-steel.csv", "suppliers-masonry.csv"];

export async function seedSuppliers(prisma: PrismaClient, dir = join(__dirname, "../../../../packages/database/prisma/seed-data")) {
  let created = 0;
  for (const file of FILES) {
    const { rows, errors } = parseSupplierCsv(readFileSync(join(dir, file), "utf8"));
    if (errors.length > 0) throw new Error(`${file}: ${errors.map((e) => `line ${e.line}: ${e.message}`).join("; ")}`);
    const existing = new Set(
      (await prisma.supplierLocation.findMany({ where: { externalId: { in: rows.map((r) => r.externalId) } }, select: { externalId: true } })).map((s) => s.externalId),
    );
    const fresh = rows.filter((row) => !existing.has(row.externalId));
    await prisma.supplierLocation.createMany({
      data: fresh.map((row) => ({
        externalId: row.externalId,
        name: row.name,
        tier: row.tier,
        province: row.province,
        city: row.city,
        address: row.address,
        categorySlugs: row.categorySlugs,
        productNotes: row.productNotes,
        isVerifiedPartner: row.isVerifiedPartner,
        isGroupEntity: row.isGroupEntity ?? false,
        sourceUrl: row.sourceUrl,
        // Verified partners go live in every province; researched leads wait for staff.
        isActive: row.isVerifiedPartner && SERVICE_PROVINCES.includes(row.province),
      })),
    });
    created += fresh.length;
  }
  return created;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedSuppliers(prisma)
    .then((created) => console.log(`Supplier seed: ${created} new supplier(s) added.`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
