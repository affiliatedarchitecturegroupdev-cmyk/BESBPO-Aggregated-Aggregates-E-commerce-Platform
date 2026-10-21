-- Sales quotations (docs/sales-quotes.md): quotes made by staff for a client, priced line by line.
-- CreateEnum
CREATE TYPE "QuoteChannel" AS ENUM ('STOREFRONT', 'SALES');

-- AlterEnum
ALTER TYPE "NotificationEvent" ADD VALUE 'QUOTATION_SENT';

-- AlterEnum
ALTER TYPE "QuoteReasonCode" ADD VALUE 'SALES_QUOTE';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "acceptTokenHash" TEXT,
ADD COLUMN     "channel" "QuoteChannel" NOT NULL DEFAULT 'STOREFRONT',
ADD COLUMN     "clientVatNumber" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deliveryFee" DECIMAL(10,2),
ADD COLUMN     "pricingTier" "CustomerTierName",
ADD COLUMN     "quoteNumber" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuoteLineItem" ADD COLUMN     "markupPercent" DECIMAL(6,2),
ADD COLUMN     "note" TEXT,
ADD COLUMN     "priceSource" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unitCost" DECIMAL(10,2),
ADD COLUMN     "unitPrice" DECIMAL(10,2);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_acceptTokenHash_key" ON "Quote"("acceptTokenHash");

-- CreateIndex
CREATE INDEX "Quote_channel_createdAt_idx" ON "Quote"("channel", "createdAt");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Quotation numbers (AAQ-000001), like invoice numbers.
CREATE SEQUENCE "quote_number_seq" START 1;
