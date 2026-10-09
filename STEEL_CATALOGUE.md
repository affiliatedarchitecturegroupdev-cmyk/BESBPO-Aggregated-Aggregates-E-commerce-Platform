# Reinforcing & Structural Steel (CAT-15 to CAT-18) — Oct 2026 Build

> **Where it lives in this repo:** `services/pricing/data/steel_catalogue.json`
> (copied to `apps/web/src/data/steel-catalogue.json`; a pricing test fails
> if they drift), priced by `services/pricing/calculators/packaged_goods.py`
> (`load_steel`, the `STEEL` discount family) through
> `POST /calculate/packaged-goods` and `POST /calculate/order`, and listed
> at `GET /products/steel`. Database: the steel units of sale on
> `UnitOfSale`, `steelFamily` / `steelGrade` / `diameterMm` / `massKgPerM` /
> `sectionSize` on `Product`, and `weightKg` on `PackagedPriceBand`
> (migration `20261014090000_steel_catalogue`). Storefront:
> `/reinforcing-steel`, `/products?group=steel`, a product page per item
> (`SteelProductPage`) with the rebar mass calculator on bar pages.

## Decisions (owner, Oct 2026)

1. **Supply model: broker network.** The same model as aggregates and
   ready-mix — several steel merchants and mills behind the storefront, no
   owned stock (`AGENTIC_RULES.md` rule 2). The merchant network is Phase S3.
2. **Pricing: researched benchmarks.** The cement rule: a unit goes live
   only where at least two South African retailers show a regular
   (non-promo) price; list = lowest × 1.08. Everything else is quoted with
   the merchant.
3. **Cut and bend: yes.** Customers send a bar bending schedule and get a
   quote — Phase S2. Until then bar pages point to the quote form.
4. **Scope:** rebar, mesh, brickforce and fixing accessories, plus
   **structural steel** and **steel-fixing labour** (labour is Phase S3,
   through vetted partners like the other services).

## Phases

| Phase | Scope | Status |
|---|---|---|
| S1 | Catalogue (43 products), units, pricing, storefront, mass calculator, flatbed delivery | **This build** |
| S2 | Cut & bend: bar bending schedule upload or entered lines (bar mark, SANS 282 shape code, diameter, number, length) → mass totals → staff quote | **Built** (see below) |
| S3 | Steel merchant/mill network (seeded unverified, owner verifies), supplier categories CAT-15..18, steel-fixing labour via partners | After S2 |

## The catalogue

| Code | Category | Products | Live-priced units |
|---|---|---|---|
| CAT-15 | Reinforcing Bar (Rebar) | Y8–Y40 high-tensile (450 MPa), R8–R16 mild steel (250 MPa) — 12 | Y8, Y10, Y12, Y16 × 6 m |
| CAT-16 | Mesh & Brickforce | Ref 100, 193, 245, 311, 395, 617, 888 mesh; brickforce 75, 150, 230 mm — 10 | Ref 100, Ref 193 sheets; brickforce 150 mm |
| CAT-17 | Steel Fixing Accessories | Tie wire, bar chairs, cover blocks, safety caps, couplers, dowels, starter bars, wall ties, hoop iron, bender & cutter — 10 | Tie wire 5 kg coil |
| CAT-18 | Structural Steel | 40×40×3 angle, other angles, 50×50×2 square tube, other tubes, flat bar, round & square bar, IPE, H-sections, PFC channels, lipped channel, plate — 11 | 40×40×3 angle × 6 m; 50×50×2 square tube × 6 m |

**Units of sale:** 6 m length, 12 m length, tonne, sheet (6.0 × 2.4 m),
roll, coil, pack, item. A unit carries its mass where it's known (bar
lengths from the SANS 920 nominal kg/m; a 5 kg coil; a tonne) so orders
record tonnage.

**Standards used:** SANS 920 (reinforcing bar — Y 450 MPa ribbed, R 250 MPa
plain; nominal mass 0.395 to 9.865 kg/m for 8 to 40 mm), SANS 1024 (welded
mesh — the reference number is the steel area in mm² per metre width),
SANS 282 (bending dimensions and shape codes, for S2), SANS 50025
(structural steel grades S275JR/S355JR), SANS 657 (hollow sections). Mesh
wire diameters are stated only where a retailer listing gives them (Ref 100
4.0 mm, Ref 193 5.6 mm); sheet masses and pitches are left out rather than
guessed.

## Benchmarks (checked 2026-10-09; pages undated)

All prices VAT-inclusive, regular (non-promo); list = lowest × 1.08.

