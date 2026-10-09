-- Reinforcing & structural steel (CAT-15..18, STEEL_CATALOGUE.md): steel units of sale,
-- steel attributes on Product, and a per-unit mass on PackagedPriceBand.
ALTER TYPE "UnitOfSale" ADD VALUE 'LENGTH_6M';
ALTER TYPE "UnitOfSale" ADD VALUE 'LENGTH_12M';
ALTER TYPE "UnitOfSale" ADD VALUE 'TONNE';
ALTER TYPE "UnitOfSale" ADD VALUE 'SHEET';
ALTER TYPE "UnitOfSale" ADD VALUE 'ROLL';
ALTER TYPE "UnitOfSale" ADD VALUE 'COIL';
ALTER TYPE "UnitOfSale" ADD VALUE 'PACK';
ALTER TYPE "UnitOfSale" ADD VALUE 'EACH';

ALTER TABLE "Product" ADD COLUMN "steelFamily" TEXT,
ADD COLUMN "steelGrade" TEXT,
ADD COLUMN "diameterMm" INTEGER,
ADD COLUMN "massKgPerM" DECIMAL(7,3),
ADD COLUMN "sectionSize" TEXT;

ALTER TABLE "PackagedPriceBand" ADD COLUMN "weightKg" DECIMAL(10,3);
