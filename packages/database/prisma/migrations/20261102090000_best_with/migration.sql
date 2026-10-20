-- Best With (docs/best-with.md): co-purchase scores from paid orders, and staff pin/hide rules.
CREATE TYPE "BestWithAction" AS ENUM ('PIN', 'HIDE');

CREATE TABLE "ProductAffinity" (
    "productId" TEXT NOT NULL,
    "pairedProductId" TEXT NOT NULL,
    "orders" INTEGER NOT NULL,
    "confidence" DECIMAL(6,4) NOT NULL,
    "lift" DECIMAL(10,4) NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAffinity_pkey" PRIMARY KEY ("productId","pairedProductId")
);

CREATE TABLE "BestWithRule" (
    "productId" TEXT NOT NULL,
    "pairedProductId" TEXT NOT NULL,
    "action" "BestWithAction" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BestWithRule_pkey" PRIMARY KEY ("productId","pairedProductId")
);

CREATE INDEX "ProductAffinity_productId_confidence_idx" ON "ProductAffinity"("productId", "confidence");

ALTER TABLE "ProductAffinity" ADD CONSTRAINT "ProductAffinity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAffinity" ADD CONSTRAINT "ProductAffinity_pairedProductId_fkey" FOREIGN KEY ("pairedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BestWithRule" ADD CONSTRAINT "BestWithRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BestWithRule" ADD CONSTRAINT "BestWithRule_pairedProductId_fkey" FOREIGN KEY ("pairedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
