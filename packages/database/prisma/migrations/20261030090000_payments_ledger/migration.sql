-- Payments ledger (docs/payments.md): deposits and balances, lay-by (LayUp), payment
-- links, quote-to-order, and gateway incidents for automatic failover.

-- CreateEnum
CREATE TYPE "PaymentPlan" AS ENUM ('FULL', 'DEPOSIT', 'LAYBY');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('FULL', 'DEPOSIT', 'BALANCE', 'INSTALMENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEvent" ADD VALUE 'PAYMENT_RECEIVED';
ALTER TYPE "NotificationEvent" ADD VALUE 'PAYMENT_LINK_SENT';
ALTER TYPE "NotificationEvent" ADD VALUE 'GATEWAY_DEGRADED';

-- AlterEnum
ALTER TYPE "OrderChannel" ADD VALUE 'QUOTE';

-- AlterEnum
ALTER TYPE "PaymentGateway" ADD VALUE 'LAYUP';

-- AlterEnum
ALTER TYPE "PaymentMethodKey" ADD VALUE 'LAYUP';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "depositPercent" INTEGER,
ADD COLUMN     "paymentPlan" "PaymentPlan" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "quoteId" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "methodKey" "PaymentMethodKey" NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "providerCheckoutId" TEXT,
    "providerReference" TEXT,
    "failureReason" TEXT,
    "paidSoFar" DECIMAL(12,2),
    "wasFailover" BOOLEAN NOT NULL DEFAULT false,
    "linkId" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayIncident" (
    "id" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "reason" TEXT NOT NULL,
    "automatic" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "GatewayIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_providerCheckoutId_idx" ON "Payment"("providerCheckoutId");

-- CreateIndex
CREATE INDEX "Payment_gateway_status_idx" ON "Payment"("gateway", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_tokenHash_key" ON "PaymentLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PaymentLink_orderId_idx" ON "PaymentLink"("orderId");

-- CreateIndex
CREATE INDEX "GatewayIncident_gateway_endedAt_idx" ON "GatewayIncident"("gateway", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_quoteId_key" ON "Order"("quoteId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PaymentLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every order already paid gets one full payment in the ledger, so the
-- ledger and Order.amountPaid agree from day one.
UPDATE "Order" SET "amountPaid" = "total" WHERE "paidAt" IS NOT NULL;
INSERT INTO "Payment" ("id", "orderId", "kind", "amount", "methodKey", "gateway", "status", "providerReference", "createdAt", "updatedAt", "paidAt")
SELECT 'bf_' || o."id", o."id", 'FULL', o."total", COALESCE(o."paymentMethod", 'EFT_PO'),
       CASE WHEN o."paymentReference" IS NOT NULL THEN 'PAYFAST'::"PaymentGateway" ELSE 'MANUAL_EFT'::"PaymentGateway" END,
       'PAID', o."paymentReference", o."paidAt", o."paidAt", o."paidAt"
FROM "Order" o WHERE o."paidAt" IS NOT NULL;
