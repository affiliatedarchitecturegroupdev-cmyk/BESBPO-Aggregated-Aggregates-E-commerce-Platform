-- Documents previously held only an external fileUrl and there was no way to
-- create one, so the table is empty in every environment. Clearing it keeps the
-- new NOT NULL storage columns from failing on a stray development row.
DELETE FROM "ComplianceDocument";

-- AlterTable
ALTER TABLE "ComplianceDocument" DROP COLUMN "fileUrl",
ADD COLUMN     "contentType" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL,
ADD COLUMN     "storageKey" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "uploadedById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceDocument_storageKey_key" ON "ComplianceDocument"("storageKey");

-- CreateIndex
CREATE INDEX "ComplianceDocument_productId_idx" ON "ComplianceDocument"("productId");

-- CreateIndex
CREATE INDEX "ComplianceDocument_orderId_idx" ON "ComplianceDocument"("orderId");

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

