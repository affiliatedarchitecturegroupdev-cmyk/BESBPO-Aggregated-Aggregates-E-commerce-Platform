-- Cut & bend (STEEL_CATALOGUE.md, Phase S2): bar bending schedules, their lines,
-- and the notification events and link for them.
ALTER TYPE "NotificationEvent" ADD VALUE 'BENDING_SCHEDULE_RECEIVED';
ALTER TYPE "NotificationEvent" ADD VALUE 'BENDING_SCHEDULE_QUOTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'BENDING_SCHEDULE_ACCEPTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'BENDING_SCHEDULE_DECLINED';

ALTER TABLE "Notification" ADD COLUMN "bendingScheduleId" TEXT;

CREATE TYPE "BendingScheduleStatus" AS ENUM ('NEW', 'IN_REVIEW', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CLOSED');

CREATE TABLE "BendingSchedule" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "BendingScheduleStatus" NOT NULL DEFAULT 'NEW',
    "userId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "companyName" TEXT,
    "projectName" TEXT,
    "province" TEXT,
    "siteAddress" TEXT,
    "requiredBy" DATE,
    "message" TEXT,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "totalMassKg" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fileStorageKey" TEXT,
    "fileName" TEXT,
    "fileContentType" TEXT,
    "fileSizeBytes" INTEGER,
    "quotedAmount" DECIMAL(12,2),
    "quoteNotes" TEXT,
    "quoteValidUntil" DATE,
    "quotedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "staffNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BendingSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BendingScheduleLine" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "barMark" TEXT NOT NULL,
    "member" TEXT,
    "barType" TEXT NOT NULL,
    "diameterMm" INTEGER NOT NULL,
    "shapeCode" TEXT NOT NULL,
    "members" INTEGER NOT NULL,
    "barsPerMember" INTEGER NOT NULL,
    "lengthMm" INTEGER NOT NULL,
    "massKg" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "BendingScheduleLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BendingSchedule_reference_key" ON "BendingSchedule"("reference");
CREATE UNIQUE INDEX "BendingSchedule_fileStorageKey_key" ON "BendingSchedule"("fileStorageKey");
CREATE INDEX "BendingSchedule_status_createdAt_idx" ON "BendingSchedule"("status", "createdAt");
CREATE INDEX "BendingSchedule_userId_idx" ON "BendingSchedule"("userId");
CREATE INDEX "BendingScheduleLine_scheduleId_position_idx" ON "BendingScheduleLine"("scheduleId", "position");

ALTER TABLE "BendingScheduleLine" ADD CONSTRAINT "BendingScheduleLine_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "BendingSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
