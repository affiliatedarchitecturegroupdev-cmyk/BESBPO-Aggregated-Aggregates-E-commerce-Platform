# Cement Master Catalogue — Oct 2026 Expansion

> **Where it lives in this repo:** `services/pricing/data/b2b_packaged_catalogue.json`
> (copied to `apps/web/src/data/b2b-packaged-catalogue.json`; a test fails if
> they drift) — 38 cement products with 92 pack-size bands, plus the 4
> mortar/grout/admixture records. The taxonomy attributes (`manufacturer`,
> `brand`, `cement_family`, `cement_class`, `cement_type`, `region_note`,
> `specialist_characteristics`) are columns on `Product` (migration
> `20261007090000_cement_ready_mix`) and show on each product page; the
> cement listing filters by type and brand. Discounts: `PRICING_POLICY.md`.

Documents the cement-catalogue expansion built from Fortune's ChatGPT
taxonomy session ("I want you to continue from here and build the products
catalogue for cement... including how data should be structured but in
accordance with our models"). Companion to `B2B_BULK_CATALOGUE.md` (which
created the `cement-hydraulic-binders` category in the first place) — this
document covers what now lives *inside* that category.

## Source material

The ChatGPT session produced a taxonomy (not a finished SKU list): a
7-family category tree, a 9-brand national manufacturer universe, and an
explicit instruction *not* to force "8 brands × every strength class" —
several strength classes (52,5R, Masonry, Road Stabilisation) are
genuinely narrower markets than others (32,5N/42,5N), and padding them with
invented SKUs would make the catalogue look bigger while being less
accurate. The source material's own recommended next step was "the actual
SKU Master, with roughly 50–80 catalogue records."

## How the 7-family tree maps onto our existing data model

The source taxonomy proposes 7 cement families as if they were separate
catalogue sections. Our platform's existing category model is **flat with
many SKUs per category** — Crushed Stone holds 6mm through 75mm gradings as
different *products* under one category, not one category per grading.
Cement follows the same pattern already established for every other
category, rather than introducing category hierarchy (the `Category` model
has no parent/child relation) just for this one catalogue:

- All cement SKUs stay on the single existing `cement-hydraulic-binders`
  category.
- The 7-family tree becomes **product-level attributes** instead:
  `manufacturer`, `brand`, `cementFamily`, `cementClass`, `cementType`,
  `regionNote`, `specialistCharacteristics` — all new, all optional/
  nullable, so the three pre-existing CAT-10 sample records need no schema
  migration to keep working.
