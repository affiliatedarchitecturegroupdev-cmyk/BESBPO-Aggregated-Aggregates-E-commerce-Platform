# Best With

"Frequently bought together", run from our own orders. It shows on every
product page (in the Complete the job panel) and in the cart ("Complete your
build").

## What customers see, in order

1. **Pins** — pairings staff choose, with an optional line on why
   ("Lime makes the plaster workable").
2. **Bought together** — products customers actually buy with this one, from
   paid orders, labelled "Often bought together".
3. **The job's checklist** — the rest of the job the product belongs to
   (`COMPLETE_THE_JOB.md`). This is the relational map, so the panel is useful
   before there are any orders, and order data takes over as it builds up.

Up to six show on a product page and four in the cart. Products already in
the cart, hidden products and anything staff hid are left out. Customers
never see order counts or percentages — sales volumes stay private.

## How the order pairings are worked out

`apps/api/src/merchandising/best-with.ts`, rebuilt daily (a few minutes after
the API starts, then every 24 hours; **Rebuild now** on the admin page runs it
at once). `BEST_WITH=off` stops the schedule.

- Only **paid, non-test, uncancelled** orders count — mark test orders as
  test (Admin → Orders) and they never influence suggestions.
- A pairing counts once it appears in **3 different orders** (`MIN_ORDERS`),
  so one large order can't decide what everyone sees.
- For product A and product B bought with it:
  - **Share (confidence)** — of the orders with A, how many also had B;
  - **Lift** — that share against how common B is overall (above 1 means
    more often than chance).
- Each product keeps its 12 strongest pairings, strongest share first.

## Admin → Best With

- **Pins and hides** by SKU: pin to show a product first on another product's
  page (with the note customers see), hide to never suggest it there.
  Rules are one-way: pin A → B affects A's page only.
- **Bought together** — the top pairings with their orders, share and lift.
- **Rebuild now** — recompute the pairings from the orders.

Product pages refresh their suggestions hourly; a rule or rebuild from the
admin page refreshes them straight away.

## API

| Endpoint | Who | What |
|---|---|---|
| `GET /merchandising/best-with?skus=A,B&limit=6` | Public | Suggestions: `{ sku, source: PINNED \| ORDERS, note }` |
| `GET /merchandising/best-with/overview` | Staff | Pairings with numbers, rules, last rebuild |
| `PUT /merchandising/best-with/rules` | Staff | `{ productSku, pairedSku, action: PIN \| HIDE, note? }` |
| `DELETE /merchandising/best-with/rules` | Staff | `{ productSku, pairedSku }` |
| `POST /merchandising/best-with/recompute` | Staff | Rebuild now |
