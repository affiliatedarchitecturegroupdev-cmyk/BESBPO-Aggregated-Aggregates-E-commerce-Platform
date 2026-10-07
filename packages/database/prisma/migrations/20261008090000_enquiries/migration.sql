-- CreateEnum
CREATE TYPE "EnquiryKind" AS ENUM ('PLANT_HIRE', 'SITE_SERVICE', 'BUSINESS_LINE', 'JOB_PACK', 'ESTIMATE', 'PARTNER_APPLICATION');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'QUOTED', 'WON', 'LOST', 'CLOSED');

-- AlterEnum
ALTER TYPE "NotificationEvent" ADD VALUE 'ENQUIRY_RECEIVED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "enquiryId" TEXT;

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "kind" "EnquiryKind" NOT NULL,
    "subject" TEXT NOT NULL,
    "sku" TEXT,
    "details" JSONB NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "companyName" TEXT,
    "province" TEXT,
    "siteAddress" TEXT,
    "message" TEXT,
    "userId" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "staffNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_reference_key" ON "Enquiry"("reference");

-- CreateIndex
CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_kind_idx" ON "Enquiry"("kind");

