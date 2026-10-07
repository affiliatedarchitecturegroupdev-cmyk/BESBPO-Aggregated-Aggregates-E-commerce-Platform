-- CreateEnum
CREATE TYPE "PumpType" AS ENUM ('STATIC_LINE', 'BOOM');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "cementClass" TEXT,
ADD COLUMN     "cementFamily" TEXT,
ADD COLUMN     "cementType" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "minimumLoadM3" DECIMAL(6,2),
ADD COLUMN     "mixType" TEXT,
ADD COLUMN     "regionNote" TEXT,
ADD COLUMN     "specialistCharacteristics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "strengthGradeMPa" INTEGER;

-- AlterTable
ALTER TABLE "SupplierLocation" ADD COLUMN     "isGroupEntity" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReadyMixPriceBand" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "marketBenchmarkPrice" DECIMAL(10,2),
    "costBasisPercent" DECIMAL(5,2) NOT NULL,
    "markupPercent" DECIMAL(5,2) NOT NULL,
    "listPricePerM3" DECIMAL(10,2),
    "pricingStatus" TEXT NOT NULL,
    "sourceNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadyMixPriceBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadyMixPumpOption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pumpType" "PumpType" NOT NULL,
    "boomLengthM" INTEGER,
    "capacityM3PerHr" INTEGER,
    "callOutFee" DECIMAL(10,2),
    "ratePerM3" DECIMAL(10,2),
    "pricingStatus" TEXT NOT NULL,
    "sourceNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadyMixPumpOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadyMixPriceBand_productId_key" ON "ReadyMixPriceBand"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadyMixPumpOption_code_key" ON "ReadyMixPumpOption"("code");

-- AddForeignKey
ALTER TABLE "ReadyMixPriceBand" ADD CONSTRAINT "ReadyMixPriceBand_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

