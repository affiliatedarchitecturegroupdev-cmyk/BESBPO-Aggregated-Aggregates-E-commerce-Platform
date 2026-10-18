-- Phase 4: phased deliveries and proof of delivery, trade credit, supplier portal logins and answers, BOQ uploads, and their notifications.
-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('NONE', 'APPLIED', 'APPROVED', 'DECLINED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DropStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationAudience" ADD VALUE 'SUPPLIER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEvent" ADD VALUE 'DROP_DISPATCHED';
ALTER TYPE "NotificationEvent" ADD VALUE 'DELIVERY_SIGNED';
ALTER TYPE "NotificationEvent" ADD VALUE 'CREDIT_APPLIED';
ALTER TYPE "NotificationEvent" ADD VALUE 'CREDIT_DECIDED';
ALTER TYPE "NotificationEvent" ADD VALUE 'SUPPLIER_ORDER';
ALTER TYPE "NotificationEvent" ADD VALUE 'SERVICE_DOWN';

-- AlterEnum
ALTER TYPE "PaymentMethodKey" ADD VALUE 'ON_ACCOUNT';

-- AlterEnum
ALTER TYPE "PaymentPlan" ADD VALUE 'ACCOUNT';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPPLIER';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "creditApplication" JSONB,
ADD COLUMN     "creditAppliedAt" TIMESTAMP(3),
ADD COLUMN     "creditLimit" DECIMAL(12,2),
ADD COLUMN     "creditNotes" TEXT,
ADD COLUMN     "creditReviewedAt" TIMESTAMP(3),
ADD COLUMN     "creditStatus" "CreditStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "paymentTermsDays" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "accountDueAt" TIMESTAMP(3),
ADD COLUMN     "isPhased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "podTokenHash" TEXT,
ADD COLUMN     "supplierAckAt" TIMESTAMP(3),
ADD COLUMN     "supplierDeclinedAt" TIMESTAMP(3),
ADD COLUMN     "supplierNote" TEXT,
ADD COLUMN     "supplierReadyAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "boqFileName" TEXT,
ADD COLUMN     "boqStorageKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "supplierLocationId" TEXT;

-- CreateTable
CREATE TABLE "DeliveryDrop" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "scheduledFor" DATE NOT NULL,
    "status" "DropStatus" NOT NULL DEFAULT 'PLANNED',
    "lines" JSONB NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "supplierReadyAt" TIMESTAMP(3),
    "carrier" "Carrier",
    "trackingRef" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "podTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofOfDelivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "dropId" TEXT,
    "receivedBy" TEXT NOT NULL,
    "signatureKey" TEXT,
    "photoKey" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "exceptions" TEXT,
    "capturedVia" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofOfDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryDrop_podTokenHash_key" ON "DeliveryDrop"("podTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryDrop_orderId_sequence_key" ON "DeliveryDrop"("orderId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfDelivery_dropId_key" ON "ProofOfDelivery"("dropId");

-- CreateIndex
CREATE INDEX "ProofOfDelivery_orderId_idx" ON "ProofOfDelivery"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_podTokenHash_key" ON "Order"("podTokenHash");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supplierLocationId_fkey" FOREIGN KEY ("supplierLocationId") REFERENCES "SupplierLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryDrop" ADD CONSTRAINT "DeliveryDrop_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "DeliveryDrop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