| Item | Retailer prices | Benchmark | List |
|---|---|---|---|
| Y8 × 6 m | Buco R52.50 (from), Build Africa R60.49 | R52.50 | R56.70 |
| Y10 × 6 m | Cashbuild R76.95, Buco R79.50, Chamberlains R88.90 | R76.95 | R83.11 |
| Y12 × 6 m | Hinterland R109.69, Cashbuild R109.95, Buco R114.11, Chamberlains R119.00 | R109.69 | R118.47 |
| Y16 × 6 m | Cashbuild R194.95, Buco R205.82, Build Africa R208.99, Hinterland R210.90, Chamberlains R225.00 | R194.95 | R210.55 |
| Ref 100 mesh | Leroy Merlin R315.00, Chamberlains R319.00, Cashbuild R384.95 | R315.00 | R340.20 |
| Ref 193 mesh | Build it DTM R519.90, Leroy Merlin R559.00 (K.Carrim R399 sale excluded) | R519.90 | R561.49 |
| Brickforce 150 mm × 2.8 mm × 20 m | Chamberlains R52.90, Leroy Merlin R52.90 regular (R49 sale excluded), Cashbuild R54.95 | R52.90 | R57.13 |
| Tie wire 1.6 mm, 5 kg | Build it DTM R179.90, K.Carrim R179.99 | R179.90 | R194.29 |
| Equal angle 40×40×3 × 6 m | Leroy Merlin R239.00, Cashbuild R239.95, Buco R255.19 | R239.00 | R258.12 |
| Square tube 50×50×2 × 6 m | Buco R460.10 (from), Chamberlains R499.00 | R460.10 | R496.91 |

**Excluded:** Build it Benoni's Y12 at R89.90 (listed mass 14 kg, not a
6 m Y12), Y20 (one retailer), Y25 and up (no retail listings), R-bar (one
retailer with conflicting prices), Ref 245 (a 2020 listing only),
safety caps and chairs (one supplier, ex-VAT, pack size unclear).

## Pricing and delivery rules

- **Discount family `STEEL`:** retail list; Contractor/Trade 4% (a
  placeholder that mirrors bagged cement — the owner to set the steel
  schedule); Volume/Civil Bulk quoted. Never below the 3% margin floor
  (`PRICING_POLICY.md`). Mirrored in `apps/web/src/lib/tier-pricing.ts`.
- **Delivery:** steel travels on the merchant's flatbed or crane truck,
  never in the tipper bands. A steel-only order has no tipper fee and
  carries a note that the slot and any delivery charge are confirmed before
  dispatch, with mill certificates on the load. Staff record the actual
  delivery cost at dispatch — the tipper standard rates are not applied to
  steel-only orders.
- **Quote-only stays quote-only:** per-tonne, 12 m, merchant-only items
  and every Volume/Civil Bulk steel order go to a person.

## Cut & bend (Phase S2)

**Customer:** `/reinforcing-steel/cut-and-bend`. A schedule is rows (typed,
or imported from `/downloads/bar-bending-schedule-template.csv` — columns in
any order, "Y12"-style sizes understood), an attached file (PDF, Excel
.xlsx, CSV, or a PNG/JPEG photo, up to 10 MB, identified by content), or
both. Each row is bar mark, member, Y/R, size, two-digit SANS 282 shape
code, number of members, bars per member and the cut length of one bar
(100–13,000 mm). Mass = bars × cut length × SANS 920 nominal kg/m — the
schedule's own cut length is used as given, so no bend allowances are
guessed. The form shows live totals by size; the API re-validates and
re-totals (`apps/api/src/cut-and-bend/bar-schedule.ts`, which a unit test
holds to the catalogue's mass table). Guests can send a schedule; signed-in
customers see it under **Account → Cut & bend** and accept or decline the
quote there (only the owner can, only while it's valid, once).

**Staff:** **Admin → Cut & bend** lists schedules by status. Each schedule
shows the rows and totals by size, downloads the rows as CSV (formulas
neutralised) and the customer's file for the merchant, and has the quote
form: total, valid-until date and what's included (shown to the customer).
Send only a price the merchant has confirmed in writing. Re-quoting replaces
the quote. Guests accept by replying to the email — staff mark those
Accepted. Admins can erase a schedule, its file and its email log (POPIA).

**Statuses:** Received → Being priced → Quoted → Accepted / Declined →
Closed. Nothing is cut or charged until the customer accepts; payment and
the delivery slot are confirmed by staff after acceptance (the same
broker model as quotes — no online payment for cut & bend yet).

## Open items

- Owner to set the steel trade discount (4% placeholder) and confirm the
  cost proxy (benchmark = cost until merchant terms are known).
- Merchant price lists for per-tonne rebar, 12 m lengths and the
  structural range — loaded only from written quotes.
- Product photos for the steel line (none yet; texture swatches show).
- S3 (merchant network, steel-fixing labour) as above.
- Cut & bend: online payment after acceptance (today staff confirm payment
  by EFT), and turning an accepted schedule into an order for Insights.
