-- CreateEnum
CREATE TYPE "SupplierTier" AS ENUM ('TIER_1', 'TIER_2');

-- AlterTable
ALTER TABLE "SupplierLocation" ADD COLUMN     "address" TEXT,
ADD COLUMN     "categorySlugs" TEXT[],
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "productNotes" TEXT,
ADD COLUMN     "tier" "SupplierTier" NOT NULL DEFAULT 'TIER_1',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SupplierLocation_externalId_key" ON "SupplierLocation"("externalId");

-- CreateIndex
CREATE INDEX "SupplierLocation_province_idx" ON "SupplierLocation"("province");


-- The scaffold seeded six invented placeholder suppliers in local development
-- (Render never had them). Real suppliers are imported from the supplier
-- database, so remove the placeholders wherever they exist.
DELETE FROM "SupplierLocation"
WHERE "externalId" IS NULL
  AND "name" IN (
    'Pinetown Partner Yard',
    'Cato Ridge Aggregates Partner',
    'Pietermaritzburg Quarry Partner',
    'Germiston Aggregates Partner',
    'Centurion Quarry Partner',
    'Vereeniging Aggregates Partner'
  );
