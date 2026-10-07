# Ready-Mix Concrete Catalogue (CAT-12) — Oct 2026 Build

> **Where it lives in this repo:** `services/pricing/data/ready_mix_catalogue.json`
> (grades + pumps; copied to `apps/web/src/data/ready-mix-catalogue.json`),
> priced by `services/pricing/calculators/ready_mix.py`
> (`POST /calculate/ready-mix`, `POST /calculate/ready-mix-pump`, and ready-mix
> lines in `POST /calculate/order`). Database: `ReadyMixPriceBand`,
> `ReadyMixPumpOption`, and `strengthGradeMPa` / `mixType` / `minimumLoadM3`
> on `Product`. Storefront: `/products?category=ready-mix-concrete` and a
> product page per grade with `ReadyMixCalculator` (add to cart in m³, pump
> selector routing to a quote).
>
> **Delivery in checkout:** ready-mix travels in the plant's mixer truck, so
> it never counts towards the tipper delivery bands. A ready-mix-only cart
> carries no tipper fee; the order shows a note that the pour slot (and any
> distance surcharge) is confirmed with the plant before dispatch — staff do
> this when they confirm the order. A real slot-booking flow is still an
> open item (see below).

Documents the Ready-Mix Concrete expansion: a new product category, a new
pricing shape (`ReadyMixPriceBand`), a new supplier category
(`READY_MIX_PRODUCER`), and a real-researched 8-producer supplier network.
Companion to `CEMENT_MASTER_CATALOGUE.md` and `B2B_BULK_CATALOGUE.md` — same
build discipline (no fabricated pricing, no fabricated supplier coverage),
applied to a genuinely new product shape.

