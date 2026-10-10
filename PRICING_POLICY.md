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
  from the per-brick price), blocks, DPC rolls, air bricks, pavers and
  paving slabs. Face bricks, maxis, 190 mm blocks, lintels, kerbs,
  retaining blocks and gabions are quoted (`MASONRY_CATALOGUE.md`).
- **Cost proxy:** for cement, ready-mix, steel and masonry the cost is assumed to be the
  benchmark itself (`costBasisPercent` 100) until real supplier
  cost/commission terms are known — the biggest open commercial item.

## Discount schedule

| Family | Retail | Contractor / Trade | Volume / Civil Bulk |
|---|---|---|---|
| Aggregates | list | 8% | 15%, floor-capped (≥10m³ still quoted) |
| Cement & mortar — bagged (25/50kg) | list | 4% (approved range 3–5%) | quoted |
| Cement — bulk bag, tanker; admixture drums/totes | list | quoted | quoted |
| Ready-mix | list | 2% | quoted |
| Steel (rebar, mesh, brickforce, accessories, sections) | list | 4% (approved Oct 2026) | quoted |
| Masonry & precast (bricks, blocks, lintels, DPC, air bricks; pavers, kerbs, retaining, gabions) | list | 4% (approved Oct 2026 for masonry; paving & retaining to confirm) | quoted |

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
