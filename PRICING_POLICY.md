# Pricing & Discount Policy — floor-based tiers (approved Oct 2026)

Applies to every catalogue. Implemented once in the pricing service
(`services/pricing/calculators/discount_floor.py`) and mirrored for the
storefront's live estimates in `apps/web/src/lib/tier-pricing.ts`. Checkout
and quotes are always re-priced by the pricing service.

## List price

- **Aggregates:** the pricing framework workbook — category base cost ×
  (1 + category markup): Sub-base 18%, Crushed stone 25%, Sand 28%, Crusher
  run 18%, Ballast 22%, Drainage 30%, Decorative 55%, Ag lime 35%, Recycled
  15%. The three B2B additions (Dump Rock, Pipe Bedding Sand, Filter Stone)
  use their category's band — no product-specific price.
- **Cement:** lowest regular (non-promo) retail price across at least two
  retailers × 1.08 (the 8% AA storefront markup). One retailer only → stays
  "Provisional — confirm w/ supplier" and goes to a quote.
- **Ready-mix:** a dated retail benchmark per strength grade × 1.08.
- **Steel (Oct 2026):** the cement rule — lowest regular VAT-inclusive
  retail price across at least two retailers × 1.08, per stock length,
  sheet, roll or coil. Per-tonne, 12 m and merchant-only items are quoted
  (`STEEL_CATALOGUE.md`).
- **Masonry & precast (Oct 2026):** the same rule for bricks (per 1,000,
  from the per-brick price), blocks, DPC rolls, air bricks, pavers, paving
  slabs, uPVC pipe (per 6 m length), fittings, DPM and landscape fabric.
  Face bricks, maxis, 190 mm blocks, lintels, kerbs, retaining blocks,
  gabions and all precast drainage are quoted (`MASONRY_CATALOGUE.md`).
  Concrete roof tiles (CAT-29) follow the same rule, per tile.
- **Roofing (Oct 2026):** the same rule, compared per metre for roof sheets
  of the same profile, thickness and coating class: a stock length is the
  lowest per-metre price × its length, × 1.08. Cut-to-length is always
  quoted; so are single-retailer items, flashings and fixings
  (`ROOFING_CATALOGUE.md`).
- **Roof & structural timber (Oct 2026):** the roofing rule, compared per
  metre, for the same section, stress grade (S5/S7), hazard class (H2/H3)
  and profile. Retail "CCA treated" structural pine counts as H2 (owner,
  12 Oct 2026). Live: S5 H2 sized 38 × 76, 38 × 114 and 38 × 228 mm;
  everything else quoted (`ROOFING_CATALOGUE.md`).
- **Building supplies (Oct 2026):** the same two-retailer rule, per item,
  board, roll or pack, for the same make and size — or, for commodity items
  (steel windows by SANS 727 code, galvanised wire by gauge and mass, PVC
  ceiling boards by size and finish), the same specification. Promotions
  are excluded. Where only one retailer lists a product, the makes differ, or
  a listing doesn't state the size, it is quoted
  (`BUILDING_SUPPLIES_CATALOGUE.md`).
- **Quote-only products, re-checked (Oct 2026 onwards):** the same rule,
  applied from dated evidence files by `scripts/catalogue/apply_benchmarks.py`,
  which refuses fewer than two retailers or a promotional price
  (`docs/pricing/BENCHMARKS.md`).
- **Cost proxy:** for cement, ready-mix, steel, masonry, roofing and building supplies the cost is assumed to be the
  benchmark itself (`costBasisPercent` 100) until real supplier
  cost/commission terms are known — the biggest open commercial item.

## Internal pricing research stays internal

Competitor names, their prices, benchmark notes (`source_note`,
`market_benchmark_price`, `benchmark_sources`), cost bases and markups are for
planning and the sales team only. They live in the pricing service's catalogues
(`services/pricing/data/`), which is a private service, and never on the public
site:

- The storefront's copies under `apps/web/src/data/` are generated without those
  fields by `python3 scripts/public-catalogues.py` — run it after changing a
  pricing catalogue, never copy the files by hand.
- `POST /orders/price` (public) returns only the customer-facing line fields;
  costs and notes are dropped.
- Unpriced items show "Price on request" or "Quoted per order", never the
  internal status text.
- `apps/api/src/pricing/public-catalogues.spec.ts` fails if a private field or a
  retailer's name reaches the web copies.

## Discount schedule

| Family | Retail | Contractor / Trade | Volume / Civil Bulk |
|---|---|---|---|
| Aggregates | list | 8% | 15%, floor-capped (≥10m³ still quoted) |
| Cement & mortar — bagged (25/50kg) | list | 4% (approved range 3–5%) | quoted |
| Cement — bulk bag, tanker; admixture drums/totes | list | quoted | quoted |
| Ready-mix | list | 2% | quoted |
| Steel (rebar, mesh, brickforce, accessories, sections) | list | 4% (approved Oct 2026) | quoted |
| Masonry & precast (bricks, blocks, lintels, DPC, air bricks; pavers, kerbs, retaining, gabions; pipes, precast drainage, membranes; concrete roof tiles) | list | 4% (approved Oct 2026) | quoted |
| Roofing (sheeting, flashings, fixings, insulation, underlay, rainwater goods; roof & structural timber and connectors) | list | 4% (approved Oct 2026; timber 12 Oct 2026) | quoted |
| Building supplies (doors & windows, fencing & security, water & plumbing, ceilings & drywall, tools & PPE, waterproofing & paint) | list | 4% (set 17 Oct 2026 under the owner's directive — for review) | quoted |

"Quoted" means the tier has no self-serve price for that family: the cart
or quote goes to a person, who confirms it with the supplier.

## The floor

```
cost  = list / (1 + markup)
floor = cost × 1.03              # minimum margin — a planning value, finance to confirm
tier price = max(list × (1 − tier discount), floor)
```

No discount can take a price below the floor, so the platform never
self-serves a loss. In practice:

- Sub-base and crusher run (18% markup) get at most ~12.7% at the Volume
  tier, recycled aggregates (15%) ~10.4%; everything else keeps the full 15%.
- At the 8% storefront markup the floor sits ~4.6% under list, so cement's
  4%, steel's 4% and ready-mix's 2% always pass.

The workbook's own flat tier prices are still reconciled to the cent
(`tests/test_reconcile_workbook.py`); the test also checks that the price a
customer actually pays is the workbook's price or, where that would break
the floor, the floor.

## Open items

- The 3% minimum margin is an assumption — finance to confirm. Card/gateway
  fees (~3%) are not netted off yet.
- Replace the benchmark-as-cost proxy with real supplier terms (cement,
  ready-mix).
- Ready-mix benchmarks are VAT-inclusive retail listings; the storefront
  treats prices as VAT-exclusive until a VAT number is configured. Finance to
  confirm the basis before launch.
