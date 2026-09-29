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
   - `AUTH_SECRET` is generated. It signs session tokens.
   - `PRICING_SERVICE_URL` points the API at the private pricing service.
   - `API_URL` points the storefront at the API over Render's private network.
     The browser never calls the API directly.
4. Click **Apply**. The first deploy takes a few minutes.

On each API deploy, the pre-deploy step runs:

1. `prisma migrate deploy`, which applies any new migrations in
   `packages/database/prisma/migrations`.
2. `prisma/seed.ts`, which updates the 9 core categories, 48 products, price
   bands, customer tiers and delivery bands from the pricing framework
   workbook, and the 2 B2B categories and 7 packaged products from
   `services/pricing/data/b2b_packaged_catalogue.json`. Every write is an
   upsert, so a workbook change reaches the database on the next deploy.
   Payment routing, the four starter promotions and the three starter blog
   posts are created once and then left to the admin.
3. `apps/api/dist/suppliers/seed-suppliers.js`, which adds any supplier from
   `packages/database/prisma/seed-data/*.csv` that isn't in the database yet
   (87 verified partners and 18 B2B leads on the first deploy). Existing
   suppliers — and staff edits to them — are never touched.

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

## 4. Set up document storage

Staff upload SANS references and Certificates of Analysis. The files are
kept in Supabase Storage.

1. In Supabase, go to **Storage → New bucket**, name it
   `compliance-documents`, and leave **Public bucket** off. The API serves
   every file and checks who may see it: product documents are public, and
   order documents are visible only to that order's buyer and staff.
2. In **Project Settings → API**, copy the **Project URL** and the
   **service_role** key.
3. In Render, open **aggregates-store-api → Environment** and set
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The Blueprint lists both
   without values. The service-role key bypasses Supabase's access rules, so
   it belongs only on the API, never on the storefront.

Until these are set, the site works normally, but uploads return "Document
storage isn't configured yet". The API's startup log shows
`Document storage: supabase` once it's connected.

## 5. Create the first staff account

Staff approve trade accounts and price quote requests in the staff console,
`/account/staff`. Roles can't be granted through the website.

1. Register normally on the storefront.
2. In Render, open **aggregates-store-api → Shell** and run:
   ```bash
   npx --yes pnpm@9.9.0 run db:set-role you@besbpo.co.za STAFF   # or ADMIN
   ```
3. Sign out and back in. The dashboard now links to **Admin** (`/admin`), where
   staff can:
   - review trade applications;
   - price quote requests;
   - upload compliance documents;
   - manage product descriptions, photos, visibility and featured products;
   - edit the announcement bar, homepage hero, homepage slideshow and trade promo;
   - run the four promotion slots (the ad system): upload banner images to
     the image library, target the category banner at one category or
     industry listing, and see impressions, clicks and click-through rate;
   - manage online orders (`/admin/orders`): confirm, dispatch with Besfleet
     or an external partner and a tracking reference, mark delivered or
     cancel;
   - write and publish blog articles;
   - manage the partner-supplier network (see step 6);
   - work WhatsApp chat orders;
   - see every email and WhatsApp message sent to customers and staff, and
     resend failed ones (**Notifications**; admins also choose what is sent
     and which staff inboxes get alerts);
   - change payment routing (admins only — see step 7).

   Storefront changes go live within a minute. Prices can't be edited in the
   admin; they come from the pricing workbook.

## 6. Pin the supplier network

The first deploy seeds the network from the CSVs in
`packages/database/prisma/seed-data/`: 87 verified partners (KwaZulu-Natal
and Gauteng ones active) and 18 B2B Bulk & Infrastructure leads (inactive,
labelled as leads). To bring in a revised list later:

1. Sign in as staff and open **Admin → Suppliers** (`/admin/suppliers`).
2. Upload the CSV (either layout — the partner database or the B2B research
   list) and keep **New suppliers outside KwaZulu-Natal and Gauteng start
   inactive** ticked. The import matches rows on `supplier_id`, so importing
   the same file again updates suppliers rather than duplicating them. A file
   with any bad row is rejected whole, with every problem listed by line
   number.
