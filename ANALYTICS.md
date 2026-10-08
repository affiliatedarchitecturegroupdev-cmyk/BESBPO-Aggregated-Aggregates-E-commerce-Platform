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

## Phase 2 — the analytics engine (`/api/v1/insights`)

Code: `apps/api/src/insights/`. Staff and admins can call every endpoint
except the P&L; for staff, cost, profit, operating costs, partner payouts and
cost-data-quality counts are removed from every response (and CSV), so staff
see sales, volumes and revenue only. Customers get 403.

| Endpoint | What it returns |
| --- | --- |
| `GET /insights/summary` | Headline metrics for the period and the comparison period, % change, pipeline counts; admins also get COGS, delivery cost, gross profit/margin, operating costs and net profit |
| `GET /insights/timeseries` | The same metrics per day, week (Monday start) or month, with the comparison period aligned bucket by bucket; empty buckets are zero. `format=csv` |
| `GET /insights/breakdown?by=` | Material sales by `product`, `category`, `family`, `province`, `tier`, `channel`, `paymentMethod`, `supplier` or `customer`: revenue, share, orders, quantity (per product), growth; admins also get COGS and gross profit. `sort=revenue\|grossProfit\|orders\|growth`, `limit` (≤500), `format=csv` |
| `GET /insights/hire` | Bookings by status, paid value and commission, fill rate, minutes to assign, offer acceptance, top items, provinces, partner league; admins also see payouts held/due |
| `GET /insights/pipeline` | Enquiries by kind and status, quote requests → priced → accepted, quote win rate, hours to quote, booking funnel |
| `GET /insights/marketing` | Promotion views, clicks and click-through (total, per day, per promotion), newsletter sign-ups by page and audience, material sales by channel |
| `GET /insights/customers` | Customers, new vs returning, repeat rate, revenue per customer, tier mix, sign-ups and trade applications |
| `GET /insights/pnl` (admin) | Monthly management P&L (`months` 1–36 ending with the month of `to`), operating costs by category, whether costs were entered for each month, totals. `format=csv` |

**Filters (all endpoints):** `from`, `to` (YYYY-MM-DD, South African days;
default the last 30 days; up to three years), `compare=previous|year|none`
(default previous), `granularity=day|week|month` (default by period length),
`businessLine=ALL|MATERIALS|HIRE`, `family`, `category` (slug), `sku`,
`province`, `tier`, `channel`, `paymentMethod`.

**Rules the engine applies:**

- Periods are South African calendar days: an order paid at 00:30 SAST on
  1 April is April's, even though it is 31 March in UTC.
- Test orders and bookings are always excluded. Cancelled bookings are left
  out; their refunds are reported as `hireRefunds` (a pass-through) and not
  deducted from commission. A paid order that is later cancelled stays in
  revenue until its refund is recorded, so nothing is counted twice.
- **VAT:** with `PRICES_INCLUDE_VAT=true` every price-derived amount
  (revenue, fees, commission, refunds, COGS) is divided by 1.15 and the
  response says `vatBasis: "EX_VAT"`; until then amounts are `AS_CHARGED`.
  Delivery costs and operating costs are entered ex VAT already.
- **Product filters** (family, category, sku) work on order lines, so
  delivery fees, delivery costs, refunds and hire — which belong to whole
  orders or bookings — are left out; `includes` in the response says what a
  view contains. Operating costs only appear in an unfiltered, all-lines view.
- **Operating costs** count in full for whole months and are prorated by
  days for part months; `operatingCostMonthsMissing` lists months in the
  period with nothing entered, so a "profit" isn't flattered by missing costs.
- Data quality travels with the numbers: lines without a cost, estimated
  lines and dispatched deliveries without a cost are counted per bucket.

**Reconciliation tests** (`apps/api/test/api.e2e-spec.ts`, "insights")
place orders, bookings, refunds and operating costs in March 2031 and check
that every endpoint matches the records to the cent — including the SAST
day boundary, test exclusion, proration, VAT basis, staff stripping and CSV.

## Phase 3 — Admin → Insights pages

Code: `apps/web/src/app/admin/insights/`, `components/insights/`, `lib/insights.ts`.
Staff and admins reach it from **Admin → Insights**. One filter row sits above
every view: period presets (7/30/90 days, month/quarter/year to date, last
month, last 12 months, custom dates), comparison, granularity, business line,
province, tier, channel, payment method, and on product views family and
category. Filters live in the URL, so tabs, links and CSV downloads keep the
same slice and a view can be bookmarked or shared.

| Tab | What it shows |
| --- | --- |
| Overview | Headline tiles with change vs the comparison period, net revenue trend against the comparison period, revenue mix (materials / delivery / hire commission), best-selling products, pipeline counts; admins also see gross profit, margin, operating costs, net profit and data-quality warnings |
| Sales | Material sales trend, paid orders, average order value, sales by channel, payment method and tier |
| Products & categories | Top 10 (sortable by sales, orders, growth, and for admins gross profit), by category and family (click through to filter), every product with quantity, share and growth; admins see cost, gross profit and margin |
| Customers | Paying, new and returning customers, repeat rate, revenue per customer, tier mix, sign-ups, top customers |
| Hire & services | Paid bookings, booking value, commission, fill rate, commission trend, booking funnel, most-booked items, provinces, bookings by status, partner league; admins see payouts |
| Pipeline | Quote funnel and win rate, hours to price, booking funnel, quote requests by status, enquiries by kind and status |
| Geography & delivery | Sales and hire by province, sales by fulfilling supplier; admins see delivery cost and delivery margin |
| Marketing | Promotion views and clicks per day, click-through per promotion, newsletter sign-ups by page and audience, sales by channel (from `GET /insights/marketing`) |
| Profit & loss (admins) | Monthly management P&L (6/12/24 months) with operating costs by category, gross vs net profit chart, months with no costs flagged |

**Charts** (Recharts) follow one method: one y-axis, 2px lines, ≤24px bars
with a rounded data end, a 2px gap between stacked segments, hairline grid,
crosshair tooltips, and the comparison period as a grey line. Series colours
are a validated colour-blind-safe set in fixed order (blue, orange, aqua,
yellow). Every chart has a legend (two or more series), a "Show as table"
view, and most have **Download CSV** (`/api/admin/insights/{timeseries|breakdown|pnl}`,
which forwards the session — staff downloads have no cost columns).

Each view says what it includes: VAT basis, refunds, filtered-out lines
(delivery, hire, overheads), and for admins any missing costs that would
overstate profit, with a link to Admin → Finance.

## Still to come

- **Phase 4:** weekly email summary to admins, saved views, optional
  accounting-software sync for operating costs.
- Card/gateway fees once a live gateway is on (they reduce gross profit).
