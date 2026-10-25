-- CreateEnum
CREATE TYPE "CatalogueImportStatus" AS ENUM ('PREVIEW', 'APPLIED', 'DISCARDED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "catalogueImportId" TEXT;

-- CreateTable
CREATE TABLE "CatalogueImport" (
    "id" TEXT NOT NULL,
    "status" "CatalogueImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "fileName" TEXT NOT NULL,
    "supplierLocationId" TEXT,
    "supplierName" TEXT,
    "validUntil" TIMESTAMP(3),
    "rows" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "appliedById" TEXT,
    "priceListId" TEXT,

    CONSTRAINT "CatalogueImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogueImport_createdAt_idx" ON "CatalogueImport"("createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_catalogueImportId_fkey" FOREIGN KEY ("catalogueImportId") REFERENCES "CatalogueImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogueImport" ADD CONSTRAINT "CatalogueImport_supplierLocationId_fkey" FOREIGN KEY ("supplierLocationId") REFERENCES "SupplierLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

