-- Masonry (CAT-19 Bricks & Blocks, CAT-20 Lintels, DPC & Wall Accessories — MASONRY_CATALOGUE.md):
-- bricks are sold per 1,000; masonry attributes on Product.
ALTER TYPE "UnitOfSale" ADD VALUE 'THOUSAND';

ALTER TABLE "Product" ADD COLUMN "masonryClass" TEXT,
ADD COLUMN "unitSize" TEXT,
ADD COLUMN "unitsPerM2" DECIMAL(6,2);
