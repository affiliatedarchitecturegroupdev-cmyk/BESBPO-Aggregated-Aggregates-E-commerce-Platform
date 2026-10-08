-- Data-only migration (Oct 2026). The 14 cement pack shots were first
-- deployed while still awaiting permission, so the import attached them as
-- PERMISSION_PENDING; the import is create-only, so the later manifest change
-- ("permission": "GRANTED") didn't reach those rows. AfriSam, Cemza and NPC
-- have given permission: publish their photos. A fresh database gets the
-- same result from the import itself.
UPDATE "ProductImage"
SET "licence" = 'CLEARED',
    "sourceNote" = replace("sourceNote", 'awaiting the manufacturer''s written permission.', 'permission confirmed Oct 2026 (established supplier relationship).')
WHERE "importKey" LIKE 'AA-CEM-%'
  AND "licence" = 'PERMISSION_PENDING'
  AND "sourceName" IN ('AfriSam (afrisam.co.za)', 'Cemza (cemza.co)', 'NPC - Natal Portland Cement (npc.co.za)');
