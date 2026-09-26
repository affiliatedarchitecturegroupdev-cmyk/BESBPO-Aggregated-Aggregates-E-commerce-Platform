# Pricing framework

`aggregated-aggregates-pricing-framework.xlsx` is the single source of truth
for every price on the platform: category base cost, markup, bulk density
and bag premium; customer-tier discounts; and delivery charges.

## How it flows into the platform

```
docs/pricing/aggregated-aggregates-pricing-framework.xlsx
        │  services/pricing/scripts/import_pricing_framework.py
        ▼
services/pricing/data/pricing_framework.json  ──►  pricing service (FastAPI) ──► checkout (NestJS /orders)
        │                                     ──►  database seed (PriceBand, CustomerTier, DeliveryBand)
        ▼
apps/web/src/data/pricing-framework.json      ──►  storefront price display + calculator preview
```

The two JSON files are generated and identical. Only the workbook's inputs
are imported; every price is derived from them by the pricing service's
calculators, using the workbook's own formulas.

## Changing a price

1. Edit the workbook and save it (so Excel stores the recalculated values).
2. `pip install -r services/pricing/requirements-dev.txt`
3. `python services/pricing/scripts/import_pricing_framework.py`
4. `cd services/pricing && pytest` — `test_reconcile_workbook.py` checks all
   48 SKUs (R/ton, R/m³, R/bag, Trade and Volume prices), the category bands,
   tier discounts and delivery fees against the workbook's computed cells to
   the cent, and fails if the generated JSON is stale.
5. Commit the workbook and both JSON files together.

The importer refuses anything it does not recognise, such as a new category,
a renamed tier or a reworded delivery rule. That is deliberate. Update
`CATEGORY_MAP` / `TIER_MAP` or the rule parsing in the script, and have the
change reviewed, rather than letting it guess.

## Rules as implemented

| Rule | Source |
|---|---|
| List R/ton = base cost × (1 + markup) | Category Markup Bands!E |
| List R/m³ = R/ton × density / 1000 | Category Markup Bands!F |
| List R/bag = R/ton × bag premium × bag weight / 1000 | Sample Priced Catalogue!J |
| Trade 8% / Volume 15% off list | Customer Tiers |
| Units offered per SKU | Sample Priced Catalogue "Unit of Sale" + bag weight |
| 0–30km included; 30–60 / 60–100km flat fee by load (6 / 10 / 14m³+) | Delivery & Additional Charges rows 4–6 |
| >100km quoted individually | Delivery & Additional Charges row 7 |
| Bulk minimum 3m³ or 5 tons; below it, R350 within 30km only | Delivery & Additional Charges rows 10–11 |
| Bagged: R350 under 1 ton, free from 1 ton, within 30km | Delivery & Additional Charges row 12 |
| Volume/Civil Bulk orders ≥10m³ are quote-only (Volume tier only) | Customer Tiers definition; confirmed by Fortune for Phase 2 |

Unit prices are rounded half-up to the cent (Excel `ROUND`), and a line
total is quantity × rounded unit price, so every invoice line multiplies out
exactly.
