# Sales & Profit Reporting (Admin → Insights)

The sales dashboard is built in four phases. **Phase 1 (data foundations)
is live**; it records everything the dashboard needs, from the moment it
was deployed. Phases 2–4 build the analytics engine and the dashboard pages
on top.

## Decisions (approved Oct 2026)

| Question | Decision |
|---|---|
| Who sees cost, margin and P&L? | **Admins only.** Staff and customers never receive cost fields — the API strips them (`apps/api/src/common/costs.ts`). |
| When does a sale count? | **When payment is confirmed** (`Order.paidAt`, `Booking.paidAt`). Unpaid orders are pipeline; cancellations and refunds are deducted. |
| Gross or net P&L? | **Both**: gross profit from the platform's own data, and a net P&L that also deducts the monthly operating costs admins enter. A management view, not statutory accounts. |
| VAT basis | **Excluding VAT.** Depends on finance confirming whether storefront prices include VAT (`PRICES_INCLUDE_VAT`, open item); until then figures are reported as charged and labelled so. |
| Delivery cost | **Standard rate per carrier × distance band × load**, set by admins, applied automatically at dispatch; staff can enter the **actual** haulier amount instead. No rate and no actual = "not recorded" — never guessed. |

## Phase 1 — what is recorded

**Order lines (snapshot at checkout, never recalculated):** `listUnitPrice`,
`unitCost` (list ÷ (1 + markup), from the pricing service — the same cost
the margin floor uses), `pricingFamily` (AGGREGATE, CEMENT_BAGGED,
CEMENT_BULK, READY_MIX) and `costSource` (`SNAPSHOT`, or `ESTIMATED` for
backfilled lines).

**Orders:** `customerTier` and `deliveryLoadSize` priced at; `paidAt`
(set when staff confirm payment); `cancelledAt`; `paymentMethod` (the method
chosen at payment, or picked by staff when confirming); `fulfilledBySupplier`
(chosen at dispatch); `isTest`.

**Shipments:** `deliveryCost` (ex VAT), `deliveryCostSource` (`ACTUAL` or
`STANDARD_RATE`), `deliveryCostNote`. Ready-mix-only orders travel in the
plant's mixer and carry no separate delivery cost.

**Refunds** (`Refund`): amount actually paid back, reason, EFT reference and
date, for exactly one paid order or booking, never more than was paid.
Staff record them on the order or booking; admins can remove one recorded
in error.

**Operating costs** (`OperatingCost`): month, category, description and
amount ex VAT, entered by admins on Admin → Finance.

**Standard delivery costs** (`DeliveryCostRate`): carrier × distance band ×
load (6m³, 10m³, 14m³+, bagged), on Admin → Finance.

**Quotes:** `respondedAt` (accepted/declined). **Bookings:** `isTest`, and
refunds. Bookings already held `customerTotal`, `partnerAmount` and the
commission.

**Test data:** orders and bookings placed from staff or admin accounts are
flagged `isTest` automatically and excluded from reporting; admins toggle the
flag on the order or booking.

**Backfill:** orders placed before Phase 1 were filled in by migration
`20261011090000_reporting_foundations` from the price bands current at the
time — line costs marked `ESTIMATED`, and `paidAt`/`cancelledAt` taken from
the invoice payment, dispatch or last update (`timestampsEstimated`). The
dashboard labels these as estimates.

**Data quality** (Admin → Finance): paid lines without a cost, dispatched
deliveries without a cost, rates set, months with operating costs, paid
orders without a payment method, estimated rows, test orders/bookings.

## How profit is calculated (for Phases 2–4)

```
Revenue (materials)  = Σ line totals of paid, non-test orders
+ Delivery fees      = Σ order delivery fees
+ Hire commission    = Σ (customerTotal − partnerAmount) of paid, non-test bookings
− Refunds            = Σ refunds in the period
Net revenue
− Cost of goods      = Σ line unitCost × quantity
− Delivery cost      = Σ shipment deliveryCost
= Gross profit
− Operating costs    = Σ OperatingCost for the months in the period
= Net profit (management view)
```

Hire bookings are reported at gross booking value (what customers paid) and
at commission (our revenue under the Agent model); the partner payout is a
pass-through, not our cost of sale.

## Still to come

- **Phase 2 — analytics engine:** aggregate queries by day/week/month in
  Africa/Johannesburg time, one filter set (period + comparison, business
  line, category, product, province, tier, channel, payment method),
  reconciliation tests (dashboard totals = the underlying records).
- **Phase 3 — Admin → Insights pages:** Overview, Sales, Products &
  categories, Customers, Hire & services, Pipeline & conversion, Geography &
  delivery, Marketing, Finance (admins), with charts (Recharts) that each
  have a table view and CSV export.
- **Phase 4:** weekly email summary to admins, saved views, optional
  accounting-software sync for operating costs.
- Card/gateway fees once a live gateway is on (they reduce gross profit).
