-- CreateEnum
CREATE TYPE "OperatingCostSource" AS ENUM ('MANUAL', 'IMPORT');

-- AlterEnum
ALTER TYPE "NotificationEvent" ADD VALUE 'WEEKLY_INSIGHTS';

-- AlterTable
ALTER TABLE "OperatingCost" ADD COLUMN     "reference" TEXT,
ADD COLUMN     "source" "OperatingCostSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "InsightsView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightsView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightsDigest" (
    "weekStart" DATE NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "InsightsDigest_pkey" PRIMARY KEY ("weekStart")
);

-- CreateIndex
CREATE INDEX "InsightsView_userId_idx" ON "InsightsView"("userId");

-- CreateIndex
CREATE INDEX "InsightsView_shared_idx" ON "InsightsView"("shared");

-- AddForeignKey
ALTER TABLE "InsightsView" ADD CONSTRAINT "InsightsView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

