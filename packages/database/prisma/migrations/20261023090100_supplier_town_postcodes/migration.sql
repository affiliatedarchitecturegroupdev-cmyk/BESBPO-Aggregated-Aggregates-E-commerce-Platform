-- Delivery points imported with a postal code at the end of the address got the postal code as their town
-- (e.g. "…, Benoni, 1502" -> "1502"). Use the part before it instead; towns staff typed are not digits-only, so they're untouched.
UPDATE "SupplierLocation"
SET "city" = btrim(regexp_replace(regexp_replace("address", '\s*,\s*\d{4}\s*$', ''), '^.*,', ''))
WHERE "city" ~ '^\d{4}$' AND "address" ~ ',';