Built from two decisions the user made explicitly: (1) Aggregated
Aggregates (AA) is the storefront/distribution channel for ready-mix, and
Precast Direct (a Besbpo Group subsidiary) is one of the suppliers behind
it — not the only one; (2) because ready-mix "will hit the market as soon
as we are live," the supplier network has to be a large, multi-producer
broker network from day one, the same broker/network model the aggregates
business already uses, not a Precast-Direct-exclusive launch with broker
expansion deferred to a later phase. That second point corrects the
original scoping plan (see the published "Ready-Mix Concrete — Scoping
Plan" doc), which had framed multi-producer expansion as a later, open
decision.

## Why ready-mix needed a third pricing shape

The platform already has two pricing shapes:

- `PriceBand` — ton/m³/bag, bulk-density conversion. Fits aggregates:
  the same material is sold by weight or volume interchangeably.
- `PackagedPriceBand` — bag/bulk-bag/tanker/drum/tote. Fits cement and
  admixtures: a packaged, stockable unit with an independent list price
  per unit.

Ready-mix fits neither. It's priced per m³ (never by ton or bag), at a
real minimum load (a full mixer-truck, not a partial order — enforced by
`minimumLoadM3` on `Product` and by `calculators/ready_mix.py`'s
`BelowMinimumLoad` check), and it's perishable within roughly 90 minutes of
batching, so it's scheduled and delivered, never stocked. The product *is*
the strength grade (one SKU per MPa class), not a packaging choice — hence
`ReadyMixPriceBand` as a new, third model, one row per `Product`, same
shape discipline as `PriceBand`/`PackagedPriceBand` (a real benchmark
column, a derived list price, and a `pricingStatus` gate).

## Standards reused, not reinvented

Every grading and testing standard already existed in Precast Direct's own
site research, carried over unchanged rather than re-researched:

- **SANS 878** — ready-mixed concrete (the grading standard on every SKU
  below).
- **SANS 1083** — aggregates (shared with the existing aggregate catalogue).
- **SANS 10100-1/2** — structural use of concrete.
- **SANS 1491** — cement extenders.
- **SANS 5861/5862/5863** — sampling, slump, and compressive-strength
  testing.
- **NHBRC** — residential home-building council requirements.
- **CIDB grading** — contractor/tender eligibility.

## Pricing methodology — real benchmarks, not a fabricated number

Per `AGENTIC_RULES.md` rules 1 and 10, every priced grade traces to a real,
dated, cited source. Research (Oct 2026) found consistent per-m³ full
truck-load pricing on Ozzon.co.za, a live South African ready-mix retail
listing:

| Grade | Load | Price (incl. VAT) | Per m³ |
|---|---|---|---|
| 15 MPa | 30m³ | R29,325 | R977.50 |
| 25 MPa | 9m³ | R12,100 | R1,344.44 |
| 25 MPa (cross-check) | 12m³ | R16,300 | R1,358.33 (within 1%) |
| 30 MPa, 19mm | 10m³ | R16,675 | R1,667.50 |
| 35 MPa | 10m³ | R18,975 | R1,897.50 |

A second source (localpros.co.za, Apr 2024) cites R2,200–R3,300/m³, but for
a different scope — installed/labour pricing, not ex-works bulk supply —
so it's recorded as a cross-check note, not blended into the benchmark.

**List price = benchmark + an 8% AA storefront/logistics margin**, not a
blind copy of the benchmark and not a cost-plus figure built on an assumed
cost base we don't actually have. AA doesn't own batching plants or
mixer-trucks; the network suppliers (Precast Direct and the researched
third-party producers) already price near this real market rate at the
plant gate, so AA's own margin sits on top of that, as a storefront/
scheduling/logistics commission, rather than assuming a wholesale discount
off a retail number we have no evidence AA can actually source at. The 8%
figure is a planning placeholder, not a negotiated rate — **replacing it
with Precast Direct's and each broker supplier's real wholesale terms is
the single biggest open item before this goes live** (see Open Items).

No grade is interpolated. 10 MPa, 20 MPa, and 40 MPa have no retail
benchmark and are explicitly **not** estimated from the benchmarked grades
around them:

- **10 MPa / 20 MPa** — `Provisional — confirm w/ supplier`. Commodity/
  mid-range grades plausibly available off-the-shelf, but no benchmark was
  found specifically for them.
- **40 MPa** — `Quote-only — no retail benchmark`. High-strength grades
  above 35 MPa are overwhelmingly project-specified, not retail.

Both "both models add to quote and add to cart" — the add-to-cart flow is
live for the 4 benchmarked grades (15/25/30/35 MPa); the other 3 route to
the RFQ quote flow via the same `pricingStatus` gate every other catalogue
uses (`ReadyMixCalculator.tsx`'s "Request a Quote" fallback,
`calculators/ready_mix.py`'s `PricingNotAvailable`).

## The supplier network — 8 real, named producers, 6 provinces

Mirrors the aggregates/B2B-bulk precedent: real, named, sourced companies,
not invented coverage. `seed-data/suppliers-ready-mix.csv` (13 rows: one
company can have several provincial rows):

| Supplier | Province(s) | Role |
|---|---|---|
| **Precast Direct** (Besbpo Group) | KZN (Plant 1 live; Gauteng Plant 2 planned, not yet seeded) | `isGroupEntity: true` — intercompany, AA's supplier of record, not an arm's-length broker partner |
| Afrimat Readymix | Gauteng, KZN, Eastern Cape, Limpopo, Mpumalanga, Western Cape | Genuinely national, multi-branch |
| BergMix | KZN (Midlands — Winterton/Kranskop/Ladysmith/New Hanover corridor, 5 plants) | Regional |
| Cretemix | KZN (Durban area — New Germany/Waterfall/Cato Ridge +1, 4 plants) | Regional |
| Scribante Concrete | Eastern Cape (HQ Gqeberha, mobile plants nationwide) | Regional + mobile |
| All For One Ready Mix Concrete | Gauteng (Pretoria), reach into Limpopo/Zimbabwe | Volumetric/mobile batching — pay-for-what-you-use, distinct from fixed-plant batching |
| Coastal Readymix | Western Cape (Kuils River, 50km radius of Cape Town) | Regional |
| Ciolli Readymix | Western Cape (Milnerton/CBD/Philippi/Faure, 4 plants, 10–80 MPa) | Regional |

**Documented gap**: Free State, North West, and Northern Cape have no
confirmed ready-mix supplier yet. This is stated plainly rather than
papered over with an invented entry — the same honesty standard the
104 + 18-supplier aggregate/B2B-bulk network was built to.

**Overlap note**: Afrimat is already a cement-catalogue brand
(`cement-hydraulic-binders`, `AA-CEM-*` SKUs). This is the same company in
a different business line (ready-mix batching vs. bagged/bulk cement
manufacturing), not a duplicate supplier record — it gets its own
`READY_MIX_PRODUCER` rows, same as Afrimat already has `CEMENT_BINDER`
sourcing elsewhere in the network.

**Verification status**: only Precast Direct is a confirmed, onboarded
supplier (`isVerifiedPartner: true`). The 7 third-party producers are
researched leads — real, named, sourced companies, but not yet contacted
or commercially qualified (`isVerifiedPartner: false`), identical to how
the B2B Bulk & Infrastructure network's researched leads were seeded.

## Related: Precast Direct's other product line

Precast Direct also produces precast concrete products (culverts,
manholes, kerbing, paving blocks, panels, poles — 24–28 day cure,
catalog/inventory business, not scheduled/perishable like ready-mix). This
is a genuinely different product shape again (stocked units, not m³ pours)
and is **out of scope for this build** — noted here as a related,
not-yet-scoped opportunity for a future catalogue expansion, not
something to force into CAT-12's ready-mix shape.

## Discounts and the margin floor

Approved Oct 2026: ready-mix **retail = list; Contractor/Trade up to 2%; Volume/Civil
Bulk = RFQ only**, and no discount can ever push the price below the SKU's floor
(cost × 1.03). The previous flat 8%/15% tiers lost money on ready-mix. Full rules:
`PRICING_POLICY.md`.

## Pump options (priced separately)

A pump is a **service**, not a per-m³ material, so it is a separate add-on that never
changes the concrete price (`ReadyMixPumpOption` model; `ReadyMixCalculator` pump
selector; pricing-service `GET /products/ready-mix/pumps` and
`POST /calculate/ready-mix-pump`). Options: static/line pump (70 m³/h) and boom pumps
32 m (90 m³/h), 36 m (120 m³/h), 43 m (120 m³/h) — capacities as published by Foxcrete.

**No public South African pump price list exists.** Foxcrete, GC&G, Scribante, Cretemix,
Afrimat and Ozzon publish none ("contact for rates"; Ozzon sells mix only). The only rand
figures found were an unverified generic claim (transtech.co.za, R1,800–R3,500/h line,
R3,500–R7,500/h boom, 3–5 h minimums, no date/location/VAT) — recorded as indicative only.
So every pump is seeded **Quote-only with null prices**; the customer selects a pump and
is routed to RFQ for it, while the concrete is still priced and added to cart. When written
quotes are loaded (`callOutFee`, `ratePerM3`; distance and washout handled in the quote) and
`pricingStatus` is set to "Ready — benchmarked", the calculator prices the pump automatically.
Next step: written quotes from Foxcrete (Gauteng) and GC&G (KZN); Cretemix/Scribante quote
mix and pump together.

## Open items

- **Real wholesale/network pricing terms** — the 8% storefront margin is a
  placeholder. Needs Precast Direct's and each broker supplier's actual
  ex-works cost and commission terms before this goes live.
- **Pump rates** — need written supplier quotes (see Pump options).
- **10 MPa / 20 MPa / 40 MPa benchmarks** — still no retail price found;
  do not interpolate from the benchmarked grades.
- **Minimum-load and delivery-radius specifics per plant** — the
  `minimumLoadM3` values here are drawn from the Ozzon.co.za load sizes
  that produced each benchmark, not each individual plant's actual
  minimum order policy.
- **Dispatch/scheduling system** — ready-mix's 90-minute perishability
  window means checkout needs a real delivery-slot booking flow, not just
  the delivery-estimator built for aggregates/cement. Not built in this
  pass.
- **Free State / North West / Northern Cape** — no ready-mix supplier
  identified yet for these three provinces.
- **Precast Direct Gauteng (Plant 2)** — planned, not live; add to
  `suppliers-ready-mix.csv` once it's operational.
