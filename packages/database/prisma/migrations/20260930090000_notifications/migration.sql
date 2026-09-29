-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM ('ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_DISPATCHED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'QUOTE_RECEIVED', 'QUOTE_PRICED', 'QUOTE_ACCEPTED', 'QUOTE_DECLINED', 'TRADE_APPLICATION_RECEIVED', 'TRADE_APPLICATION_APPROVED', 'TRADE_APPLICATION_DECLINED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('CUSTOMER', 'STAFF');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'LOGGED', 'FAILED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "whatsappUpdates" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "whatsappUpdates" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "audience" "NotificationAudience" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "html" TEXT,
    "templateName" TEXT,
    "templateParams" TEXT[],
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "orderId" TEXT,
    "quoteId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "event" "NotificationEvent" NOT NULL,
    "customerEmail" BOOLEAN NOT NULL DEFAULT true,
    "customerWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "staffEmail" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("event")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_orderId_idx" ON "Notification"("orderId");

-- CreateIndex
CREATE INDEX "Notification_quoteId_idx" ON "Notification"("quoteId");

