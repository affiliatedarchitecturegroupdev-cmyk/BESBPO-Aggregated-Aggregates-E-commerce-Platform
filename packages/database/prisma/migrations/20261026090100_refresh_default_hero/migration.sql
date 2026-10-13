-- The homepage hero now covers every department, not just aggregates (built-in copy in apps/web/src/lib/cms.ts).
-- A saved hero that is still the old built-in aggregates copy is removed so the new default shows;
-- hero copy staff have written themselves is left alone.
DELETE FROM "SiteContent"
WHERE "key" = 'hero'
  AND "data"->>'body' LIKE '%graded materials priced by ton, m³ or bag%';
