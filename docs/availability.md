# Available near you

ROADMAP 4.4. Every product page has a small "Available near you" line under the lead time. It tells the shopper whether a partner supplier near them handles the product, and how far away that supplier is.

## What the shopper sees

- **No town chosen:** how many partner suppliers list the product, and in which provinces. If none list it, how many supply its range. Then a link, "See what's available near you".
- **Town chosen** (typed from our delivery towns and suburbs, or the browser's location, shared once):
  - *"Available near you: a partner supplier about 15 km away, in Pinetown, lists this product."* At least one supplier lists it within 100 km.
  - *"Partner suppliers of this range are about 40 km away, in Durban North — we confirm this product with them on your order or quote."* No listing supplier is within 100 km, but a supplier of the category is.
  - *"No partner supplier within 100 km of … yet — we'll quote delivery from the nearest one."*

100 km is where the delivery bands end (Shipping & Delivery policy). Distances are straight-line:
- under 50 km, rounded to the kilometre;
- beyond that, to the nearest 5 km.

## The rules

- **Never "in stock".** We don't hold live stock levels from suppliers. "Lists this product" means the supplier has priced it with us. "Supplies this range" means it is mapped to the product's category.
- **Never a supplier's name, contact or exact pin.** The response gives only the town, province, rounded distance and counts. The e2e test checks the supplier's name and id never appear in it.
- **Only active, verified partners count.** Unverified leads never show.
- **A supplier "lists" a product** when it has an active, unexpired approved price for it (`ProductPrice`, `docs/supplier-prices.md`) or a learned supplier code for it (`SupplierProductCode`). An expired price list stops counting the day it lapses. A learned code keeps counting, because the supplier still carries the line.
- **A supplier "supplies the range"** when the product's category is in its `categorySlugs` (Admin → Suppliers).
- Suppliers without a pin still count towards the totals and provinces. They are left out of the distances. Pins are set by staff from a Google Maps link and are never guessed.

## The shopper's location

- It is kept **only in the browser's local storage** (`aa-my-location`), and the Cookie Policy says so.
- A town is stored by its delivery-town coordinates. A shared location is first rounded to about a kilometre (two decimal places).
- It is sent with each lookup and is not stored or logged, either by the web route (`/api/availability`) or by the API.
- "Forget my town" removes it.

## API

| Method | Path | Who |
|---|---|---|
| GET | `/suppliers/availability?sku=&lat=&lng=` | public. Returns `{ listed, range, listedProvinces, nearestListed, nearestRange }`. Each nearest value is `{ town, province, distanceKm }` or null. |

The storefront calls it through `/api/availability`. The town picker uses `/api/towns?q=`, which searches the delivery towns (`data/coverage-towns.ts`).

Code:
- `apps/api/src/suppliers/availability.ts` (the counting and rounding, unit-tested);
- `SuppliersService.availability`;
- `components/product/AvailableNearYou.tsx`;
- `lib/my-location.ts`.
