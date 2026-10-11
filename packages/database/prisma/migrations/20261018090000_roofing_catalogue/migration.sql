-- Roofing (CAT-26 Roof Sheeting, CAT-27 Flashings, Ridges & Fixings, CAT-28 Insulation, Underlay & Rainwater —
-- ROOFING_CATALOGUE.md): roof sheets are sold in six standard lengths (anything from 1 m to 14 m is cut to length
-- on a quote, unit METRE — always quoted); roofing attributes on Product. Concrete roof tiles (CAT-29) are in the masonry line and need no change.
ALTER TYPE "UnitOfSale" ADD VALUE 'SHEET_3_0M';
ALTER TYPE "UnitOfSale" ADD VALUE 'SHEET_3_6M';
ALTER TYPE "UnitOfSale" ADD VALUE 'SHEET_4_2M';
ALTER TYPE "UnitOfSale" ADD VALUE 'SHEET_4_8M';
ALTER TYPE "UnitOfSale" ADD VALUE 'SHEET_6_0M';
ALTER TYPE "UnitOfSale" ADD VALUE 'SHEET_6_6M';
ALTER TYPE "UnitOfSale" ADD VALUE 'METRE';

ALTER TABLE "Product" ADD COLUMN "roofProfile" TEXT,
ADD COLUMN "sheetThicknessMm" DECIMAL(4,2),
ADD COLUMN "coating" TEXT,
ADD COLUMN "coverWidthMm" INTEGER;
