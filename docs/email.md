# Email: Resend (transactional) and Listmonk (newsletters)

Two systems, two jobs:

| | Resend | Listmonk |
|---|---|---|
| What | Order, account and system emails — one person, one event | Newsletters and campaigns — many people, one send |
| Where it runs | Resend's service (HTTPS API) | Our Render account (`aggregates-listmonk`, its own Postgres) |
| Consent | Not needed: these are about the person's own order or account | POPIA s69 opt-in, confirmed by email (double opt-in) |
| Record of truth | The notification log (Admin → Notifications) | The platform's subscriber list (Admin → Newsletter); Listmonk gets a copy |
| Sending address | `orders@aaggregates.store` (suggested) | `news@news.aaggregates.store` (suggested — a subdomain keeps campaign reputation apart from order email) |

The general notification system (events, channels, admin switches,
WhatsApp) is in [notifications.md](notifications.md).

## Transactional email (Resend)

### What's sent

Everything in [notifications.md](notifications.md#what-is-sent-and-to-whom),
in one branded layout (`email()` in `apps/api/src/notifications/notification-templates.ts`):
a basalt header with the logo mark drawn in table cells (it shows even when
images are blocked), an ochre rule, a white card, branded buttons, and a
footer with the company name, registration number, address, phone, email
and Privacy Policy link. The first paragraph is the inbox preview text.

New in this release:

| Email | When | Notes |
|---|---|---|
| **Payment receipt** | An order is confirmed paid (PayFast ITN or staff) | Amount paid, date, method and gateway reference, then the order, with the **order confirmation PDF attached**. Later payments (a balance, a payment link) send a receipt with the updated PDF too. Replaces the old "order confirmed" email. |
| **Tax invoice ready** | Staff issue the tax invoice | Invoice number and total, with the **tax invoice PDF attached**. Switchable on Admin → Notifications. |
| **Confirm your email address** | Email sign-up | Link valid 48 hours; "Send the link again" on the account dashboard (max 3 an hour). |
| **Reset your password** | "Forgot your password?" on the sign-in page | Link valid 60 minutes, single use, max 3 an hour per account. The page answers the same whether or not the account exists. |
| **Confirm your newsletter subscription** | Newsletter sign-up | Double opt-in — see below. One per address per 10 minutes. |

The last three are **system emails**: always sent (no admin switch), and
their one-time link is **never stored** — the log keeps a copy with the link
removed, so staff can see it went out but can't resend it or use the link.
Only a SHA-256 of reset and verification tokens is kept in the database.

### Password reset and email verification

- `/account/forgot-password` → email → `/account/reset-password?token=…`.
  Saving the new password signs the person in, marks the address as
  verified (they proved they own the mailbox), and **signs out every other
  session** (`User.sessionsValidFrom`; the auth guard rejects older tokens).
- Email sign-ups get a verification email; the account dashboard shows a
  banner until it's confirmed. Google, Facebook and X sign-ins whose
  provider vouches for the address count as verified. Unverified accounts
  can still order — the banner is a nudge, not a gate.
- Both confirmation pages need a button click, so link scanners in mail
  filters can't use the links.

### Delivery reports and suppression (Resend webhook)

`POST /api/v1/email/webhooks/resend`, verified with the endpoint's signing
secret (Svix scheme: HMAC-SHA256 over `id.timestamp.body`, 5-minute
tolerance). Without `RESEND_WEBHOOK_SECRET` it refuses everything (503).

- `email.delivered`, `email.delivery_delayed`, `email.bounced`,
  `email.complained` are recorded on the message (Admin → Notifications shows
  a Delivered / Delayed / Bounced / Marked-as-spam badge). Worse news wins: a
  late "delivered" never hides a bounce.
- A **hard bounce** or **spam complaint** adds the address to the
  **suppression list**: later emails to it are not sent (logged as failed,
  "suppressed"). A soft (transient) bounce doesn't suppress.
- A spam complaint also **unsubscribes the newsletter** (and blocklists the
  address in Listmonk).
- Admins can lift a suppression (the mailbox is fixed) or add one by hand.
  System emails the person has just asked for still go through.

## Newsletters (Listmonk)

### Double opt-in

1. The footer form records the sign-up with its consent (POPIA s69), unconfirmed.
2. We email a confirmation link (`/newsletter/confirm?token=…`, one click on the page).
3. Only then is the subscriber **confirmed** — exported, and sent to Listmonk.
4. Unconfirmed sign-ups are deleted after 30 days.

Subscribers from before double opt-in ticked the consent box; the migration
marks them confirmed as of their consent date.

### Sync

- **On confirm** — pushed to Listmonk straight away, already confirmed
  (`preconfirm_subscriptions`), on the lists in `LISTMONK_LIST_IDS`, with
  attributes `audience`, `province`, `source`, `consent_at`, `confirmed_at`
  and `unsubscribe_url`.
- **On unsubscribe** (our link, or a spam complaint) — blocklisted in Listmonk.
- **On erasure** (Admin → Newsletter → Erase, POPIA) — deleted from Listmonk.
- **Every hour, and "Sync now"** on Admin → Newsletter — unsubscribes made in
  Listmonk (its own link, or blocklisting there) come back to the platform;
  confirmed subscribers not yet in Listmonk, or whose last push failed, are
  pushed again; old unconfirmed sign-ups are deleted. `LISTMONK_SYNC=off`
  stops the hourly run.
- Until Listmonk is configured nothing is sent there; sign-ups wait in the
  database and Admin → Newsletter says what's missing.

### Campaign template

[`docs/listmonk/campaign-template.html`](listmonk/campaign-template.html) —
paste into Listmonk (Campaigns → Templates → New, type *Campaign*) and make it
the default. It matches the transactional layout and puts **our**
unsubscribe link (`{{ .Subscriber.Attribs.unsubscribe_url }}`) in the footer,
so the unsubscribe lands on the consent record first; Listmonk's own link is
the fallback. Open/click tracking is left off — the Privacy Policy doesn't
cover it.

## What you need to do

Secrets go only in Render's environment settings — never in the repository
or in chat.

### 1. Resend (transactional)

1. Create a Resend account (team account on the Besbpo email).
2. **Domains → Add domain** → `aaggregates.store`. Add the DNS records Resend
   shows (SPF `TXT`, DKIM `TXT` records, and the bounce `MX`) in
   **Cloudflare DNS**, set to *DNS only* (grey cloud). Wait for *Verified*.
3. Add a **DMARC** record in Cloudflare if there isn't one:
   `_dmarc.aaggregates.store TXT "v=DMARC1; p=none; rua=mailto:dmarc@aaggregates.store"`
   (move to `p=quarantine` once reports look clean).
4. **API Keys → Create** — permission *Sending access*, domain
   `aaggregates.store`.
5. **Webhooks → Add endpoint** — URL
   `https://<api service>.onrender.com/api/v1/email/webhooks/resend` (the API's
   own Render address, like the PayFast notify URL), events *delivered,
   delivery_delayed, bounced, complained*. Copy the signing secret (`whsec_…`).
6. On **aggregates-store-api** in Render set:
   - `EMAIL_PROVIDER` = `resend`
   - `EMAIL_API_KEY` = the API key
   - `EMAIL_FROM` = `Aggregated Aggregates <orders@aaggregates.store>`
   - `EMAIL_REPLY_TO` = the sales inbox customers should reply to
   - `RESEND_WEBHOOK_SECRET` = the `whsec_…` secret
7. Admin → Notifications → **Send test**, then resend anything *Logged*.

### 2. Listmonk (newsletters)

1. **Render → Blueprints → sync** creates `aggregates-listmonk` (web service,
   `listmonk/listmonk:v4.1.0`) and `aggregates-listmonk-db` (Postgres). Both
   are paid Render resources — check the plan before approving. Set
   `LISTMONK_ADMIN_USER` and a strong `LISTMONK_ADMIN_PASSWORD` when asked.
2. Optional: add a custom domain such as `news-admin.aaggregates.store` to the
   Listmonk service (Cloudflare CNAME, DNS only).
3. Sign in to Listmonk. **Settings → General**: Root URL = the address above;
   From = `Aggregated Aggregates <news@news.aaggregates.store>`.
4. In Resend, add the domain `news.aaggregates.store` (same DNS steps) and
   create a second API key for it. In Listmonk **Settings → SMTP**: host
   `smtp.resend.com`, port `465`, TLS, auth *login*, username `resend`,
   password = that API key. Send Listmonk's test email.
5. **Lists → New**: e.g. *Aggregated Aggregates newsletter* — type *Private*,
   opt-in *Single* (people have already confirmed with us). Note its ID.
6. **Users → API users → New** (e.g. `aa-platform`), role with subscriber
   and list permissions. Copy the token.
7. On **aggregates-store-api** set `LISTMONK_API_USER`, `LISTMONK_API_TOKEN`,
   and `LISTMONK_LIST_IDS` (the list ID, or several comma-separated).
   `LISTMONK_URL` is filled in by the Blueprint (private network).
8. **Campaigns → Templates**: add the campaign template above and set it as
   default.
9. Admin → Newsletter → **Sync now** — existing confirmed subscribers appear in
   Listmonk.

Listmonk keeps uploaded media on the service's disk, which Render resets on
deploy; put campaign images on the storefront (or S3) and link to them.
