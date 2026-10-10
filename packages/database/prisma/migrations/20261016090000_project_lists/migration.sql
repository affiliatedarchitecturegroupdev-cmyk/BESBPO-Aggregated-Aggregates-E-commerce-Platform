-- Project lists (PROJECT_LISTS.md): materials saved against a job, by build stage.
CREATE TYPE "BuildStage" AS ENUM ('SITE_PREP', 'FOUNDATIONS', 'SLABS', 'WALLS', 'PAVING_ROADS', 'DRAINAGE', 'LANDSCAPING', 'OTHER');

CREATE TABLE "ProjectList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteName" TEXT,
    "province" TEXT,
    "neededBy" DATE,
    "notes" TEXT,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,3),
    "stage" "BuildStage" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectListItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectList_shareToken_key" ON "ProjectList"("shareToken");
CREATE INDEX "ProjectList_userId_updatedAt_idx" ON "ProjectList"("userId", "updatedAt");
CREATE UNIQUE INDEX "ProjectListItem_listId_sku_unit_key" ON "ProjectListItem"("listId", "sku", "unit");
CREATE INDEX "ProjectListItem_listId_stage_idx" ON "ProjectListItem"("listId", "stage");

ALTER TABLE "ProjectList" ADD CONSTRAINT "ProjectList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectListItem" ADD CONSTRAINT "ProjectListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ProjectList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
