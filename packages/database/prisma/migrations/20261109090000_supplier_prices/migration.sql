-- CreateEnum
CREATE TYPE "PriceListSource" AS ENUM ('SUPPLIER_LIST', 'QUOTATION');

-- CreateEnum
CREATE TYPE "PriceLineStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNMATCHED');

-- CreateTable
CREATE TABLE "SupplierPriceList" (
    "id" TEXT NOT NULL,
    "source" "PriceListSource" NOT NULL DEFAULT 'SUPPLIER_LIST',
    "supplierLocationId" TEXT,
    "supplierName" TEXT NOT NULL,
    "fileName" TEXT,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPriceLine" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "supplierCode" TEXT,
    "description" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "currentPrice" DECIMAL(12,2),
    "markupPercent" DECIMAL(6,2),
    "suggestedPrice" DECIMAL(12,2),
    "approvedPrice" DECIMAL(12,2),
    "status" "PriceLineStatus" NOT NULL DEFAULT 'PENDING',
    "problem" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "quoteId" TEXT,

    CONSTRAINT "SupplierPriceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "listPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "markupPercent" DECIMAL(6,2) NOT NULL,
    "source" "PriceListSource" NOT NULL,
    "priceLineId" TEXT,
    "supplierLocationId" TEXT,
    "supplierName" TEXT,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProductCode" (
    "supplierLocationId" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProductCode_pkey" PRIMARY KEY ("supplierLocationId","supplierCode")
);

-- CreateIndex
CREATE INDEX "SupplierPriceList_createdAt_idx" ON "SupplierPriceList"("createdAt");

-- CreateIndex
CREATE INDEX "SupplierPriceLine_priceListId_status_idx" ON "SupplierPriceLine"("priceListId", "status");

-- CreateIndex
CREATE INDEX "SupplierPriceLine_sku_idx" ON "SupplierPriceLine"("sku");

-- CreateIndex
CREATE INDEX "ProductPrice_sku_unit_isActive_idx" ON "ProductPrice"("sku", "unit", "isActive");

-- CreateIndex
CREATE INDEX "ProductPrice_isActive_validUntil_idx" ON "ProductPrice"("isActive", "validUntil");

-- CreateIndex
CREATE INDEX "SupplierProductCode_sku_idx" ON "SupplierProductCode"("sku");

-- AddForeignKey
ALTER TABLE "SupplierPriceList" ADD CONSTRAINT "SupplierPriceList_supplierLocationId_fkey" FOREIGN KEY ("supplierLocationId") REFERENCES "SupplierLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPriceLine" ADD CONSTRAINT "SupplierPriceLine_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "SupplierPriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_priceLineId_fkey" FOREIGN KEY ("priceLineId") REFERENCES "SupplierPriceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductCode" ADD CONSTRAINT "SupplierProductCode_supplierLocationId_fkey" FOREIGN KEY ("supplierLocationId") REFERENCES "SupplierLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

