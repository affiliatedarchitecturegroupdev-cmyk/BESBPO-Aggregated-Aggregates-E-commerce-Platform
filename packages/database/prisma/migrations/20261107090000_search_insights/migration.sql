-- CreateEnum
CREATE TYPE "CatalogueGapSource" AS ENUM ('SEARCH', 'BOQ');

-- CreateEnum
CREATE TYPE "CatalogueGapStatus" AS ENUM ('OPEN', 'ADDED', 'IGNORED');

-- CreateTable
CREATE TABLE "SearchQueryStat" (
    "day" DATE NOT NULL,
    "query" TEXT NOT NULL,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "zeroResults" INTEGER NOT NULL DEFAULT 0,
    "lastResults" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SearchQueryStat_pkey" PRIMARY KEY ("day","query")
);

-- CreateTable
CREATE TABLE "CatalogueGap" (
    "id" TEXT NOT NULL,
    "source" "CatalogueGapSource" NOT NULL,
    "text" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastQuoteId" TEXT,
    "status" "CatalogueGapStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogueGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchSynonym" (
    "id" TEXT NOT NULL,
    "terms" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchSynonym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchandisingStat" (
    "day" DATE NOT NULL,
    "slot" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MerchandisingStat_pkey" PRIMARY KEY ("day","slot")
);

-- CreateIndex
CREATE INDEX "SearchQueryStat_day_idx" ON "SearchQueryStat"("day");

-- CreateIndex
CREATE INDEX "CatalogueGap_status_lastSeen_idx" ON "CatalogueGap"("status", "lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogueGap_source_text_key" ON "CatalogueGap"("source", "text");

-- CreateIndex
CREATE INDEX "MerchandisingStat_day_idx" ON "MerchandisingStat"("day");

