# Delivery rates

ROADMAP 9.1 and 9.2. **Admin → Delivery rates** holds what customers pay for delivery. Admins edit it; staff see it read-only.

When an admin saves:
- the cart, checkout, quote requests and sales quotations use the new rates straight away;
- product pages and the delivery calculators show them within a minute;
- orders already placed keep the delivery fee they were priced with.

## Tipper loads (aggregates and sand)

These rates started as the pricing framework workbook's. They can now be changed in the admin:

| | Up to 6 m³ | Up to 10 m³ | 14 m³+ |
|---|---|---|---|
| 0–30 km | included in the price | | |
| 30–60 km | R450 | R650 | R950 |
| 60–100 km | R850 | R1,200 | R1,800 |
| beyond 100 km | quoted | | |

Also editable:
- **Small load** (below the full-load minimum of 3 m³ or 5 tons): R350, within 30 km.
- **Bagged goods:** R350, free from 1,000 kg, within 30 km.
- **The full-load minimum** (m³ and tons).

The distances (30, 60 and 100 km) are fixed. They are the bands the storefront, the delivery premium and the policies describe.

## Flatbed delivery (the supplier's own truck)

Four product lines come on the supplier's own flatbed or crane truck, never a tipper:
- steel;
- bricks, blocks, paving and precast;
- roofing and timber;
- building supplies.

**Until a line has fees,** its orders show R0 delivery and the truck's charge is confirmed with the customer before dispatch, as before.

**Once set,** a line has:
- one fee for each distance band (0–30, 30–60, 60–100 km);
- optionally, **free delivery from** a value of that line's goods in the order;
- beyond 100 km, delivery is quoted.

The fee then:
- shows on the product page ("Delivery fee, shown at checkout") and in the cart;
- is charged at checkout.

How it combines with other deliveries, following the delivery premium's model (`docs/delivery-premium.md`):
- **The delivery fee covers one supply point.** When an order needs several lines' trucks (say steel and bricks), the highest fee applies. The distributed delivery premium covers the other collections on orders of 3 or more products.
- **With tipper goods in the order,** the tipper fee is the delivery fee. The flatbed lines are extra supply points for the premium.
- **Lines without fees** add nothing.

**Waiting on the owner:** the flatbed fees themselves, from the suppliers' truck rates. Ready-mix stays with the batching plant's mixer truck.

## How it works

- **Stored** in `SiteContent` under `delivery-rates`. Until it is saved, the workbook's rates apply.
- **Checked** by `normaliseDeliveryRates` (`apps/api/src/pricing/delivery-rates.ts`, unit-tested): every fee is R0–R100,000, a flatbed line needs all three fees, and a saved value that no longer passes falls back to the workbook.
- **Sent** by the API to the pricing service with every price: `delivery_rates` on `/calculate/order` and `/calculate/delivery-fee`. The rates are cached for a minute, and saving clears the cache.
- **Pricing service:**
  - `with_rates` (`calculators/delivery_bands.py`) puts the staff fees on the workbook's bands;
  - `calculators/flatbed.py` works out flatbed fees.
  - The delivery result lists a `FLATBED` component naming the line.
- **Storefront:** `getDeliveryRates()` (`lib/cms.ts`, cached for a minute) feeds:
  - the product page's delivery table and bulk/bag calculator;
  - the homepage calculator and "bulk vs bagged" section;
  - `FlatbedFeeNote` on steel, masonry, roofing and building-supplies product pages.
- **Shipping & Delivery policy:** section 2 describes these fees (25 Oct 2026).

## API

| Method | Path | Who |
|---|---|---|
| GET | `/pricing/delivery-rates` | public: the rates the storefront shows and charges |
| PUT | `/pricing/delivery-rates` | admins |
