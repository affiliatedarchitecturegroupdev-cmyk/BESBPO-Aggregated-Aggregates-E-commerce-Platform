# Notifications (email + WhatsApp)

The platform tells buyers and staff when something happens to an order,
quote or trade account. Every message is recorded in **Admin → Notifications**,
whether or not it could be sent, so staff can always see what a customer was
told and resend it.

Code: `apps/api/src/notifications/` (message texts live in
`notification-templates.ts`; delivery adapters in `providers.ts`).

## What is sent, and to whom

| Event | Customer email | Customer WhatsApp¹ | Staff email² |
|---|---|---|---|
| Order placed (awaiting payment) | ✓ order summary + "Pay for your order" link | — | ✓ |
| Order confirmed (payment received) | ✓ | ✓ `aa_order_confirmed` | — |
| Order dispatched | ✓ carrier + tracking reference | ✓ `aa_order_dispatched` | — |
| Order delivered | ✓ link to compliance documents | ✓ `aa_order_delivered` | — |
| Order cancelled | ✓ refund note | ✓ `aa_order_cancelled` | — |
| Quote request received | ✓ acknowledgement + reference | — | ✓ with the quote-only reason |
| Quote priced | ✓ quoted total | ✓ `aa_quote_priced` | — |
| Quote accepted / declined | — | — | ✓ |
| Trade application received | ✓ | — | ✓ |
| Trade application approved / declined | ✓ | — | — |
| Hire, service or partner enquiry received | ✓ acknowledgement + reference, "nothing booked until you accept" | — | ✓ with the form's answers and a link to Admin → Enquiries |

¹ Only to buyers who ticked "send updates on WhatsApp" at checkout or on the
quote form, and only for events an admin has switched on (off by default —
see below).
² To the staff inboxes listed in Admin → Notifications (or, until any are
added there, `STAFF_NOTIFICATION_EMAILS`).

Order messages go out when staff change the order's status in
**Admin → Orders**; saving the same status again (e.g. correcting a tracking
reference) doesn't message the customer twice. Payments are confirmed by
staff (EFT reconciliation today), so "payment received" is the move to
*Confirmed*.

Guest quote requesters (no account) can't accept online, so their "quote
priced" email asks them to reply instead of linking to the dashboard.

## Setting up email

Nothing is lost before this is done: messages are logged (status **Logged**)
and can be resent once a provider works.

1. Choose a transactional email provider. Supported out of the box:
   **Resend**, **Postmark** and **SendGrid** (all send over HTTPS; nothing to
   install). Another provider — or Microsoft 365 / Google Workspace SMTP — is a
   small adapter in `providers.ts`.
2. In the provider, verify the sending domain (`aggregates.store`) — add the
   SPF, DKIM and DMARC DNS records it gives you — and create an API key.
3. On the **aggregates-store-api** service in Render set:
   - `EMAIL_PROVIDER` — `resend`, `postmark` or `sendgrid`
   - `EMAIL_API_KEY` — the provider's API key (Postmark: the server token)
   - `EMAIL_FROM` — e.g. `Aggregated Aggregates <orders@aggregates.store>`
   - `EMAIL_REPLY_TO` (optional) — e.g. `sales@besbpo.co.za`, so customer
     replies reach a person
4. In **Admin → Notifications** (admins): add the staff inboxes, send a test
   email, then open the **Logged** filter and resend anything that matters.

Links in emails use `NEXT_PUBLIC_SITE_URL` on the API service (default
`https://aggregates.store`).

## Setting up WhatsApp notifications

Order and quote updates are *business-initiated* WhatsApp messages, so Meta
requires each to use a **message template** it has approved. This uses the
same WhatsApp Business account as WhatsApp Commerce (`WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_ACCESS_TOKEN`).

1. In Meta Business Manager → WhatsApp Manager → Message templates, create
   each template below: category **Utility**, language **English**
   (`WHATSAPP_TEMPLATE_LANGUAGE`, default `en`), with the body text exactly
   as shown (`{{1}}`, `{{2}}`… are filled in by the platform, in order).
2. Once a template is approved, switch **Customer WhatsApp** on for its event
   in **Admin → Notifications**.

| Template name | Body |
|---|---|
| `aa_order_confirmed` | Your Aggregated Aggregates order {{1}} is confirmed — payment received. Track it at {{2}} and we'll message you when it's dispatched. |
| `aa_order_dispatched` | Your Aggregated Aggregates order {{1}} is on its way with {{2}} (tracking reference {{3}}). Track it at {{4}} and please make sure the site is accessible for a tipper truck. |
| `aa_order_delivered` | Your Aggregated Aggregates order {{1}} has been delivered. Compliance documents are on your order record at {{2}} — thank you for your order. |
| `aa_order_cancelled` | Your Aggregated Aggregates order {{1}} has been cancelled. If you've already paid, our team will contact you about a refund. |
| `aa_quote_priced` | Your Aggregated Aggregates quote {{1}} is ready: {{2}}. We've emailed you the details — review and accept it at {{3}} or reply to our email. |

Sample values Meta asks for: order `AA-1790678251462`, carrier `Besfleet`,
tracking reference `BF-2044`, amount `R9,133.12`, links
`https://aggregates.store/orders/…/tracking`. The texts are also the
`WHATSAPP_TEMPLATES` constant in `notification-templates.ts` — change both
together (Meta re-reviews an edited template).

Numbers are stored as entered and converted to international format when
sent (`082 123 4567` → `27821234567`).

## Admin → Notifications

- **Status** — whether email and WhatsApp are live, and which variables are
  still missing; counts of failed and logged messages.
- **What gets sent** — per event, switch each available channel on or off
  (admins; staff see it read-only).
- **Staff inboxes** — who gets new-order, new-quote and application alerts.
- **Test the email set-up** — sends a one-off test (admins).
- **Recent messages** — the log, filterable by Failed / Logged / Sent, with
  the full text of each message and **Resend** for failed or logged ones.

A notification problem never blocks the order, quote or review that caused
it: the change is saved first, and delivery happens in the background.

## POPIA

These are transactional messages about the customer's own order, quote or
account (no marketing), sent to the contact details they gave for it.
WhatsApp is strictly opt-in per order or quote. Message bodies are kept in
the database as the record of what was sent; they contain the order/quote
details and delivery address, so access is limited to staff.
