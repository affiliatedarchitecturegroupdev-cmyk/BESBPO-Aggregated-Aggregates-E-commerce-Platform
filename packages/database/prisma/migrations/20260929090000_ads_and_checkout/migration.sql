-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryDistanceKm" DOUBLE PRECISION,
ADD COLUMN     "deliveryProvince" TEXT,
ADD COLUMN     "distanceSource" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "categorySlug" TEXT,
ADD COLUMN     "industrySlug" TEXT;

-- CreateTable
CREATE TABLE "PromotionStat" (
    "promotionId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PromotionStat_pkey" PRIMARY KEY ("promotionId","day")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- AddForeignKey
ALTER TABLE "PromotionStat" ADD CONSTRAINT "PromotionStat_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

