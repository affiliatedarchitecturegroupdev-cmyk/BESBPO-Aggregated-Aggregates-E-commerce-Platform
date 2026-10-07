-- CreateEnum
CREATE TYPE "HirePartnerStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('QUOTED', 'AWAITING_PAYMENT', 'DISPATCHING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'DISPUTED', 'UNFULFILLED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingBasis" AS ENUM ('DAY', 'WEEK', 'LOAD', 'SKIP', 'M2', 'JOB');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('CUSTOMER', 'PARTNER', 'STAFF');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DisputeOutcome" AS ENUM ('PAY_PARTNER', 'REFUND_CUSTOMER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'HELD', 'DUE', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FlagSignal" AS ENUM ('REDACTION_HIT', 'REPEAT_PAIR_STOPPED');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'DISMISSED', 'ACTIONED');

-- AlterEnum
ALTER TYPE "NotificationAudience" ADD VALUE 'PARTNER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEvent" ADD VALUE 'BOOKING_QUOTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'BOOKING_PAYMENT_CONFIRMED';
ALTER TYPE "NotificationEvent" ADD VALUE 'BOOKING_OFFERED';
ALTER TYPE "NotificationEvent" ADD VALUE 'BOOKING_PARTNER_ASSIGNED';
ALTER TYPE "NotificationEvent" ADD VALUE 'BOOKING_UNFULFILLED';
ALTER TYPE "NotificationEvent" ADD VALUE 'BOOKING_COMPLETED';
ALTER TYPE "NotificationEvent" ADD VALUE 'BOOKING_DISPUTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'PAYOUT_DUE';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PARTNER';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "bookingId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hirePartnerId" TEXT;

-- CreateTable
CREATE TABLE "HirePartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "town" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "HirePartnerStatus" NOT NULL DEFAULT 'ONBOARDING',
    "isGroupEntity" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "payoutDetailsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HirePartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerFleetUnit" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerFleetUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAvailabilityBlock" (
    "id" TEXT NOT NULL,
    "fleetUnitId" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "reason" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enquiryId" TEXT,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "basis" "BookingBasis" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "province" TEXT NOT NULL,
    "siteAddress" TEXT NOT NULL,
    "siteNotes" TEXT,
    "siteLatitude" DOUBLE PRECISION,
    "siteLongitude" DOUBLE PRECISION,
    "partnerAmount" DECIMAL(12,2) NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    "customerTotal" DECIMAL(12,2) NOT NULL,
    "quoteSource" TEXT NOT NULL,
    "quoteValidUntil" TIMESTAMP(3),
    "preferredPartnerId" TEXT,
    "assignedPartnerId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'QUOTED',
    "arrivalOtpHash" TEXT,
    "otpFailures" INTEGER NOT NULL DEFAULT 0,
    "paymentReference" TEXT,
    "customerRating" INTEGER,
    "cancelledReason" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchOffer" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "DispatchOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCard" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "hoursWorked" DECIMAL(5,2),
    "startHourMeter" DECIMAL(10,1),
    "endHourMeter" DECIMAL(10,1),
    "loads" INTEGER,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingMessage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "wasRedacted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "raisedBy" "MessageSender" NOT NULL,
    "raisedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "outcome" "DisputeOutcome",
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayout" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "releaseAfter" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircumventionFlag" (
    "id" TEXT NOT NULL,
    "signal" "FlagSignal" NOT NULL,
    "detail" TEXT NOT NULL,
    "bookingId" TEXT,
    "partnerId" TEXT,
    "userId" TEXT,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircumventionFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerFleetUnit_sku_province_idx" ON "PartnerFleetUnit"("sku", "province");

-- CreateIndex
CREATE INDEX "PartnerAvailabilityBlock_fleetUnitId_startsOn_idx" ON "PartnerAvailabilityBlock"("fleetUnitId", "startsOn");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_assignedPartnerId_idx" ON "Booking"("assignedPartnerId");

-- CreateIndex
CREATE INDEX "DispatchOffer_status_expiresAt_idx" ON "DispatchOffer"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "DispatchOffer_partnerId_status_idx" ON "DispatchOffer"("partnerId", "status");

-- CreateIndex
CREATE INDEX "DispatchOffer_bookingId_idx" ON "DispatchOffer"("bookingId");

-- CreateIndex
CREATE INDEX "JobCard_bookingId_idx" ON "JobCard"("bookingId");

-- CreateIndex
CREATE INDEX "BookingMessage_bookingId_createdAt_idx" ON "BookingMessage"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayout_bookingId_key" ON "PartnerPayout"("bookingId");

-- CreateIndex
CREATE INDEX "PartnerPayout_status_releaseAfter_idx" ON "PartnerPayout"("status", "releaseAfter");

-- CreateIndex
CREATE INDEX "CircumventionFlag_status_createdAt_idx" ON "CircumventionFlag"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hirePartnerId_fkey" FOREIGN KEY ("hirePartnerId") REFERENCES "HirePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerFleetUnit" ADD CONSTRAINT "PartnerFleetUnit_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "HirePartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAvailabilityBlock" ADD CONSTRAINT "PartnerAvailabilityBlock_fleetUnitId_fkey" FOREIGN KEY ("fleetUnitId") REFERENCES "PartnerFleetUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_preferredPartnerId_fkey" FOREIGN KEY ("preferredPartnerId") REFERENCES "HirePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedPartnerId_fkey" FOREIGN KEY ("assignedPartnerId") REFERENCES "HirePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOffer" ADD CONSTRAINT "DispatchOffer_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOffer" ADD CONSTRAINT "DispatchOffer_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "HirePartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingMessage" ADD CONSTRAINT "BookingMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayout" ADD CONSTRAINT "PartnerPayout_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayout" ADD CONSTRAINT "PartnerPayout_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "HirePartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

