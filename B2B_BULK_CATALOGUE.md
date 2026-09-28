# B2B Bulk & Infrastructure Catalogue

The approved expansion of the catalogue beyond aggregates, for ready-mix,
precast, roadworks and civil buyers (September 2026). It adds two
categories sold per **packaged unit** — bag, bulk bag, tanker load, drum —
instead of by the ton/m³ bulk-density conversion the 48 aggregate SKUs use.

## Target sectors (6)

`apps/web/src/data/industries.ts` — shown at `/industries-we-serve`, on the
homepage ("Industries We Serve"), and as "Shop by industry" filters on
`/products?industry=…`:

1. Ready-Mix & Precast Concrete Manufacturers
2. Asphalt Plants, Road Surfacing & Paving Specialists
3. Industrial, Logistics Precinct & Earthworks Developers
4. Mining Infrastructure, Tailings & Environmental Remediation
5. Municipalities, SANRAL Sub-Contractors & Water Infrastructure
6. Agricultural, Commercial Farming & Landscaping Developers

## Dedup — the three-bucket rule

Every proposed SKU goes into exactly one bucket, checked against the **real
48-SKU pricing-framework catalogue** (not a sample):

**Bucket 1 — new categories (added).** Different unit-of-sale model, so new
categories with their own pricing (`PackagedPriceBand`):

| SKU | Product | Units |
|---|---|---|
| AA-CEM-425N-001 | Bulk Cement 42.5N | 50kg bag, 1.5-ton bulk bag, tanker per ton |
| AA-CEM-525N-001 | Bulk Cement 52.5N (Rapid Hardening) | 50kg bag, tanker per ton |
| AA-BND-ROADCAP-001 | Road-Capping Binder (Fly Ash / Slag Blend) | 50kg bag, tanker per ton |
| AA-GRT-NSHRINK-001 | Structural Non-Shrink Grout | 25kg bag |
| AA-ADM-ACCEL-001 | Concrete Admixture — Accelerator | 210L drum |
| AA-ADM-PLAST-001 | Concrete Admixture — Plasticizer | 210L drum |
| AA-ADM-RETARD-001 | Concrete Admixture — Retarder | 210L drum |

CAT-10 Cement & Hydraulic Binders (`cement-hydraulic-binders`) and CAT-11
Mortars, Grouts & Admixtures (`mortars-grouts-admixtures`), catalogue group
`b2b-bulk`.

**Bucket 2 — new SKUs in existing categories: none.** The delivered B2B
build proposed Silica Sand (Industrial Grade), Gabion Stone, Dump Rock /
Selected Pioneer Layer, Pipe Bedding Sand and Filter Stone, but it was
checked against a 9-product sample catalogue. Against the real workbook
they are all Bucket 3.

**Bucket 3 — already covered, not added:**

| Proposed | Already in the workbook |
|---|---|
| Silica Sand (Industrial Grade) | AA-SND-07 Silica Sand |
| Gabion Stone (100–250mm) | AA-CRR-04 Gabion Stone |
| Filter Stone (19/26.5mm washed) | AA-DRN-02 Filter Media Aggregate |
| Dump Rock / Selected Pioneer Layer | AA-CRR-03 Rip Rap / Rock Armour and AA-SBC-10 G10 Selected Fill (closest equivalents) |

Pipe Bedding Sand (SANS 1200 LB) has no workbook price and no B2B benchmark,
so it is **not** added (rule 1): bedding and filling sand (AA-SND-04,
AA-CRS-10 crusher dust) cover the application until a benchmark exists.

Catalogue after the expansion: **48 + 7 = 55 products**, **9 + 2 = 11
categories**.

## Pricing

Every figure is in `services/pricing/data/b2b_packaged_catalogue.json`,
transcribed from `Aggregated_Aggregates_B2B_Bulk_Infrastructure_Pricing.xlsx`
("Category Markup Bands") — the storefront copy
(`apps/web/src/data/b2b-packaged-catalogue.json`) must match it exactly, and
`services/pricing/tests/test_packaged_goods.py` checks both that and the
workbook formula (list = ROUND(ROUND(benchmark × cost basis) × (1 + markup))).

Only two units have a real benchmark and a price:

- 42.5N cement, 50kg bag — R113.40 (Cashbuild PPC Surebuild benchmark)
- Non-shrink grout, 25kg bag — R267.73 (SikaGrout 212 benchmark)

Every other unit is "Provisional", "Quote-only" or "BLOCKED" with a null
price. The pricing service refuses to price them (`/calculate/packaged-goods`
returns 422), orders containing them are quote-only (`PRICE_ON_REQUEST`), and
the storefront shows "Price on request" with the reason. Don't "fix" this by
inventing a number — get a supplier quote and update the workbook and JSON.

Tier discounts (8% Contractor/Trade, 15% Volume/Civil Bulk) apply to the
benchmarked units exactly as for aggregates. Delivery: bag units use the
bagged-goods rules; bulk bags, tankers, drums and totes are arranged with
the supplier and quoted (`PACKAGED_BULK_DELIVERY`).

## Supplier network

`packages/database/prisma/seed-data/suppliers-b2b-bulk.csv` — 18 cement,
binder, admixture and silica-sand producers, including Northern Cape (AfriSam
Ulco) and Free State (Sika Bloemfontein). These are **researched leads**, not
qualified partners: they import with `isVerifiedPartner = false`, inactive,
with their `source_url`, are labelled as leads on `/suppliers`, and never
count as delivery points until staff verify and activate them.
