# Payments: three aggregators, deposits, lay-by and payment links

The platform takes payments through three aggregators that complement each
other rather than duplicate: if one is slow to approve, offline or failing,
orders can still be paid. Every payment is a row in the **payments ledger**,
so an order can be paid in full, by deposit then balance, on lay-by, by
payment link, or by EFT recorded by staff.

PayFast's own setup is in [payments-payfast.md](payments-payfast.md).

## Who does what

| | PayFast | Peach Payments | Stitch | LayUp |
|---|---|---|---|---|
| Role | Main route for most tiles | Card fallback; main route for BNPL it carries | Pay by bank (instant EFT), no card limit | Lay-by |
| Tiles it runs | Card, Instant EFT, Capitec Pay, wallets, SnapScan, Zapper, SCode, Payflex, Mobicred, MoreTyme | PayJustNow, Happy Pay, Float; fallback for Card, Payflex and Ozow | Stitch; fallback for Instant EFT and Zapper | LayUp lay-by |
| How the customer pays | Signed form post to PayFast's page | Redirect to Peach's hosted checkout (V2) | Redirect to Stitch; customer signs in to their bank | Redirect to LayUp; sets up a plan |
| How we know it's paid | ITN, checked four ways | Signed webhook, then Peach's status API | Svix-signed webhook, then Stitch's API | Hourly status check (and on return) |
| Big orders | Card limits apply | Card limits apply | **Best fit** — bank-to-bank, no card limit | R500 – R150,000 |

The routing table (Admin → Payments → Payment methods) decides which gateway
runs each tile and its fallback. The seed sets the defaults above; admins
change them without a deploy.

## The ledger

- `Payment` — one row per attempt: kind (`FULL`, `DEPOSIT`, `BALANCE`,
  `INSTALMENT`), amount, tile, gateway, status (`INITIATED` → `PAID`, or
  `FAILED` / `CANCELLED` / `EXPIRED`), the gateway's checkout ID and
  payment reference, whether it was a failover, and who recorded it (EFT).
- `Order.amountPaid` is the sum of its paid payments; `Order.paymentPlan` is
  `FULL`, `DEPOSIT` or `LAYBY`.
- The **merchant reference** sent to every gateway is the Payment ID, so an
  order can take a deposit and a balance through the same gateway.
  PayFast notifications for checkouts started before the ledger (order ID
  as reference) are still accepted.
- **The first payment confirms the order** (in full, the deposit, or a
  completed lay-by plan): paid date, receipt email, and the AA 60/120 staff
  alert where relevant. A later payment sends a receipt with the balance
  left, and marks an issued tax invoice paid once the order is paid in full.
- **Dispatch waits for the balance.** Moving an order to *Out for delivery*
  or *Delivered* is refused while anything is owed — except on a trade
  account (docs/trade-credit.md); phased orders release each drop as it's
  paid for (docs/deliveries.md).
- A payment is only ever marked paid on the gateway's word (a verified
  notification or a direct status check) — never because the browser came
  back from the gateway's page. The amount must match the payment.
- Staff confirming an order by hand (no payment in the ledger) records the
  outstanding amount as an EFT / purchase order payment, as before.
- Migration `20261030090000_payments_ledger` backfills one paid `FULL`
  payment for every order already paid.

## Failover

Starting a payment tries the tile's gateway, then its fallback:

1. A gateway that's **paused** by an admin, or **tripped**, is skipped.
2. A gateway that isn't configured yet is skipped (not counted as a failure).
3. A gateway that answers with an error is skipped, and the error counts:
   **3 errors in 10 minutes trips it for 15 minutes**. Staff get a
   *Payment gateway failing* email listing each affected tile and its
   fallback. After the cool-off it's tried again.

Admin → Payments shows each gateway's state, recent errors, pause/resume
buttons, the incident history, and the latest notifications from all three
gateways. *Check payments with gateways now* runs the hourly sync at once.

The hourly sync (`PAYMENTS_SYNC=off` stops it) checks lay-by plans and any
Peach or Stitch payment whose notification may have been missed, and marks
payments started but not finished after 48 hours as abandoned.

## Deposits

Shown on the order page as *Pay in full* or *Pay a deposit*. The amount is
worked out on the server from the policy below; the request can't set it.

| Customer | Order total | Deposit |
|---|---|---|
| Retail | R10,000 – R99,999 | 30% |
| Retail | R100,000+ | 25% |
| Trade / Volume | R10,000 – R99,999 | 25% |
| Trade / Volume | R100,000 – R249,999 | 20% |
| Trade / Volume | R250,000+ | 15% |
| Any order with a cut-to-length line | | at least 50% |

- Not offered below R10,000, on AA 60/120 orders (paid in full), on lay-by,
  or once anything has been paid.
- The deposit confirms the order at its prices; the balance is due before
  dispatch. Customers pay it from the order page or a payment link; staff
  can record it as an EFT.
- Admins edit the policy on Admin → Payments → Deposit policy (stored in
  SiteContent `deposit-policy`). **Every percentage is clamped to 15–50%**,
  the band the owner set.

## Lay-by (LayUp)

- Offered on orders of R500 – R150,000 (Admin → Payments limits), not on
  AA 60/120, deposits or balances.
- Our terms to LayUp: **at least 20% deposit, paid off within 3 months**
  (`LAYUP_TERMS` in `apps/api/src/payment-gateway/layup/layup.ts`). The
  customer chooses their instalments on LayUp's page.
- The order stays *Awaiting payment* (plan `LAYBY`); its LayUp payment shows
  what's been paid so far. When the plan is paid off the order is
  confirmed and delivered like any other. If LayUp cancels the plan, the
  order can be paid another way.
