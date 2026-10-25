# Supplier prices

ROADMAP Phase 1 (1.1–1.4 and 1.6). This page explains how supplier costs become the prices customers pay. The work is in **Admin → Supplier prices**.

## The rule

> **Suggested sell price = supplier cost × (1 + the product's standard markup)**, never below cost + 3%.

This is the same rule sales quotations use for a supplier's cost (`docs/sales-quotes.md`). The standard markup is the one the pricing service holds for each product, for example 8% across the range expansion and building supplies.

**Nothing goes live until staff approve it.** Staff can approve the suggested price or type a different one. The platform refuses any price below cost plus the 3% minimum margin, the same floor the tier discounts respect (`PRICING_POLICY.md`).

Costs: the business is not VAT-registered (`docs/vat.md`), so a supplier's cost is simply what we pay them, including any VAT they charge.

## Where prices come from

1. **Supplier price lists.** Staff upload the supplier's list as `.xlsx` or `.csv`. The template is `/downloads/supplier-price-list-template.csv`: `sku, supplier_code, description, unit, cost`.
   - The column headers can vary: "Item code", "UOM", "Nett price" and similar are recognised.
   - A title row above the headers is fine.
   - Amounts can be written "R 1 234,50" or "1,234.50".
2. **Sales quotations.** When staff send a quotation with a line priced from a supplier's cost, that cost is added as a suggestion to the day's "Costs from sales quotations" list.
   - Its validity is the quotation's valid-until date.
   - The same product, unit and cost is suggested only once a day.
3. **The supplier itself, in the supplier portal (ROADMAP 1.5).** A supplier's portal login can send its current price list from *Supplier portal → Your price list*.
   - The file it already uses is fine.
   - A **valid-until date is required**, at most a year ahead, so a supplier's prices always lapse rather than go stale.
   - The list is matched exactly like one staff upload, using the supplier's learned codes, and shows in Admin → Supplier prices as "Sent by the supplier".
   - Staff are emailed (`PRICE_LIST_UPLOADED`, switchable on Admin → Notifications) with the row counts and a link. The email carries no costs.
   - **Staff still approve every price.**
   - The supplier sees each of its lines with the product we matched and its status: with our team, accepted, couldn't match, or not used. It **never** sees our sell price, our markup or other suppliers' prices.
4. **Retail benchmarks** remain the fallback for products no supplier has priced: at least two SA retailers, lowest × 1.08, promotions excluded (`PRICING_POLICY.md`).

## Matching

Each row is matched to a product in this order:
1. our SKU;
2. the supplier's own code, which is learned the first time staff approve a row from that supplier (ROADMAP 1.3, `SupplierProductCode`);
3. the product name, when exactly one product has it.

The unit can be written how the supplier writes it: "ea", "each", "per m2", "50kg", "roll" and so on. When a product is sold in only one unit, the unit can be left blank.

A row that can't be matched shows as **Needs a product**. Staff type the SKU and unit to match it.

Aggregates and ready-mix are priced per ton and m³ from their own price bands, so supplier lists don't price them yet.

## What an approved price does

An approved price replaces the catalogue's list price for that product and unit everywhere:
- **Checkout, cart, quote requests and sales quotations.** The API sends every approved, unexpired price to the pricing service with the order (`price_overrides` on `/calculate/order`). Tier discounts and the margin floor work exactly as for any other priced unit: trade 4% off for supplies, and Volume / Civil Bulk is still quoted.
- **Product pages.** The catalogue loaders in `lib/cms.ts` apply the live prices, so the price shows and add-to-cart appears.
- **Listings, search, header suggestions and Buy online.** `liveProductIndex` / `searchCatalogue(…, live)` in `lib/product-index.ts` apply them, so the product shows its price and the "Buy online" badge and filter.

The storefront reads `GET /prices/live`. It returns the **sell price at each tier only**, never costs, markups or suppliers. The response is cached for a minute, and approving or withdrawing a price refreshes it straight away.

## Price freshness (ROADMAP 1.4)

Each price list has a **valid-until** date. When it passes, the list's prices stop applying and the product goes back to its catalogue price, which for most products is quote-only. The product never sells at a stale price.
- The overview shows how many prices expire in the next 7 days.
- A newer approved price for the same product and unit replaces the older one.
- Every price ever approved is kept as history (`ProductPrice`).
- Staff can **withdraw** a live price at any time.

## Coverage (ROADMAP 1.6)

The overview shows **"Priced online: X of Y"**: how much of the catalogue can be bought online, counting both catalogue prices and live supplier prices. Next to it are the products priced from suppliers, the rows waiting for approval and the rows that need a product.

## API

| Method | Path | Who |
|---|---|---|
| GET | `/prices/live` | public: sell prices per tier |
| POST | `/prices/staff/lists` (multipart: `file`, `supplierLocationId` or `supplierName`, `validUntil`, `notes`) | staff |
| GET | `/prices/staff/lists`, `/prices/staff/lists/:id` | staff |
| POST | `/prices/staff/lists/:id/approve-all` | staff |
| PUT | `/prices/staff/lines/:id` `{ sku, unit }` | staff: match a row |
| POST | `/prices/staff/lines/:id/approve` `{ price? }`, `/prices/staff/lines/:id/reject` | staff |
| GET | `/prices/staff/live?sku=`, `/prices/staff/history/:sku`, `/prices/staff/coverage` | staff |
| DELETE | `/prices/staff/live/:id` | staff: withdraw |
| POST | `/prices/supplier/lists` (multipart: `file`, `validUntil` required, `notes`) | supplier portal login |
| GET | `/prices/supplier/lists`, `/prices/supplier/lists/:id` | supplier portal login: its own lists only |

## Still to come

- **4.4 Availability.** "In stock near you", using the supplier-to-product mapping this builds.
- **Supplier-specific delivery costs** on the order, using which supplier's price won.
