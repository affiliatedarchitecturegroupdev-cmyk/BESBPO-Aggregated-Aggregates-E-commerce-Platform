# Tests and uptime alerts

## CI (`.github/workflows/ci.yml`)

On every push to `main` and every pull request:

- **pricing**: `pytest` for the pricing service.
- **api**: Postgres 16 service, migrate + seed, partner suppliers seeded,
  the pricing service started, then the API's unit tests and end-to-end
  tests (against the real database and pricing service).
- **web**: type check and production build of the storefront.

No secrets are used.

## Deep health check

`GET /api/v1/health/deep` checks the **database**, the **pricing service**
and **file storage** (when configured), each with a 5-second timeout. 200
with `status: ok`, or 503 with `status: degraded` — public, but only up/down
and timings (no error details). `/api/v1/health` (Render's check) is
unchanged.

## The API's own monitor

Every 5 minutes the API runs the same checks. A component that fails **twice
in a row** sends staff a *Site check FAILING* email (`SERVICE_DOWN`), and
another when it **recovers** — never a stream of repeats.
`UPTIME_MONITOR=off` turns it off (it's off in tests).

## Outside check (`.github/workflows/uptime.yml`)

Every 15 minutes GitHub Actions requests the storefront and the deep health
check (three tries, 20 s apart). A failed run is emailed by GitHub to the
people set to get Actions notifications. It covers what the API can't
report itself — the API or the storefront being down.

### What you need to do

1. In the repository: *Settings → Secrets and variables → Actions →
   Variables*, add `SITE_URL` (`https://aaggregates.store`) and
   `API_HEALTH_URL` (the API's `https://<api service>.onrender.com/api/v1/health/deep`).
   Until they're set, the workflow only prints a notice.
2. Make sure your GitHub notification settings email you about failed
   workflow runs.
3. Staff recipients for `SERVICE_DOWN` are the usual staff inboxes
   (*Admin → Notifications*).