- While a plan has payments on it, the customer can't start paying the
  same order another way (the API refuses), so nobody pays twice.
- LayUp's API is read defensively: `LAYUP_API_URL` and `LAYUP_WIDGET_URL`
  override the hosts if LayUp gives the account different ones.

## Payment links and proformas

- **Admin → Orders → Payments, links & EFT**: create a link for the full
  amount, a deposit, the balance or a part payment; optionally emailed to
  the customer. The URL is shown once — only its hash is stored. Links last
  7 days by default (up to 30) and can be revoked.
- `/pay/<token>` needs no sign-in and shows only the products and amounts —
  no address or contact details. The customer can pay by any tile open to
  that amount (not lay-by) and download a **proforma invoice**.
- Signed-in customers also get a *Proforma invoice (PDF)* on the order
  page while anything is owed.
- The tax invoice is issued as before, and is marked paid only once the
  order is paid in full.

## Quotes into orders

Admin → Quotes → *Make the order*: staff enter each line's agreed unit price
and the delivery fee; they must add up to the quoted total the customer saw.
The order (channel `QUOTE`) belongs to the requester's account, or — for a
guest — sends its emails to the quote's contact email. Then send a payment
or deposit link. This is the path for big site orders (e.g. 18,000 bricks).

## Notifications

| Event | Who | When |
|---|---|---|
| Payment receipt (`ORDER_CONFIRMED`) | Customer | The first payment; shows the balance due if it was a deposit |
| Payment received (`PAYMENT_RECEIVED`) | Customer, staff | A later payment (balance, link, EFT) |
| Payment link (`PAYMENT_LINK_SENT`) | Customer | Staff send a link |
| Gateway failing (`GATEWAY_DEGRADED`) | Staff | A gateway trips or is paused |

## What you need to do

Secrets go only in Render's environment settings for **aggregates-store-api**
— never in the repository or in chat.

### Peach Payments

1. Finish Peach's merchant onboarding; ask for **Hosted Checkout V2** with
   card, PayJustNow, Happy Pay and Float switched on.
2. In the Peach dashboard copy the **client ID, client secret, merchant ID,
   entity ID** and the **secret token**.
3. Allow the storefront domain `https://aaggregates.store` for checkout.
4. Set the webhook URL to
   `https://<api service>.onrender.com/api/v1/payment-methods/notify/peach`.
5. Set `PEACH_CLIENT_ID`, `PEACH_CLIENT_SECRET`, `PEACH_MERCHANT_ID`,
   `PEACH_ENTITY_ID`, `PEACH_SECRET_TOKEN` and `PEACH_MODE` (`sandbox` first,
   then `live`).
6. Check the method names Peach uses for the account against `PEACH_METHOD`
   in `apps/api/src/payment-gateway/peach/peach.ts` (they choose which
   method Peach's page opens on).

### Stitch

1. Complete Stitch onboarding for **pay by bank (payment initiation)**.
2. Create a client with the `client_paymentrequest` scope; copy the client
   ID and secret.
3. Add a webhook endpoint
   `https://<api service>.onrender.com/api/v1/payment-methods/notify/stitch`
   and copy its signing secret (`whsec_…`).
4. Set `STITCH_CLIENT_ID`, `STITCH_CLIENT_SECRET`, `STITCH_WEBHOOK_SECRET`,
   and the account payments are paid into: `STITCH_BENEFICIARY_NAME`,
   `STITCH_BENEFICIARY_BANK` (Stitch's bank ID, e.g. `fnb`, `absa`,
   `standard_bank`, `nedbank`, `capitec`) and `STITCH_BENEFICIARY_ACCOUNT`.

### LayUp

1. Sign up as a LayUp merchant and get an **API key** (sandbox first).
2. Set `LAYUP_API_KEY` and `LAYUP_MODE`.
3. If LayUp gives different API or shopper-page addresses for the account,
   set `LAYUP_API_URL` and `LAYUP_WIDGET_URL` (with `{id}` for the order).
4. Confirm with LayUp that a 20% minimum deposit and 3-month maximum suit
   them, or tell us the terms to use.

### Then

1. Admin → Payments: each gateway shows *Live* once its settings are in.
2. Make a small sandbox payment through each, and check the order is
   confirmed and the receipt arrives.
3. Review the routing table and the deposit policy.

## Decisions for the owner to review

These were decided during the build, as asked, and are all changeable:

1. **Deposit bands** as in the table above, inside the 15–50% band; 50% for
   anything cut to length; nothing below R10,000.
2. **Balance before dispatch** — enforced by the system. The exceptions are
   orders on a trade account ([trade-credit.md](trade-credit.md)), and phased
   deliveries, where each drop is released as payments cover it
   ([deliveries.md](deliveries.md)).
3. **Lay-by terms**: 20% minimum deposit, 3 months maximum, R500 – R150,000,
   goods released only when paid off, price locked at order.
4. **Gateway roles**: Peach as card fallback and for PayJustNow, Happy Pay
   and Float; Stitch for pay by bank and as fallback for Instant EFT and
   Zapper. PayFast stays the main route while it's available.
5. **Failover trip**: 3 errors in 10 minutes → 15 minutes on the fallback.
6. **Payment links**: 7 days by default, 30 at most; show products and
   amounts only.
7. **Quote orders must match the quoted total** to the cent.
8. **No LayUp logo** is used — the tile has a plain "Lay-by" badge until
   LayUp's brand assets are licensed to us.
9. **Peach's and Stitch's API details** were taken from their published
   SDKs, as their documentation sites were out of reach from the build
   environment. The sandbox test (above) is the check before going live.
