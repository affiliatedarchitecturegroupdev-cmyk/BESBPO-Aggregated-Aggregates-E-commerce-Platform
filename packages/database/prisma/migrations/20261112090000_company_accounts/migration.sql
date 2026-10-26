-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('ADMIN', 'BUYER', 'APPROVER', 'ACCOUNTS');

-- CreateEnum
CREATE TYPE "OrderApprovalStatus" AS ENUM ('AWAITING', 'APPROVED', 'DECLINED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEvent" ADD VALUE 'COMPANY_INVITE';
ALTER TYPE "NotificationEvent" ADD VALUE 'ORDER_APPROVAL_REQUESTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'ORDER_APPROVAL_DECIDED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "approvalThreshold" DECIMAL(12,2),
ADD COLUMN     "requirePurchaseOrder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "approvalDecidedAt" TIMESTAMP(3),
ADD COLUMN     "approvalNote" TEXT,
ADD COLUMN     "approvalReason" TEXT,
ADD COLUMN     "approvalStatus" "OrderApprovalStatus",
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "purchaseOrderNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyRole" "CompanyRole",
ADD COLUMN     "spendLimit" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "CompanyInvite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL,
    "spendLimit" DECIMAL(12,2),
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CompanyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInvite_tokenHash_key" ON "CompanyInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "CompanyInvite_companyId_idx" ON "CompanyInvite"("companyId");

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Everyone already in a company applied for it, or was linked by staff: they administer it.
UPDATE "User" SET "companyRole" = 'ADMIN' WHERE "companyId" IS NOT NULL;
