-- Roof & structural timber (CAT-30) and timber connectors & accessories (CAT-31), sold with roofing
-- (ROOFING_CATALOGUE.md): SA pine in S5 or S7, H2 or H3, sized or rough-sawn, in six standard lengths.
ALTER TYPE "UnitOfSale" ADD VALUE 'TIMBER_3_0M';
ALTER TYPE "UnitOfSale" ADD VALUE 'TIMBER_3_6M';
ALTER TYPE "UnitOfSale" ADD VALUE 'TIMBER_4_2M';
ALTER TYPE "UnitOfSale" ADD VALUE 'TIMBER_4_8M';
ALTER TYPE "UnitOfSale" ADD VALUE 'TIMBER_6_0M';
ALTER TYPE "UnitOfSale" ADD VALUE 'TIMBER_6_6M';

ALTER TABLE "Product" ADD COLUMN "timberGrade" TEXT,
ADD COLUMN "timberTreatment" TEXT,
ADD COLUMN "timberFinish" TEXT;
