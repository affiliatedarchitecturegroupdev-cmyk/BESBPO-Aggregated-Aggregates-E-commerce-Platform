-- The 90 mm block borrowed Cashbuild's photo of a larger hollow block. The owner supplied photos of the
-- actual slim 90 mm block (Oct 2026), imported from the seed set; take the old photo down.
UPDATE "ProductImage" SET "licence" = 'REMOVED' WHERE "importKey" = 'AA-MAS-BLOCK-90:e7da50dac234.webp';
