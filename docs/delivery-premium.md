# Distributed Delivery Premium (DDP)

We don't hold stock, so an order whose materials come from several kinds of
supplier has to be collected from several supply points. The standard
delivery fee covers one. The DDP covers the others. The model follows the
owner's research (`DISTRIBUTED_DELIVERY_PREMIUM`, October 2026):

```
DDP = origin fee + R150 × heavy tons (rounded up) from the extra supply points
origin fee = R0 (1 point) · R200 (2) · R450 (3) · +R225 for each point after 3
```

| Tier | Supply points | Origin fee |
|---|---|---|
| 1 — Consolidated | 1 | R0 (the delivery fee covers it) |
| 2 — Dual origin | 2 | R200 |
| 3 — Distributed | 3 | R450 |
| — | 4+ | R450 + R225 each |

It only applies to orders of **3 or more different products** (admin
setting). Every rate can be changed in **Admin → Delivery premium**
(admins; staff see it read-only), and the premium can be switched off
there.

## Supply points ("tag products by supplier origin")

- **Kind of supplier:** every category already belongs to a supplier group
  (`Category.catalogueGroup`):
  - quarry (`core`);
  - cement & binders (`b2b-bulk`);
  - brickyard & precast (`masonry`);
  - batching plant (`ready-mix`);
  - roofing & timber (`roofing`);
  - steel merchant (`steel`);
  - building supplies (`supplies`).

  Without better information, each group in the order is one supply point.
- **Real partner suppliers:** verified, active partner suppliers that can
  serve the site are counted first:
  - within 100 km of the customer's pin, or
  - in the delivery province at checkout.

  A supplier that stocks several of the order's categories (its
  `categorySlugs`) covers them as **one** supply point. If one supplier
  stocks everything, the order is Tier 1 and pays nothing.
- **How they're counted:** greedy cover, biggest first. It never counts more
  points than there are groups, so the cart's estimate (priced without the
  province) can only come down at checkout. Researched leads that aren't
  verified don't count.
- **The main point:** the point carrying the most weight. The delivery fee
  covers it; the premium covers the rest.

## The weight charge

R150 per ton, or part of a ton, of **heavy** goods from the extra supply
points:
- heavy: aggregates, sand, cement and binders, bricks and precast, steel,
  roofing and timber;
- light (no weight charge): building supplies, such as fittings, tools and
  paint;
- none: ready-mix, which comes in the plant's own mixer truck.

Weights come from the pricing service (`equivalent_tons`). Today that covers
bulk aggregates, bagged goods and part of the steel range. Bricks, blocks,
roof sheets and most mesh don't have a unit weight in the catalogue yet, so
they add supply points but no weight charge. Adding manufacturers' unit
weights (with sources) to those catalogues turns it on with no code change.

## Where it shows

- **Cart:** a "Distributed delivery premium" line. Open it to see why: the
  supply points, which one the delivery fee covers, and how the premium is
  made up. It's marked as an estimate.
- **Checkout:** the cart's line, re-priced with the site's province. The
  order stores `ddpFee` (null when none applies) and `ddpDetail`, the full
  assessment including any partner supplier's ID, for staff. The order
  total includes it.
- **Everywhere a total is shown:** the order page, payment links, emails,
  the order confirmation, proforma and tax invoice PDFs, and Admin → Orders
  (a panel listing the supply points).
- **Reporting:** Insights counts it as delivery income, next to the delivery
  and express fees.
- **Admin → Delivery premium:** the rates, plus the last 90 days of paid,
  non-test orders: how many paid the premium and how much was collected.
  Compare that with the delivery costs recorded at dispatch to tune the
  rates.
- **Legal:** Shipping & Delivery policy, section 2A.

A supplier's own flatbed or crane-truck charge (steel, bricks, roofing,
building supplies) is still confirmed with the customer before dispatch,
as before. The premium covers the extra collections we arrange.

## API

| Endpoint | Who | What |
|---|---|---|
| `POST /orders/price` | Public | Now returns `ddp` (no supplier IDs); `total` includes it. Takes an optional `deliveryProvince`. |
| `GET /orders/delivery-premium/policy` | Public | The rates |
| `PUT /orders/delivery-premium/policy` | Admin | Change the rates or switch it off |
| `GET /orders/delivery-premium/stats` | Staff | Last 90 days |

The logic lives in `apps/api/src/orders/ddp.ts`, which is pure and
unit-tested, and `ddp.service.ts`, which handles suppliers and the policy.
