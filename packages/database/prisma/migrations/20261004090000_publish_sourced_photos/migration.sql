-- Data-only migration (Oct 2026). Runs once, on databases that already hold
-- the imported product photos; a fresh database gets the same result from
-- the import itself (seed-product-images.ts reads the updated manifest).

-- 1. The owners of the Kimi-sourced photos have given permission: publish them.
UPDATE "ProductImage"
SET "licence" = 'CLEARED'
WHERE "importKey" IS NOT NULL
  AND "licenceName" IS NULL
  AND "licence" = 'PERMISSION_PENDING';

UPDATE "ProductImage"
SET "sourceNote" = NULLIF(
  regexp_replace("sourceNote", '\s*(—|,|;)?\s*(request written reuse permission|request permission|verify license)', '', 'g'),
  '')
WHERE "importKey" IS NOT NULL AND "licenceName" IS NULL AND "sourceNote" IS NOT NULL;

-- 2. Take down the weak Wikimedia photos (sands and limes). Sourced photos
--    replace them; silica sand gets two new Commons photos from the import.
UPDATE "ProductImage"
SET "licence" = 'REMOVED'
WHERE "importKey" IN (
  'AA-SND-01:92cbcaee3493.webp',
  'AA-SND-01:1f7563dbe6ee.webp',
  'AA-SND-02:9b291f3c82ff.webp',
  'AA-SND-02:5bf734eb72d0.webp',
  'AA-SND-07:b2081778e6a7.webp',
  'AA-SND-07:bf6f14ba0e77.webp',
  'AA-AGR-01:399f45bd1005.webp',
  'AA-AGR-02:399f45bd1005.webp'
);

-- 3. Order each product's photos: staff photography first, then sourced
--    photos, then open-licence ones, keeping the existing order within each.
UPDATE "ProductImage" AS image
SET "sortOrder" = ranked.position
FROM (
  SELECT "id",
         (ROW_NUMBER() OVER (
           PARTITION BY "productId"
           ORDER BY ("importKey" IS NOT NULL), ("licenceName" IS NOT NULL), "sortOrder", "createdAt"
         ) - 1)::int AS position
  FROM "ProductImage"
) AS ranked
WHERE image."id" = ranked."id";