- **Specialist Performance Cement** and **Bulk Cement** — the taxonomy's
  families F and G... *(see below)* — are **not** duplicate product rows.
  The source material's own tables for these two families just re-list
  products already named under General Purpose / High Strength / Precast
  (e.g. "AfriSam All Purpose Cement" appears in both the 42,5N table *and*
  the Specialist Performance table). Duplicating those as second SKUs would
  violate `AGENTIC_RULES.md` rule 9's dedup discipline. Instead:
  - Specialist characteristics (reduced heat of hydration, high
    performance, etc.) are tagged via `specialistCharacteristics: string[]`
    on the one real SKU row.
  - Bulk is a **supply format**, not a brand or product line — exactly as
    the source material itself concludes ("the underlying product should
    retain its strength classification... rather than creating a separate
    Bulk Brand"). It's implemented as a `BULK_TANKER_PER_TON` /
    `BULK_BAG_1_5T` `PackagedUnitBand` on the relevant SKU, which is the
    same mechanism the platform already used for the original 3 CAT-10
    sample records.

## Pricing tiers — this already existed

The source material recommends three pricing tiers: **Retail**,
**Trade/Contractor**, and **Bulk/Project**, "rather than one arbitrary
cement price." Our platform's `CustomerTier` model already implements
exactly this: `RETAIL` / `CONTRACTOR_TRADE` / `VOLUME_CIVIL_BULK`, with
tier-based discounting and the `VOLUME_CIVIL_BULK` tier already routing to
the RFQ flow rather than a live checkout price (`AGENTIC_RULES.md` rule 3).
No new tiering model was needed — the recommended 3-tier structure is a
confirmed platform decision from Phase 3, not a cement-specific gap.

## Pricing status — no fabricated numbers

Per `AGENTIC_RULES.md` rules 1 and 10, **no new rand figure was invented**
for this expansion. Only one real benchmark exists in the whole cement
catalogue (PPC Surebuild 42,5N, 50kg bag, Cashbuild, Sep 2026 — unchanged
from the original build). Every one of the 34 new SKUs is gated:

- **`Provisional — confirm w/ supplier`** — commodity bagged cement
  (32,5N/R, 42,5N, Masonry 22,5X) plausibly sold through builders'
  merchants, but with no benchmark actually captured for that specific
  brand/SKU yet.
- **`Quote-only — no retail benchmark`** — performance/specialist cement
  (42,5R, 52,5N, 52,5R, Road Stabilisation, Precast) that the source
  material itself identifies as project- or contractor-specified rather
  than bagged retail.

The storefront never shows a price for these — only "Request a Quote,"
exactly as it already does for the three original CAT-10 records.

## Update (Oct 2026): live pricing and discount rules

Cement research (retailers: Cashbuild, BUCO, Chamberlains, Leroy Merlin, Buildmate; fetched
2026-10-06, pages undated) lets **9 bagged SKUs go live as add-to-cart**, each priced at
the lowest regular (non-promo) 50 kg price across ≥2 retailers × 1.08:

| SKU | Benchmark | List (50 kg) |
|---|---|---|
| PPC SureBuild 42.5N (`AA-CEM-425N-001`) | R126.00 | R136.08 |
| AfriSam StarBuild 32,5N | R89.42 | R96.57 |
| Cemza GP 32,5N | R106.47 | R114.99 |
| Sephaku 32 | R106.39 | R114.90 |
| KWIKBUILD 32.5N | R99.30 | R107.24 |
| AfriSam All Purpose 42,5N | R129.75 | R140.13 |
| Sephaku 42 | R118.62 | R128.11 |
| Cemza All Purpose 42,5N | R126.55 | R136.67 |
| Afrimat Buildcrete | R109.86 | R118.65 |

(The original 42.5N list moves from R113.40 to R136.08 under this rule.) Caveats: Cashbuild
prices are the Upington store (remote, likely high); BUCO shows "from" prices; no promo
flags on Cashbuild/BUCO; no pallet, 25 kg, bulk-bag or tanker benchmark was found, so those
units stay Provisional/RFQ. Single-source SKUs (e.g. PPC SureCem 32,5N, KWIKBUILD 42.5N,
Dugongo, DuraBuild, SureTech) stay Provisional. Mortars/grouts/admixtures: grout keeps its
existing workbook price; admixtures remain BLOCKED.

Discounts: bagged cement and mortar trade **4%** (range 3–5%); bulk bag/tanker trade and
all cement **volume = RFQ only**; floor-capped — see `PRICING_POLICY.md`.

## Dedup reasoning — what was deliberately NOT added

Following the source material's own caution against inventing SKUs to pad
a category:

- **52,5R "other producers"** — the source material explicitly says not to
  invent fictitious bagged 52,5R SKUs. AfriSam Rapid Hard Cement (RHC) is
  catalogued; "other approved producers" route through the existing RFQ
  flow, not a placeholder product row.
- **Regional/private-label Masonry Cement** — the source material says to
  add these "only where the actual manufacturer and certification can be
  established." None was verified, so none was added; the category
  description can point interested private-label suppliers to the RFQ
  flow instead.
- **NPC "cement stabilisation solutions"** — explicitly "project-specific"
  in the source material with no named product. Not catalogued as a SKU.
- **AfriSam HSC** — catalogued as **one** SKU with `cementClass: "42,5R
  (northern region) / 52,5N (southern region)"` and a `regionNote`, per the
  source material's own instruction that region should be a product
  attribute, "rather than blindly presenting it as one nationally
  identical SKU" or as two separate SKUs.
- **NPC Newcastle / Durban / Simuma Portland-Limestone** — each is one SKU
  with a combined class string (e.g. `"32,5R / 42,5R (plant-certified
  range)"`) rather than two duplicate rows, since the source material lists
  the same named plant product under both strength tables.

## Record count

34 new `Product` rows + 85 new `PackagedPriceBand` child records (plus the
3 pre-existing cement records' 7 bands = 37 products / 92 bands total).
The source material's "50–80 catalogue records" estimate was written
against a flat SKU-Master spreadsheet shape (one row per SKU **and** pack
size). Our relational model normalizes that into `Product` (one row per
named manufacturer product) + `PackagedPriceBand` (one child row per pack
size/supply format) — the same ~50–80 records, correctly structured as
parent/child instead of a flat sheet.

## What's explicitly out of scope here

- **Real pricing** for any of the 34 new SKUs — needs actual supplier
  quotes, same open item as the rest of CAT-10/11 (see `AGENTIC_RULES.md`'s
  "Open items").
- **Manufacturer technical datasheet URLs / official product imagery** —
  the source material's SKU Master template has a "Technical Datasheet"
  and "Image Required" column; no datasheet URL was fabricated for any
  product, consistent with not inventing provenance that isn't verified.
  **Update (Oct 2026):** the owner supplied official pack shots for AfriSam,
  Cemza, NPC, Sephaku and PPC (see `PRODUCT_IMAGES.md`) and PPC's datasheets
  for SURECEM, SUREBUILD, SURECAST, SURETECH and SUREROAD. The datasheets are
  downloadable on those product pages (`apps/web/public/downloads/datasheets`,
  `DATASHEETS` in `apps/web/src/data/packaged.ts`), and those five products'
  standard, CEM designation, uses and storage notes now follow them.
  AA-CEM-425N-001 is PPC SUREBUILD 42,5N and is now named that way.
  Kwikbuild's 2020 material safety data sheets are linked on KWIKBUILD 32.5N
  and 42.5N; they give the CEM designations (32,5 N: CEM V/B (S-V);
  42,5 N: CEM II/B-M — previously listed in error as CEM V/A).
  Afrimat's technical data sheets (FastCast, Powercrete Plus, RoadCem,
  BuildCrete, DuraBuild) are linked on those products. From them: FastCast
  is CEM I 52,5R and Powercrete Plus CEM II/A-V 52,5N (previously only
  "Specialist"); pack sizes now follow the sheets — FastCast and DuraBuild
  50 kg bags only, Powercrete Plus adds 25 kg and 50 kg bags (quote-only
  until benchmarked).
  Mamba's material safety data sheet (Jan 2024) lists CEM I 52,5N, CEM II/A-M
  42,5R and MC 22,5X — no 42,5N — so AA-CEM-MAMBA-425N is now "Mamba Cement
  42,5R" (CEM II/A-M; slug mamba-cement-42-5r; SKU unchanged), and Mamba
  Masonry Cement MC 22,5X (AA-CEM-MAMBA-MASONRY-225X, 50 kg, quote-only) was
  added: 38 cement products. CEM I 52,5N isn't listed yet (no pack shot).
  Dugongo and Dangote Falcon pack shots (Oct 2026) — no datasheets yet, so
  the bag text is the source: Dugongo is Portland-limestone cement
  CEM II/A-L 42,5N (SANS 50197-1 / NM NP EN 197-1), made by Moçambique
  Dugongo Cimentos S.A. in Maputo province; Dangote Falcon is a pozzolanic
  cement 32,5R, SABS approved, now named "Dangote Falcon 32,5R" (slug
  unchanged). Both were previously listed only as "variants".
- **Ready-Mix Concrete** — a separate idea raised in the same conversation,
  intentionally not folded into this cement work. See the discussion in
  that thread — it's a different sourcing model (producers, not
  manufacturers/brokered aggregate-style supply) and a different product
  (a perishable, batch-mixed product, not a shelf-stable packaged good),
  so it deserves its own scoping pass rather than being bolted onto the
  cement data shape.
