# Catalogue import

ROADMAP 2.6, "bulk catalogue tooling". Staff add new products from a CSV or Excel file in **Admin → Catalogue import**, so a supplier's whole range goes in at once instead of being added in code.

## How it works

1. **Upload the file.** It can be `.xlsx` or `.csv`, up to 5 MB and 2,000 products. You can choose the supplier the range comes from, and the date its costs are valid until.
2. **Check the preview.** Nothing is added yet. Each row shows as one of:
   - **New product:** it will be added. The preview shows its SKU and how it's sold.
   - **Already a product:** the same SKU, or the same name in the same category, is already in the catalogue. It is not added again. With a supplier chosen, the supplier's code for it is still learned and its cost still goes for approval.
   - **Can't add:** the reason is shown, for example an unknown category, a unit the category doesn't sell in, a cost that isn't an amount, or a duplicate of an earlier row.
3. **Add the new products.** They appear on the store within a minute: product page, listings, search, header suggestions, compare, departments, cart and the quote form. Or **Discard** the preview.

**New products are quote-only.** Prices are never invented (`PRICING_POLICY.md`). A product becomes buyable when a supplier price for it is approved in Admin → Supplier prices (`docs/supplier-prices.md`).

## With a supplier chosen

- **Its product codes are learned**, for new and existing products alike. Its next price list then matches on its own codes, and "Available near you" counts the supplier as listing those products (`docs/availability.md`).
- **Costs in the file go to one of its price lists**, matched to the new SKUs, with the suggested sell price (cost + the standard 8% markup). Staff approve them as usual. The cost is for the **first unit** listed on the row.
- Without a supplier, costs in the file are ignored. Import again with the supplier chosen to send them.

## The file

Download the template from the import page (`/downloads/catalogue-import-template.csv`). One product per row. A title row above the headers is fine, and the headers can be spelled loosely ("Product name", "UOM", "Nett price").

| Column | Required | Notes |
|---|---|---|
| `name` | yes | As customers should see it. |
| `category` | yes | The category's name or slug. The import page lists them. Aggregates and ready-mix are priced from their own bands, so they can't be used. |
| `unit` | yes | How it's sold, as the supplier writes it ("each", "m2", "roll", "6m"). Several can be separated with `;`, e.g. `kg; pack`. Each must be a unit the category's line sells in. |
| `sku` | no | Our SKU. Left blank, one is made from the category and name, e.g. `AA-SNT-SHADE-NET-80PCT-BLACK-3-X-50-M`. |
| `brand`, `standard`, `size`, `description` | no | Shown on the product page and used by search. |
| `supplier_code` | no | The supplier's own code, learned when a supplier is chosen. |
| `cost` | no | The supplier's cost for the first unit, for approval. |

**Pricing family.** It follows the category's supplier group (`Category.catalogueGroup`): building supplies, steel, masonry, roofing or cement. Tier discounts and the margin floor are the same as for that line's other products.

## How it fits together

- **Database.** Added products are `Product` rows with `catalogueImportId` set. They are not in the catalogue files, so they survive deploys and the seed leaves them alone. If a later catalogue file adds the same SKU, the file wins.
- **Pricing service.** The API sends added products with every order it prices (`added_products` on `/calculate/order`), alongside approved supplier prices.
- **Storefront.** `GET /catalogue-import/products` (public: no costs, suppliers or codes, cached for a minute) is read by:
  - `getAddedProducts` (`lib/cms.ts`), which feeds product pages, listings, search and merchandising;
  - the root layout, which hands the products to the cart and quote form (`AddedProductsProvider`).
- **Admin → Products** lists added products too, so staff can hide one, give it a description or add photos.
- **Imports are never deleted.** An import's rows are kept as its record of what was read and added.

## API

| Method | Path | Who |
|---|---|---|
| GET | `/catalogue-import/products` | public: the active products staff added |
| POST | `/catalogue-import/staff` (multipart: `file`, `supplierLocationId`, `validUntil`) | staff: check a file, stored as a preview |
| GET | `/catalogue-import/staff`, `/catalogue-import/staff/:id` | staff |
| GET | `/catalogue-import/staff/products` | staff: added products, hidden ones too |
| POST | `/catalogue-import/staff/:id/apply`, `/catalogue-import/staff/:id/discard` | staff |

Code:
- `apps/api/src/catalogue-import/` (reading and checking rows in `catalogue-import.ts`, unit-tested);
- `apps/api/src/pricing/added-products.ts`;
- `services/pricing/calculators/packaged_goods.py` (`with_added`);
- `apps/web/src/lib/added-products.ts`.
