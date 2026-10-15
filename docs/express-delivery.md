# AA 60/120 — express delivery

AA 60/120 delivers everyday building materials within 120 minutes, for
R1,000 (VAT inclusive) on top of the normal delivery fee. The rules below are
the owner's decisions of October 2026; the API is the only place they're
enforced (`apps/api/src/orders/express.ts`), and the storefront copy in
`apps/web/src/data/express.ts` and the Shipping & Delivery policy (section 7)
say the same thing. Change one, change all three.

## The rules

| Rule | Value |
|---|---|
| Fee | R1,000 VAT inclusive, on top of the delivery fee (`Order.expressFee`) |
| Promise | Delivered within 120 minutes of the clock starting |
| Prep | The clock starts 20 minutes after sales accepts (supplier confirmed) |
| Refund | Express fee refunded in full if delivered more than 180 minutes after the clock starts (more than an hour late) — so more than 200 minutes after acceptance |
| Radius | The buyer's pin within 30 km (straight line) of the nearest active partner supplier of **every** material in the order. A typed-in distance doesn't qualify |
| Hours | Orders taken Monday–Saturday, 07:00 until the 15:00 cut-off, SAST. Public holidays aren't blocked automatically — sales declines if needed |
| Payment | Card, or any method PayFast processes at checkout. Not EFT / purchase order, and not SCode (paid later in store). If PayFast checkout is set to staff only, AA 60/120 isn't offered to customers |
| Load | One truck: an estimated 5 t at most (see below) |
| Declined | Standard delivery; the fee is refunded in full, or taken off the total if the order isn't paid yet |

### What qualifies

Every line in the cart must qualify, and the order must be priced (not quote-only):

| Category | Units | Estimated weight per unit |
|---|---|---|
| Aggregates (sand, stone, decorative, etc.) | bags only | the pricing service's bag mass (20–25 kg); 25 kg fallback |
| Cement and mortars | 25 kg / 50 kg bags | 25 / 50 kg |
| Bricks | per 1,000 | 3,500 kg (maxi 5,000 kg) |
| Blocks | each | 22 kg |
| Lintels | each | 20 kg per metre of lintel |
| DPC, air bricks | roll / each | 6 kg / 3 kg |
| Reinforcing bar | 6 m lengths | the bar's actual mass |
| Brickforce | roll | 6 kg |
| Steel-fixing accessories | each, pack, roll, coil | 10 kg (tie wire: actual) |
| Roof sheets | standard lengths 3.0–6.6 m | 6 kg per metre |
| Flashings and fixings | each, pack | 6 kg |
| Insulation and rainwater | roll / each | 20 kg / 6 kg |
| Concrete roof tiles | each | 5 kg |

Not on AA 60/120: bulk tonnes and cubes, bulk bags, tankers, drums, steel by
the tonne, 12 m bars, mesh sheets, structural steel, cut-to-length sheet
(METRE), ready-mix and timber.

The weights are deliberately conservative estimates (the catalogues only
carry masses for bags and steel), used only for the 5 t one-truck cap: about
a thousand maxi bricks or a hundred 50 kg bags.

## How an order runs

1. **Cart / checkout.** `POST /orders/price` returns `express: { available, reasons, fee, … }`.
   Checkout shows the AA 60/120 option when it's available, or why not. The
   cart page hints that it's available.
2. **Order.** `POST /orders` with `express: true`. The API re-checks
   everything and refuses with the reasons if the cart no longer qualifies.
   `total = materials + delivery + 1,000`. Staff get an "AA 60/120 express —
   New order" email.
3. **Payment.** `/payment-methods/eligible?…&express=true` and
   `/payment-methods/initiate` allow Card and PayFast methods only.
4. **Paid.** When the order is confirmed (PayFast ITN or staff), staff get
   **"AA 60/120 PAID — confirm a supplier now"**.
5. **Sales confirms a supplier** by phone or email, then in **Admin → Orders
   → AA 60/120** clicks **Accept — start the clock**
   (`PATCH /orders/:id/express {decision: "ACCEPT", note?}`). The customer is
   emailed the due time (accepted + 20 + 120 minutes).
6. **Dispatch and deliver** as usual (status → Out for delivery → Delivered).
   The admin card shows a live countdown; the customer sees it on the order
   and tracking pages.
7. **If no supplier can**, **Decline** with a reason the customer sees
   (`{decision: "DECLINE", note}`). Unpaid: the fee comes off the total
   (and any unpaid invoice). Paid: the order is flagged "Refund the R1,000
   express fee".
8. **Late.** Delivered more than 180 minutes after the clock started (or
   still not delivered by then) → "fee refundable". Record the refund in the
   order's Refunds panel (reason "AA 60/120 more than an hour late"); the
   PayFast refund itself is made in the PayFast dashboard, as for any refund.

## Where it shows

- `/aa-60-120` — landing page (how it works, what qualifies, the promise,
  the delivery checker, FAQs).
- Homepage `ExpressBand`, straight after the departments.
- Header top line ("AA 60/120 Express"), mobile menu, footer, `/departments`,
  sitemap.
- The delivery checker notes when a town is within 30 km.
- The shopping assistant answers "express / urgent / 60/120" questions.
- Order PDFs (confirmation and tax invoice) list "AA 60/120 express
  delivery" as its own line; Insights counts the fee as delivery revenue.

## Data

`Order.expressFee` (null = standard delivery), `expressAcceptedAt`,
`expressDueAt`, `expressDeclinedAt`, `expressNote` — migration
`20261028090000_express_delivery`, which also adds the notification events
`EXPRESS_PAID`, `EXPRESS_ACCEPTED` and `EXPRESS_DECLINED` (switchable in
Admin → Notifications). The API adds a derived `express` block to every order
it returns: `outcome` (AWAITING_PAYMENT, AWAITING_ACCEPTANCE, IN_PROGRESS,
ON_TIME, LATE, REFUND_DUE, DECLINED, CANCELLED), `clockStartsAt`, `dueAt`,
`refundAfter` and `feeRefundDue`.
