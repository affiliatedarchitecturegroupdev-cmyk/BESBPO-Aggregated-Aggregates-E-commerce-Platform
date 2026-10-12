# PayFast — online payments

PayFast processes card, Instant EFT, Capitec Pay, Apple, Google and Samsung
Pay, SnapScan, Zapper, SCode, Payflex, Mobicred and MoreTyme (the routing
table in **Admin → Payments** decides which methods go to PayFast). The
Aggregated Aggregates merchant account was approved in October 2026.

## Settings (aggregates-store-api only)

| Variable | Value |
|---|---|
| `AGG_PAYFAST_MERCHANT_ID` | Merchant ID from the PayFast dashboard |
| `AGG_PAYFAST_MERCHANT_KEY` | Merchant key from the PayFast dashboard |
| `AGG_PAYFAST_PASSPHRASE` | Exactly the passphrase saved on the PayFast dashboard (Settings → Developer settings) |
| `AGG_PAYFAST_MODE` | `live` for real payments. Anything else, including a typo, uses the sandbox |

- **Where they live.** Only the API service has them. The web service and
  the pricing service never see them.
- **Why the `AGG_` prefix.** The owner runs several stores on one Render
  account.
- **Sandbox needs its own credentials.** The sandbox
  (sandbox.payfast.co.za) has its own merchant ID, key and passphrase; live
  credentials don't work there.
- **What the API does with them.** It reads them on every payment and never
  logs, stores or returns them. **Admin → Payments** shows only whether
  they're set and which mode is active.

## How a payment works

1. **The shopper chooses a PayFast method** on the order page. The API
   re-checks eligibility.
2. **The API builds a signed checkout form.** It contains merchant ID and
   key, return, cancel and notify URLs, email, order ID (`m_payment_id`),
   amount and item name, and the signature is the MD5 of the fields plus
   the passphrase. No `payment_method` is sent, so PayFast shows every
   method enabled on the merchant account.
3. **The browser posts the form to PayFast.**
   `www.payfast.co.za/eng/process`, or `sandbox.payfast.co.za` in sandbox
   mode. The web app only posts to those two addresses.
4. **PayFast sends the shopper back** to `/orders/<id>/confirmation`, either
   `?payment=returned` or `?payment=cancelled`. While the order is still
   awaiting payment, the page re-checks itself for about a minute.
5. **PayFast sends a payment notification (ITN)** to
   `https://<api>.onrender.com/api/v1/payment-methods/notify/payfast`. It
   goes to the API's own Render address (`RENDER_EXTERNAL_URL`), not
   through Cloudflare, so Cloudflare's bot protection can't block it. The
   order is marked paid only when **all four checks** pass:
   - the signature, over every field as sent (empty ones included) plus the
     passphrase;
   - the sender is PayFast: its published address ranges, or the addresses
     of www/sandbox/w1w/w2w.payfast.co.za;
   - the merchant ID is ours and the gross amount equals the order total;
   - PayFast's validate service answers `VALID` for the notification.
6. **Status `COMPLETE`.** The order is confirmed through the same path as
   staff confirming payment:
   - the paid date is recorded (it counts as a sale);
   - an issued invoice is marked paid;
   - the customer is notified;
   - PayFast's `pf_payment_id` is stored on the order as its payment
     reference.

   Repeats of the same notification change nothing. Any other status
   leaves the order awaiting payment.

Every notification is logged (`PaymentNotification`) with its outcome:
Paid, Already handled, Not paid or Rejected, plus the reason. The latest
20 show on **Admin → Payments**. PayFast always gets a 200 response, so it
doesn't keep retrying.

## Customer access

PayFast checkout is **open to customers** (owner's decision, October 2026).
An admin can set it to **staff only** on **Admin → Payments**. Customers
are then asked to choose another method, while staff can still pay through
it. Use this if PayFast pauses the account or something looks wrong.
**Open to customers** switches it back.

Before relying on it:

1. **PayFast setup.** In the PayFast dashboard, give PayFast the live
   domain (aaggregates.store) and switch on the payment methods you want.
   Until the account is cleared, PayFast's page says "This merchant
   account is currently not able to receive payments".
2. **Test payment.** Make one small real payment (PayFast's minimum is R5).
3. **Check it.** On **Admin → Payments**, the notification shows as
   *Paid — order confirmed*.
4. **Refund.** Refund the test payment from the PayFast dashboard and
   cancel the order.

## When something goes wrong

| Seen in Admin → Payments | Meaning |
|---|---|
| Rejected — "Signature didn't match" | `AGG_PAYFAST_PASSPHRASE` differs from the dashboard passphrase (spaces and capitals count) |
| Rejected — "Not sent from a PayFast server" | Someone other than PayFast called the endpoint, or PayFast's addresses changed — check PayFast's published list |
| Rejected — amount | The amount paid doesn't match the order total; don't release the order |
| Already handled — "order had been cancelled" | The customer paid a cancelled order: refund it from the PayFast dashboard |
| Nothing arrives | The PayFast page showed an error, or the notify URL isn't reachable: check that the API is up |
| PayFast page: "This merchant account is currently not able to receive payments" | PayFast hasn't finished clearing the account (website and policy pages under review). Nothing to change on our side |

A "signature mismatch" error on the PayFast payment page itself means the
merchant ID, key or passphrase on Render doesn't match the dashboard.

## Not built yet

- Refunds through the PayFast API. Refunds are made in the PayFast
  dashboard and recorded on the order in Admin, as before.
- Preselecting the method on PayFast's page (`payment_method`). It's left
  out until PayFast confirms the codes for our account.