3. Add a **map pin** (latitude and longitude) for each active supplier. The
   CSV has no coordinates, and a supplier without a pin never counts toward
   distance estimates. Either:
   - edit suppliers one at a time; or
   - click **Export the CSV**, fill the `latitude` and `longitude` columns in
     a spreadsheet, and import the file again. Re-imports keep existing pins,
     contacts and edits unless the file sets them.

   Take each pin from the supplier's loading gate on a map. Don't estimate
   it: a wrong pin moves customers into the wrong 30/60/100km delivery band.
4. The admin overview counts active suppliers still without a pin. Until at
   least one has a pin, `/delivery-areas` shows provinces and towns but hides
   the **Use my location** finder.

The public partner-network page (`/suppliers`) shows supplier names, towns,
addresses and categories, with researched leads listed separately. Contact
details and map pins are staff-only — keep exported CSVs (which include
them) off shared drives and out of the repository.

## 7. Email, payments and WhatsApp (when the accounts exist)

Nothing here blocks a deploy: until credentials are set, online payment
methods tell the buyer to choose another method (Manual EFT / purchase order
works today for trade accounts), and emails and WhatsApp messages are logged
in **Admin → Notifications** rather than sent.

- **Email.** Verify `aggregates.store` with a transactional email provider
  (Resend, Postmark or SendGrid), then set `EMAIL_PROVIDER`, `EMAIL_API_KEY`,
  `EMAIL_FROM` and optionally `EMAIL_REPLY_TO` on **aggregates-store-api**.
  In **Admin → Notifications**, add the staff inboxes, send a test email and
  resend anything logged. Full steps: `docs/notifications.md`.

- **Payment gateways.** Set the merchant variables for each provider on
  **aggregates-store-api** (PayFast: `PAYFAST_MERCHANT_ID`,
  `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`; Peach: `PEACH_ENTITY_ID`,
  `PEACH_AUTH_TOKEN`; Ozow: `OZOW_SITE_CODE`, `OZOW_PRIVATE_KEY`,
  `OZOW_API_KEY`; Stitch: `STITCH_CLIENT_ID`, `STITCH_CLIENT_SECRET`;
  Lulapay: `LULAPAY_API_KEY`, `LULAPAY_MERCHANT_ID`). **Admin → Payments**
  shows what each gateway still needs. Each adapter's request signing is
  then built against the provider's sandbox before it is switched live.
- **WhatsApp Business.** In Meta Business Manager, point the WhatsApp
  webhook at `https://<api-url>/api/v1/channels/whatsapp/webhook`, and set
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (any secret you choose, entered in both
  places), `WHATSAPP_APP_SECRET` (the Meta app secret — deliveries without a
  valid signature are rejected), `WHATSAPP_PHONE_NUMBER_ID` and
  `WHATSAPP_ACCESS_TOKEN`. Chats appear in **Admin → WhatsApp orders**.
  For order and quote updates on WhatsApp, submit the five message templates
  in `docs/notifications.md` for approval, then switch each on in
  **Admin → Notifications**.
- **Instagram / Facebook Shop.** In Meta Commerce Manager, add a scheduled
  data feed pointing at `https://<api-url>/api/v1/channels/catalogue-feed.csv`.
  Only products with a photo and a real retail price are listed, so upload
  product photography first.

## Later: custom domains and optional settings

| When | Set on | Variable / action |
|---|---|---|
| Going live on `aggregates.store` | web | Add the custom domain in Render; set `NEXT_PUBLIC_SITE_URL=https://aggregates.store` (used for canonical URLs and the sitemap; it falls back to the Render URL) |
| Going live on `app.aggregates.store` | api | Add the custom domain; set `NEXT_PUBLIC_APP_URL=https://app.aggregates.store` (used for OAuth callbacks; it falls back to the Render URL) |
| When the storefront starts calling the API from the browser | api | `CORS_ORIGINS` — comma-separated storefront origins |
| Enabling Google / Microsoft sign-in | api | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| When queues are wired in | api | `REDIS_URL` (Upstash) |
| Going live on `aggregates.store` | api | `NEXT_PUBLIC_SITE_URL=https://aggregates.store` (payment return links, links in emails and WhatsApp messages, and the catalogue feed's product links) |

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
