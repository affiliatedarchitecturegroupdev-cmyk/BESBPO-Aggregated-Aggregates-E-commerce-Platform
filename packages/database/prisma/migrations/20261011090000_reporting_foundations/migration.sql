-- CreateEnum
CREATE TYPE "CostSource" AS ENUM ('SNAPSHOT', 'ESTIMATED');

-- CreateEnum
CREATE TYPE "DeliveryCostSource" AS ENUM ('ACTUAL', 'STANDARD_RATE');

-- CreateEnum
CREATE TYPE "OperatingCostCategory" AS ENUM ('SALARIES', 'RENT', 'MARKETING', 'SOFTWARE', 'VEHICLES', 'PROFESSIONAL_FEES', 'BANK_CHARGES', 'INSURANCE', 'OTHER');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "customerTier" "CustomerTierName",
ADD COLUMN     "deliveryLoadSize" "LoadSize",
ADD COLUMN     "fulfilledBySupplierId" TEXT,
ADD COLUMN     "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethodKey",
ADD COLUMN     "timestampsEstimated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderLineItem" ADD COLUMN     "costSource" "CostSource",
ADD COLUMN     "listUnitPrice" DECIMAL(10,2),
ADD COLUMN     "pricingFamily" TEXT,
ADD COLUMN     "unitCost" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "respondedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "deliveryCost" DECIMAL(10,2),
ADD COLUMN     "deliveryCostNote" TEXT,
ADD COLUMN     "deliveryCostSource" "DeliveryCostSource";

-- CreateTable
CREATE TABLE "DeliveryCostRate" (
    "id" TEXT NOT NULL,
    "carrier" "Carrier" NOT NULL,
    "bandLabel" "DeliveryBandLabel" NOT NULL,
    "load" TEXT NOT NULL,
    "costExVat" DECIMAL(10,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryCostRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "bookingId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "refundedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingCost" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "category" "OperatingCostCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountExVat" DECIMAL(12,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryCostRate_carrier_bandLabel_load_key" ON "DeliveryCostRate"("carrier", "bandLabel", "load");

-- CreateIndex
CREATE INDEX "Refund_refundedAt_idx" ON "Refund"("refundedAt");

-- CreateIndex
CREATE INDEX "OperatingCost_month_idx" ON "OperatingCost"("month");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_fulfilledBySupplierId_fkey" FOREIGN KEY ("fulfilledBySupplierId") REFERENCES "SupplierLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Guard rails
-- ---------------------------------------------------------------------------
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_one_target" CHECK (("orderId" IS NULL) <> ("bookingId" IS NULL));
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "DeliveryCostRate" ADD CONSTRAINT "DeliveryCostRate_load" CHECK ("load" IN ('M3_6', 'M3_10', 'M3_14_PLUS', 'BAGGED'));
ALTER TABLE "DeliveryCostRate" ADD CONSTRAINT "DeliveryCostRate_cost_nonnegative" CHECK ("costExVat" >= 0);
ALTER TABLE "OperatingCost" ADD CONSTRAINT "OperatingCost_amount_nonnegative" CHECK ("amountExVat" >= 0);

-- ---------------------------------------------------------------------------
-- Backfill for orders placed before reporting started (ANALYTICS.md).
-- Everything filled here is marked ESTIMATED / timestampsEstimated, so it is
-- never mistaken for a value captured at the time.
-- ---------------------------------------------------------------------------

-- Ready-mix lines: cost per m³ from the ready-mix band.
UPDATE "OrderLineItem" li
SET "listUnitPrice" = rb."listPricePerM3",
    "unitCost" = ROUND(rb."listPricePerM3" / (1 + rb."markupPercent" / 100), 2),
    "pricingFamily" = 'READY_MIX',
    "costSource" = 'ESTIMATED'
FROM "ReadyMixPriceBand" rb
WHERE rb."productId" = li."productId" AND li."costSource" IS NULL AND rb."listPricePerM3" IS NOT NULL;

-- Packaged goods (cement, mortars, admixtures): cost per unit from the packaged band.
UPDATE "OrderLineItem" li
SET "listUnitPrice" = pb."listPricePerUnit",
    "unitCost" = COALESCE(pb."costPerUnit", ROUND(pb."listPricePerUnit" / (1 + pb."markupPercent" / 100), 2)),
    "pricingFamily" = CASE WHEN li."unitOfSale" IN ('BAG_25KG', 'BAG_50KG') THEN 'CEMENT_BAGGED' ELSE 'CEMENT_BULK' END,
    "costSource" = 'ESTIMATED'
FROM "PackagedPriceBand" pb
WHERE pb."productId" = li."productId" AND pb."unit" = li."unitOfSale" AND li."costSource" IS NULL AND pb."listPricePerUnit" IS NOT NULL;

-- Aggregates: cost per ton, m³ or bag from the aggregate band.
UPDATE "OrderLineItem" li
SET "listUnitPrice" = CASE li."unitOfSale" WHEN 'BULK_TON' THEN pb."listPricePerTon" WHEN 'BULK_M3' THEN pb."listPricePerM3" ELSE pb."listPricePerBag" END,
    "unitCost" = ROUND(
      (CASE li."unitOfSale" WHEN 'BULK_TON' THEN pb."listPricePerTon" WHEN 'BULK_M3' THEN pb."listPricePerM3" ELSE pb."listPricePerBag" END)
      / (1 + pb."markupPercent" / 100), 2),
    "pricingFamily" = 'AGGREGATE',
    "costSource" = 'ESTIMATED'
FROM "PriceBand" pb
WHERE pb."productId" = li."productId" AND li."costSource" IS NULL AND li."unitOfSale" IN ('BULK_TON', 'BULK_M3', 'BAGGED')
  AND (li."unitOfSale" <> 'BAGGED' OR pb."listPricePerBag" IS NOT NULL);

-- Tier the order was priced at: the company's tier (Retail for private buyers).
UPDATE "Order" o SET "customerTier" = 'RETAIL' WHERE o."companyId" IS NULL AND o."customerTier" IS NULL;
UPDATE "Order" o SET "customerTier" = t."name"
FROM "Company" c JOIN "CustomerTier" t ON t."id" = c."tierId"
WHERE c."id" = o."companyId" AND o."customerTier" IS NULL;

-- When payment was confirmed / the order was cancelled, best available evidence.
UPDATE "Order" o
SET "paidAt" = COALESCE(i."paidAt", s."dispatchedAt", o."updatedAt"), "timestampsEstimated" = true
FROM "Order" o2
LEFT JOIN "Invoice" i ON i."orderId" = o2."id"
LEFT JOIN "Shipment" s ON s."orderId" = o2."id"
WHERE o2."id" = o."id" AND o."status" IN ('CONFIRMED', 'IN_TRANSIT', 'DELIVERED') AND o."paidAt" IS NULL;
UPDATE "Order" SET "cancelledAt" = "updatedAt", "timestampsEstimated" = true WHERE "status" = 'CANCELLED' AND "cancelledAt" IS NULL;

-- Orders and bookings placed by staff or admin accounts are treated as tests (admins can unflag them).
UPDATE "Order" o SET "isTest" = true FROM "User" u WHERE u."id" = o."userId" AND u."role" IN ('STAFF', 'ADMIN');
UPDATE "Booking" b SET "isTest" = true FROM "User" u WHERE u."id" = b."userId" AND u."role" IN ('STAFF', 'ADMIN');

-- Quotes already answered: their last update is when they were answered.
UPDATE "Quote" SET "respondedAt" = "updatedAt" WHERE "status" IN ('ACCEPTED', 'DECLINED') AND "respondedAt" IS NULL;
