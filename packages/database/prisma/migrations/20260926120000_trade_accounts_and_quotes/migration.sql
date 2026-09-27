-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuoteReasonCode" ADD VALUE 'DELIVERY_NOT_PRICED';
ALTER TYPE "QuoteReasonCode" ADD VALUE 'CUSTOMER_REQUEST';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "applicationNotes" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "requestedTierId" TEXT,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "deliveryProvince" TEXT,
ADD COLUMN     "estimatedSubtotal" DECIMAL(12,2),
ADD COLUMN     "projectName" TEXT,
ADD COLUMN     "quotedAt" TIMESTAMP(3),
ADD COLUMN     "reasons" TEXT[],
ADD COLUMN     "staffNotes" TEXT;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_requestedTierId_fkey" FOREIGN KEY ("requestedTierId") REFERENCES "CustomerTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

