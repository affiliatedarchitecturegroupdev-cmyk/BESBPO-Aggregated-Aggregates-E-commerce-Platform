-- CreateEnum
CREATE TYPE "ProjectPackage" AS ENUM ('ROOF');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('BRIEF', 'DESIGN', 'QUOTING', 'PROPOSED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectLineKind" AS ENUM ('DESIGN', 'MATERIALS', 'FABRICATION', 'INSTALLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('DUE', 'PAID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEvent" ADD VALUE 'PROJECT_RECEIVED';
ALTER TYPE "NotificationEvent" ADD VALUE 'PROJECT_PROPOSAL_SENT';
ALTER TYPE "NotificationEvent" ADD VALUE 'PROJECT_ACCEPTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'PROJECT_MILESTONE_PAID';

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "package" "ProjectPackage" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'BRIEF',
    "userId" TEXT,
    "companyId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "siteAddress" TEXT,
    "province" TEXT NOT NULL,
    "brief" JSONB NOT NULL,
    "takeoff" JSONB NOT NULL,
    "clientNotes" TEXT,
    "staffNotes" TEXT,
    "proposalMessage" TEXT,
    "proposalSentAt" TIMESTAMP(3),
    "proposalValidUntil" TIMESTAMP(3),
    "proposalTokenHash" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptedName" TEXT,
    "total" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLine" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "kind" "ProjectLineKind" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCost" DECIMAL(12,2),
    "partnerName" TEXT,

    CONSTRAINT "ProjectLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'DUE',
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "recordedById" TEXT,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_reference_key" ON "Project"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Project_proposalTokenHash_key" ON "Project"("proposalTokenHash");

-- CreateIndex
CREATE INDEX "Project_status_createdAt_idx" ON "Project"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMilestone_projectId_sequence_key" ON "ProjectMilestone"("projectId", "sequence");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLine" ADD CONSTRAINT "ProjectLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Project references: AAP-000001, AAP-000002, …
CREATE SEQUENCE "project_number_seq" START 1;
