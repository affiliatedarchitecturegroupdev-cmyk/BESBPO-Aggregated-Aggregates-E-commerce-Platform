-- CreateEnum
CREATE TYPE "ImageLicence" AS ENUM ('CLEARED', 'PERMISSION_PENDING', 'REMOVED');

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "importKey" TEXT,
ADD COLUMN     "licence" "ImageLicence" NOT NULL DEFAULT 'CLEARED',
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceNote" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_importKey_key" ON "ProductImage"("importKey");

-- CreateIndex
CREATE INDEX "ProductImage_sourceName_idx" ON "ProductImage"("sourceName");

