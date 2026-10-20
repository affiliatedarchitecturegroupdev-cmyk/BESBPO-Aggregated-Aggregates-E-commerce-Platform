# Stitch Express

Our Stitch account is **Stitch Express**, which uses the REST API at
`https://express.stitch.money/api/v1/`. It is a separate product from Stitch's
Enterprise GraphQL API at `api.stitch.money`, and the docs at
docs.stitch.money are for that Enterprise API. The Express API reference
opens from the Stitch dashboard (*Read the API docs*). Its OpenAPI spec was
the source for this integration.

## How a Stitch payment works

1. The customer picks the **Stitch** tile. Stitch can also be a tile's
   fallback, as it is for Instant EFT and Zapper. The API creates a
   **payment link** for the exact amount, in cents. The link carries:
   - the merchant reference, which is our Payment ID;
   - the customer's name and email;
   - a 48-hour expiry;
   - `skipCheckoutPage: true`, because we already have the order details.
2. The customer is sent to the link, with `redirect_url` set to our return
   page: `https://aaggregates.store/payments/return?ref=<payment ID>`.
3. They pay on Stitch's page. The methods offered depend on the tile and on
   what the account has (`STITCH_METHODS`, below):
   - The Stitch tile offers every method the account has.
   - Instant EFT and Zapper use Stitch as their backup **only when pay by
     bank is on the account**. Otherwise they skip Stitch, so nobody who
     chose a bank payment lands on a card page.
   - Card offers card only.
   - Capitec Pay offers Capitec Pay only, once Stitch has it.
   - Wallets offer card plus whichever wallets the account has.
4. Stitch sends the **`payment.paid` webhook**, signed by Svix, to
   `https://<api>.onrender.com/api/v1/payment-methods/notify/stitch`. The API:
   - checks the signature;
   - finds the payment by its link ID;
   - **asks Stitch for the link's status**, which is the source of truth;
   - checks the amount;
   - confirms the order and sends the receipt.

   Retried deliveries change nothing.
5. The return page asks the API how the payment stands. The API checks with
   Stitch, and the page shows *Paid*, *Waiting for Stitch to confirm*
   (it refreshes itself), or *Nothing was charged*. It shows no personal
   details. Coming back never confirms an order by itself.
6. Stitch only ever sends the "paid" event. An **expired or cancelled** link
   is picked up by the status check, which runs on return and hourly (and
   from *Check payments with gateways now*). After 48 hours an unfinished
   payment is marked abandoned, like on the other gateways.

Stitch pays the money into the Express balance. It is withdrawn to the
verified bank account from the Stitch dashboard (*Withdrawals*). The store
doesn't move money out.

## Test mode is staff-only

A client ID starting with `test-` is **test mode**. Stitch reports payments as
paid without real money moving. So while test keys are set, **only staff and
admins can pay with Stitch**. Customers are sent to the tile's fallback, or
asked to choose another method, so no real order is confirmed by a test
payment. Mark any orders you pay in test mode as test orders.

## Settings (Render → aggregates-store-api → Environment)

| Key | Value |
|---|---|
| `STITCH_CLIENT_ID` | From Stitch → Settings → Developers. `test-…` for test mode, the live ID after approval. |
| `STITCH_CLIENT_SECRET` | From *View Client Secret*. **Viewing it creates a new secret and the old one stops working**, so only click it when you're about to paste it into Render. |
| `STITCH_WEBHOOK_SECRET` | The `whsec_…` secret shown once when the webhook is registered (below). |
| `STITCH_METHODS` | The methods Stitch's page offers, comma-separated: `CARD`, `APPLE_PAY`, `GOOGLE_PAY`, `CAPITEC`, `PAY_BY_BANK`. Stitch's API doesn't report them. Our account showed **card and Apple Pay** only (20 Oct 2026), so it's `CARD,APPLE_PAY`. Add `PAY_BY_BANK` or `CAPITEC` when Stitch confirms they're on. |
| `STITCH_API_URL` | Optional. Only if Stitch gives a different API address. |

Never put these in the repository or in chat.

## Setup, step by step

**Admin → Payments → Stitch Express** shows each step with a tick.

1. **Keys:** add `STITCH_CLIENT_ID` and `STITCH_CLIENT_SECRET` (the test pair)
   in Render and save. The API restarts. The panel shows *Connected · test
   mode*, or the error from Stitch.
2. **Register the return page:** click the button. This registers
   `https://aaggregates.store/payments/return` with Stitch and ticks
   *Register a redirect URL* in Stitch's checklist. Stitch allows up to 5.
3. **Register the webhook:** click the button. Stitch returns a signing
   secret **once**, and the panel shows it. Copy it into Render as
   `STITCH_WEBHOOK_SECRET` and save. It isn't stored anywhere else. If it's
   lost, ask express-support@stitch.money to remove the webhook, then register
   again.
4. **Test payment (test mode):**
   1. In the routing table, make sure the **Stitch** tile is enabled.
   2. Signed in as staff, place a small order and pay with Stitch.
   3. Check the order turns *Confirmed* and the receipt email arrives.

   This ticks *Create a payment link via the API* and *Complete a test
   payment*.
5. In Stitch's dashboard: **Submit for review**. Stitch reviews the
   integration and switches on live payments.
6. **Live:**
   1. Replace the test keys with the live client ID and secret.
   2. Register the return page and webhook again (live clients have their
      own), and update `STITCH_WEBHOOK_SECRET`.
   3. Make a small real payment, e.g. R10–R50, from the Absa test account.
   4. Check the money shows in Stitch's balance and the order and receipt are
      right.

   Customers can use Stitch as soon as live keys are in.

## Later (not built yet)

- **Refunds through Stitch.** The API has
  `POST /api/v1/payment/{id}/refund`, scope `client_refund`. We already keep
  Stitch's payment ID on each paid payment. Refunds are recorded by hand for
  now.
- **Card backup:** card is on the account, so Stitch can be the Card tile's
  fallback in the routing table (Admin → Payments). Capitec Pay can follow
  once Stitch switches it on.
- **Pay by bank:** not on the account yet (Oct 2026). Ask
  express-support@stitch.money to enable it, then add `PAY_BY_BANK` to
  `STITCH_METHODS`.

## Large orders: pay by bank first

From **R30,000** (owner, 20 Oct 2026; `BANK_FIRST_FROM` in
`apps/api/src/payment-gateway/eligibility.ts`), the Stitch tile is the
**first recommended** payment option. This applies to the order total, a
deposit, a balance or a payment link amount. Bank payments have no card
limit. It applies only once Stitch has **live** keys and `STITCH_METHODS` includes
`PAY_BY_BANK`, so customers are never steered to it in test mode or while
Stitch only offers card. It also needs the Stitch tile enabled.
