-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'LEARNERSHIP');

-- CreateEnum
CREATE TYPE "WorkplaceType" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'UNSUCCESSFUL', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "SubscriberAudience" AS ENUM ('CUSTOMER', 'CONTRACTOR', 'PARTNER', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OAuthProvider" ADD VALUE 'FACEBOOK';
ALTER TYPE "OAuthProvider" ADD VALUE 'X';
ALTER TYPE "OAuthProvider" ADD VALUE 'INSTAGRAM';

-- AlterEnum
ALTER TYPE "PromotionSlot" ADD VALUE 'GROUP_CROSS_SELL';

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "workplace" "WorkplaceType" NOT NULL DEFAULT 'ON_SITE',
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "salary" TEXT,
    "closingDate" TIMESTAMP(3),
    "status" "VacancyStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "province" TEXT,
    "town" TEXT,
    "linkedinUrl" TEXT,
    "coverNote" TEXT,
    "cvStorageKey" TEXT NOT NULL,
    "cvFileName" TEXT NOT NULL,
    "cvContentType" TEXT NOT NULL,
    "cvSizeBytes" INTEGER NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "staffNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "audience" "SubscriberAudience" NOT NULL DEFAULT 'CUSTOMER',
    "province" TEXT,
    "source" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "unsubscribeToken" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vacancy_slug_key" ON "Vacancy"("slug");

-- CreateIndex
CREATE INDEX "Vacancy_status_closingDate_idx" ON "Vacancy"("status", "closingDate");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_cvStorageKey_key" ON "JobApplication"("cvStorageKey");

-- CreateIndex
CREATE INDEX "JobApplication_vacancyId_status_idx" ON "JobApplication"("vacancyId", "status");

-- CreateIndex
CREATE INDEX "JobApplication_createdAt_idx" ON "JobApplication"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_unsubscribedAt_idx" ON "NewsletterSubscriber"("unsubscribedAt");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- National launch (Oct 2026): verified partners in every province go live.
-- The first deploy imported partners outside Gauteng and KwaZulu-Natal as
-- inactive; switch on the ones staff haven't touched since import, so no
-- deliberate staff decision is overridden.
UPDATE "SupplierLocation"
SET "isActive" = true
WHERE "isVerifiedPartner" = true
  AND "isActive" = false
  AND "province" NOT IN ('Gauteng', 'KwaZulu-Natal')
  AND "updatedAt" < "createdAt" + INTERVAL '1 minute';
