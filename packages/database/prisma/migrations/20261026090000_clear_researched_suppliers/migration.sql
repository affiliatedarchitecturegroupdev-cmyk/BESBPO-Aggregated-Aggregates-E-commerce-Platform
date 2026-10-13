-- Owner decision (Oct 2026): researched supplier leads that are real sites — quarries, plants, mills,
-- merchants' branches and the operator-published NET-SUP sites — are cleared as approved partners and
-- go live. Staff switch off any that turn out unsuitable in Admin -> Suppliers.
-- Left as leads: the two "product line" rows (no single site) and the per-province "Afrimat Readymix,
-- multi-branch network" rows, whose branches are now listed one by one (NET-SUP-*).
UPDATE "SupplierLocation"
SET "isVerifiedPartner" = true,
    "isActive" = true,
    "approvedSince" = COALESCE("approvedSince", now()),
    "updatedAt" = now()
WHERE "isVerifiedPartner" = false
  AND "externalId" ~ '^(B2B|DRN|MAS|PAV|RMX|ROF|STL|TMB|NET)-SUP-[0-9]+$'
  AND "externalId" NOT IN ('B2B-SUP-004', 'B2B-SUP-009', 'RMX-SUP-002', 'RMX-SUP-003', 'RMX-SUP-004', 'RMX-SUP-005', 'RMX-SUP-006', 'RMX-SUP-007');
