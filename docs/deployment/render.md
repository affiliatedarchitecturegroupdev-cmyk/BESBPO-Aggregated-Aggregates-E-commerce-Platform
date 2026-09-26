# Deploying to Render (Blueprint)

`render.yaml` at the repository root defines three services:

| Service | Type | What it runs | Public? |
|---|---|---|---|
| `aggregates-store-web` | Web service (Node 22) | Next.js storefront | Yes |
| `aggregates-store-api` | Web service (Node 22) | NestJS API; runs DB migrations and the catalogue sync before each deploy | Yes |
| `aggregates-store-pricing` | Private service (Python 3.12) | FastAPI pricing service | No — only the API can reach it |

All three run on the `starter` plan in `frankfurt`. Pre-deploy commands and
private services both need a paid plan, so the free tier won't work.

## 1. Create the database (Supabase)

The confirmed architecture uses Supabase Postgres, so the Blueprint doesn't
create a Render database.

1. Create a Supabase project. Choose the region closest to the Render region;
   `eu-central-1` (Frankfurt) matches the Blueprint.
2. In **Project Settings → Database → Connection string**, copy two URIs and
   put your database password into each:
   - **`DATABASE_URL`**: the **Transaction pooler** URI (port `6543`), with
     `?pgbouncer=true&connection_limit=1` appended. The API uses it at runtime.
   - **`DIRECT_URL`**: the **Session pooler** or direct URI (port `5432`).
     Prisma uses it to run migrations.

## 2. Create the Blueprint

1. In the Render dashboard, choose **New → Blueprint**.
2. Connect the GitHub repository and pick the branch to deploy. Render reads
   `render.yaml` from the repository root.
3. Render asks for the two values marked `sync: false`. Paste in
   `DATABASE_URL` and `DIRECT_URL` from step 1. Every other value is set by
   the Blueprint:
   - `AUTH_SECRET` is generated.
   - `PRICING_SERVICE_URL` points at the private pricing service.
   - `SEED_PLACEHOLDER_SUPPLIERS=false` keeps the made-up development
     suppliers out of the real database.
4. Click **Apply**. The first deploy takes a few minutes.

On each API deploy, the pre-deploy step runs `pnpm run db:deploy`:

1. `prisma migrate deploy` applies any new migrations in
   `packages/database/prisma/migrations`.
2. `prisma/seed.ts` then updates the 9 categories, 48 products, price bands,
   customer tiers and delivery bands from the pricing framework workbook. Every
   write is an upsert, so running it on every deploy is safe, and a workbook
   change reaches the database on the next API deploy.

## 3. Check the deploy

- **Storefront:** `https://aggregates-store-web.onrender.com`. Render may add
  a suffix if the name is taken; the dashboard shows the real URL.
- **API health:** `https://aggregates-store-api.onrender.com/api/v1/health`
  should return
  ```json
  {"status":"ok","database":"ok","pricing":{"status":"ok","pricing_framework":{"version":"1.0", ...}}}
  ```
  Render also uses this path as its health check. It fails only when the
  database is unreachable. If the pricing service is down, the endpoint
  reports `"pricing": {"status": "unreachable"}` but still returns 200.
- **Price an order from the command line.** Replace the placeholders with your
  API URL and a product id from the `Product` table:
  ```bash
  curl -X POST https://<api-url>/api/v1/orders -H 'content-type: application/json' \
    -d '{"deliveryDistanceKm":45,"lineItems":[{"productId":"<id of AA-SBC-05>","unitOfSale":"BULK_M3","quantity":12}]}'
  ```
  The response should show subtotal 4332.96, delivery fee 950 and total 5282.96.

## Later: custom domains and optional settings

| When | Set on | Variable / action |
|---|---|---|
| Going live on `aggregates.store` | web | Add the custom domain in Render; set `NEXT_PUBLIC_SITE_URL=https://aggregates.store` (used for canonical URLs and the sitemap; it falls back to the Render URL) |
| Going live on `app.aggregates.store` | api | Add the custom domain; set `NEXT_PUBLIC_APP_URL=https://app.aggregates.store` (used for OAuth callbacks; it falls back to the Render URL) |
| When the storefront starts calling the API from the browser | api | `CORS_ORIGINS` — comma-separated storefront origins |
| Enabling Google / Microsoft sign-in | api | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| When queues are wired in | api | `REDIS_URL` (Upstash) |

## Notes

- **Data residency.** The spec's infrastructure standard names AWS
  `af-south-1` for data sovereignty. Render has no African region, so the
  Blueprint uses Frankfurt as the closest. Confirm this is acceptable for
  production data, or plan the af-south-1 path in `infra/terraform`.
- **Package manager.** The build runs pnpm 9.9.0 through `npx`, matching the
  `packageManager` field, so it doesn't depend on Corepack being enabled on
  Render. `--frozen-lockfile` fails the build if `pnpm-lock.yaml` is out of
  date.
- **Don't set `NODE_ENV=production` at build time.** pnpm would then skip dev
  dependencies, which the build needs (Nest CLI, Prisma CLI, ts-node for the
  seed).
