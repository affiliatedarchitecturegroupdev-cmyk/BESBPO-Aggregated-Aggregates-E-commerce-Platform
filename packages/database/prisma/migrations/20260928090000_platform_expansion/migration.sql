-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('WEBSITE', 'WHATSAPP', 'INSTAGRAM_REFERRAL', 'FACEBOOK_REFERRAL');

-- CreateEnum
CREATE TYPE "PromotionSlot" AS ENUM ('HOMEPAGE_SECONDARY_BANNER', 'CATEGORY_TOP_BANNER', 'QUOTE_FLOW_UPSELL', 'FOOTER_STRIP');

-- CreateEnum
CREATE TYPE "PaymentMethodKey" AS ENUM ('CARD', 'INSTANT_EFT', 'CAPITEC_PAY', 'APPLE_PAY', 'GOOGLE_PAY', 'SAMSUNG_PAY', 'ZAPPER', 'SNAPSCAN', 'MOBICRED', 'MORETYME', 'PAYFLEX', 'PAYJUSTNOW', 'HAPPY_PAY', 'FLOAT', 'OZOW', 'STITCH', 'LULAPAY', 'EFT_PO');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('PAYFAST', 'PEACH', 'OZOW_DIRECT', 'STITCH_DIRECT', 'LULAPAY_DIRECT', 'MANUAL_EFT');

-- CreateEnum
CREATE TYPE "WhatsAppConversationState" AS ENUM ('BROWSING', 'CART_DRAFT', 'HANDED_TO_SALES', 'PAYMENT_LINK_SENT', 'PAID', 'ABANDONED');

-- AlterEnum
ALTER TYPE "QuoteReasonCode" ADD VALUE 'PRICE_ON_REQUEST';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UnitOfSale" ADD VALUE 'BAG_25KG';
ALTER TYPE "UnitOfSale" ADD VALUE 'BAG_50KG';
ALTER TYPE "UnitOfSale" ADD VALUE 'BULK_BAG_1_5T';
ALTER TYPE "UnitOfSale" ADD VALUE 'BULK_TANKER_PER_TON';
ALTER TYPE "UnitOfSale" ADD VALUE 'DRUM_210L';
ALTER TYPE "UnitOfSale" ADD VALUE 'IBC_TOTE_1000L';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "catalogueGroup" TEXT NOT NULL DEFAULT 'core';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "channel" "OrderChannel" NOT NULL DEFAULT 'WEBSITE';

-- AlterTable
ALTER TABLE "SupplierLocation" ADD COLUMN     "isVerifiedPartner" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sourceUrl" TEXT;

-- CreateTable
CREATE TABLE "PackagedPriceBand" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unit" "UnitOfSale" NOT NULL,
    "marketBenchmarkPrice" DECIMAL(10,2),
    "costBasisPercent" DECIMAL(5,2) NOT NULL,
    "costPerUnit" DECIMAL(10,2),
    "markupPercent" DECIMAL(5,2) NOT NULL,
    "listPricePerUnit" DECIMAL(10,2),
    "pricingStatus" TEXT NOT NULL,
    "sourceNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagedPriceBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "slot" "PromotionSlot" NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "bodyMarkdown" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "categoryId" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'Aggregated Aggregates',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodConfig" (
    "id" TEXT NOT NULL,
    "methodKey" "PaymentMethodKey" NOT NULL,
    "displayName" TEXT NOT NULL,
    "activeGateway" "PaymentGateway" NOT NULL,
    "fallbackGateway" "PaymentGateway",
    "minOrderValue" DECIMAL(12,2),
    "maxOrderValue" DECIMAL(12,2),
    "tradeOnly" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "state" "WhatsAppConversationState" NOT NULL DEFAULT 'BROWSING',
    "draftCartJson" JSONB,
    "lastInboundText" TEXT,
    "lastMessageId" TEXT,
    "paymentLinkUrl" TEXT,
    "orderId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackagedPriceBand_productId_unit_key" ON "PackagedPriceBand"("productId", "unit");

-- CreateIndex
CREATE INDEX "Promotion_slot_isActive_idx" ON "Promotion"("slot", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_isPublished_publishedAt_idx" ON "BlogPost"("isPublished", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodConfig_methodKey_key" ON "PaymentMethodConfig"("methodKey");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversation_orderId_key" ON "WhatsAppConversation"("orderId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_phoneNumber_state_idx" ON "WhatsAppConversation"("phoneNumber", "state");

-- AddForeignKey
ALTER TABLE "PackagedPriceBand" ADD CONSTRAINT "PackagedPriceBand_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

