# Bricks, Blocks & Walling (CAT-19, CAT-20) — Phase W, Oct 2026

> **Where it lives in this repo:** `services/pricing/data/masonry_catalogue.json`
> (copied to `apps/web/src/data/masonry-catalogue.json`; a pricing test fails
> if they drift), priced by `services/pricing/calculators/packaged_goods.py`
> (`load_masonry`, the `MASONRY` family) through
> `POST /calculate/packaged-goods` and `POST /calculate/order`, and listed at
> `GET /products/masonry`. Database: the `THOUSAND` unit of sale and
> `masonryClass` / `unitSize` / `unitsPerM2` on `Product` (migration
> `20261017090000_masonry_catalogue`). Storefront: `/bricks-blocks` (with the
> wall calculator), `/products?group=masonry`, a product page per item
> (`MasonryProductPage`), page three of Shop by Category, and the Walls stage
> of Shop by Build Stage.

## Decisions (owner, Oct 2026)

1. **All seven new categories are in scope** (CAT-19..25); this is the first
   phase, Walls. Paving (CAT-21/22) and Drainage (CAT-23..25) follow.
2. **Supply model: broker network** — brickyards, block makers and
   merchants behind the storefront, no owned stock.
3. **Pricing: researched benchmarks** — the cement and steel rule.
4. **Trade discount:** the `MASONRY` family is set to the steel shape —
   retail list, Contractor/Trade 4%, Volume/Civil Bulk quoted — as a
   **proposal awaiting the owner's approval**. Never below the 3% margin
   floor.

## The catalogue (21 products, 7 priced units)

| Code | Category | Products | Live-priced units |
|---|---|---|---|
| CAT-19 | Bricks & Blocks | Clay stock (NFP), clay face FBS and FBX, clay maxi, cement imperial stock, cement maxi, 90 mm block, 140 and 190 mm hollow blocks — 9 | Clay stock and cement imperial per 1,000; 90 mm and 140 mm blocks each |
| CAT-20 | Lintels, DPC & Wall Accessories | Prestressed lintels 1.2, 1.5, 1.8, 2.4, 3.0, 3.6 m; DPC 375 µm 110/150/225/300 mm × 40 m; concrete and PVC air bricks — 12 | DPC 110 and 225 mm; concrete air brick |

**Units of sale:** bricks per 1,000 (the trade unit; the product page also
shows the price per brick); blocks, lintels and air bricks per item; DPC per
40 m roll.

**Standards:** SANS 227 (burnt clay masonry units — NFP, FBS, FBX classes),
SANS 1215 (concrete masonry units), SANS 952 (polyolefin damp-proof course).
Strength (7 or 14 MPa) depends on the maker and isn't stated where the
listing doesn't give it.

**Units per m²** (wall calculator): one leaf with 10 mm joints, from the
unit's face size — imperial brick (222 × 73) 52, maxi (290 × 90) 33, block
(390 × 190) 12.5. The calculator adds a 5% breakage allowance and rounds
bricks up to the next 1,000. No mortar quantities are estimated.

## Benchmarks (checked 2026-10-10)

All prices VAT-inclusive, regular (non-promo); list = lowest × 1.08.

| Item | Retailer prices | Benchmark | List |
|---|---|---|---|
| Clay stock brick (NFP) | Cashbuild R2.37 (+R0.15 handling, excluded), Buco R2.68 | R2.37 / brick | **R2,559.60 / 1,000** |
| Cement imperial stock brick | Buco R3.22 (14 MPa), Cashbuild R3.22 (7 MPa) | R3.22 / brick | **R3,477.60 / 1,000** |
| Concrete block 390 × 90 × 190 | Buco R10.12 (7 MPa), Cashbuild R15.32 | R10.12 | **R10.93** |
| Hollow block 390 × 140 × 190 | Builders R10.85 (M140), Builders R11.00 (MA140, 7 MPa), Buco R14.42, Cashbuild R15.60 | R10.85 | **R11.72** |
| DPC 375 µm 110 mm × 40 m | Chamberlains R76.90 regular (R64.90 special excluded), Cashbuild R119.95 | R76.90 | **R83.05** |
| DPC 375 µm 225 mm × 40 m | Leroy Merlin R159.00, Chamberlains R160.00 regular (R139 special excluded), Buco R164.97, Cashbuild R239.95 | R159.00 | **R171.72** |
| Concrete air brick, grey | Chamberlains R29.59, Leroy Merlin R29.60, Buco R31.65 | R29.59 | **R31.96** |

**How they were checked:** the build environment could not open retailer
pages directly this time (network policy), so these prices were read from
retailer-domain search listings, which name the retailer's own product
page. Every row has at least two retailers for the same product; confirm
them on the pages before relying on them, as with any undated listing.

**Quoted, and why:** face bricks (price depends on the range and yard);
cement maxi (listings conflict, R3.85 to R9.95 for the same size); clay maxi
and 190 mm blocks (one retailer only); lintels (retail sections and prices
differ too much to compare like for like); DPC 150 and 300 mm (listings not
clear enough); PVC air brick (one retailer).

## Delivery

Bricks, blocks and lintels travel palletised on the supplier's flatbed or
crane truck — never in the tipper bands. A masonry-only order (or masonry
with steel) has no tipper fee and carries a note that the slot, any delivery
charge and the yard's minimum load are confirmed before dispatch; staff
record the actual delivery cost at dispatch.

## Supplier leads

`packages/database/prisma/seed-data/suppliers-masonry.csv` — 14 researched
leads, seeded **unverified and inactive** (Admin → Suppliers), each citing
its source; no coordinates or phone numbers were added. Supplier CSVs now
accept CAT-19 and CAT-20.

| Province | Leads |
|---|---|
| Gauteng | Corobrik Kwastina (Driefontein) and Rietvlei factories; Brikor (Nigel); Steinworks (West Rand); Brick 'n Tile Brokers (Centurion) |
| KwaZulu-Natal | Corobrik concrete operations (Durban) |
| North West / Mpumalanga | Kopano Brickworks (Stilfontein; Taai factory) |
| Eastern Cape | Makana Brick (Makhanda); Addo Bricks (Gqeberha); Dukathole |
| Western Cape | Klay; Stumbelbloc (Milnerton) |
| Northern Cape | Uuka Bricks (Kimberley) — waste-based bricks; confirm SANS compliance first |

**Gaps:** no named brickyard was found for the **Free State** or
**Limpopo** — local yards there need to be found by phone or referral.
Bosun (Midrand, Brits, Gqeberha) makes pavers, kerbs and retaining blocks —
a Phase P (paving) lead rather than a walling one.

## Open items

- Approve (or change) the 4% Contractor/Trade discount on masonry.
- Verify and activate the brickyard leads; add map pins; find Free State and
  Limpopo yards.
- Brickyard price lists for face bricks, maxis, 190 mm blocks and lintels —
  loaded only from written quotes.
- Unit masses (for delivery tonnage) once suppliers confirm them.
- Product photos for the line (texture swatches show until licensed photos
  exist).
