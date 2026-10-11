# Shopping assistant

A chat panel on every storefront page ("Ask us", bottom right) that knows
the page you're on and what's in your cart. The owner asked for an
assistant that costs nothing to run — no paid AI service — so it is a
**rules engine over the store's own data**, built so that a model can be
swapped in later without touching the widget or the API.

## What it does

| Ask | It answers with |
|---|---|
| A product ("river sand", "Y16 price", "0.47 IBR") | List prices per unit, typical uses, the product card with **Add to cart** (or **Request a quote** when priced on request). Ready-mix gives its truck minimum; roof sheets give the cut-to-length range and the no-refund rule. |
| A job ("what do I need for a driveway / slab / French drain / roof") | The job's materials from *Complete the job* with the reason for each, leaving out what's already in the cart, and a link to that build stage. |
| A quantity ("tons of G5 for 6 x 4 m, 150 mm deep", "bricks for a 12 m × 1.8 m wall", "paving 8 x 5", "120 m of Y12", "concrete 3 x 3 x 150 mm") | Volume → tons by the product's bulk density; wall area → bricks or blocks with 5% breakage; area → pavers plus 30 mm bedding sand; bar metres → kg and 6 m lengths (SANS 920); concrete → m³ and the ready-mix truck minimum. The card adds that quantity. Roofs go to the roof calculator. If sizes are missing it asks, and the next message ("6 by 4 by 50mm") answers it. |
| "Is this good for plaster?" on a product page | Yes/no from the product's listed uses; if not, what the job takes instead. |
| "What else do I need?" | The companions for the product on the page, or for everything in the cart. |
| "Check my cart" | The lines, the total at retail list prices (before delivery and trade discounts — checkout confirms), and what the jobs usually also need. |
| Delivery ("do you deliver to Polokwane?") | Matches the town (and its suburbs/aliases) on the coverage list; otherwise the published FAQ answer and a quote link. |
| Payment, trade accounts, returns, order status, a person | The published FAQ or policy wording, with links; returns cover the cut-to-length no-refund rule. Order status points to the account — the assistant can't see accounts. |
| Hire and site services | The matching machines and services, and the published reason hire is quoted. |
| Design (plans, engineer, NHBRC, BoQ…) | The matching BAE service and its approved fee (excl. VAT) — R/m² services worked out for the floor area given — and the statutory NHBRC fee on an amount. |
| Anything else | The closest pages, a quote link and WhatsApp. |

## Rules it keeps

- **Only our data.** Prices are the catalogue's retail list prices; a
  product without one is "priced on request". Answers about delivery,
  payment, trade tiers, hire and returns reuse the published FAQ and policy
  wording (`data/faqs.ts` now feeds both /faq and the assistant).
- **Hidden products** (Admin → Products) are never shown or suggested.
- **It says what it is**: "an automated helper that works from our own
  catalogue", and that a quote or checkout confirms the price.
- **Nothing stored.** The API route doesn't log or keep questions; the
  conversation lives in the browser tab (sessionStorage `aa-assistant`) and
  is gone when the tab closes or on **Clear chat**. The panel asks people
  not to type personal details. Privacy Policy §3A and the Cookie Policy
  say so.
- **Rate limit**: 30 questions a minute per address; messages are capped
  at 500 characters.
- Not shown on /admin or the partner portal.

## How it's built

- `apps/web/src/lib/assistant/`
  - `types.ts` — the `AssistantEngine` interface, context (path, product
    on the page, cart, hidden SKUs), reply (text, cards, links,
    suggestions) and the small state carried between turns.
  - `text.ts` — normalising, tokens, plurals, trade synonyms ("premix",
    "chromadek", "bobcat", "y-bar"…), and numbers with units.
  - `knowledge.ts` — the index over `QUOTABLE` (every cart/quote product)
    with typical uses and categories, plus pages, FAQs, hire and design
    services; ranking and "is it clearly one product" checks; cards.
  - `rules-engine.ts` — the intents above, in order, and the quantity
    maths (reusing `wallTakeOff`, `barTakeOff`, bulk densities and
    `resolveJob` from *Complete the job*).
  - `index.ts` — picks the engine from `ASSISTANT_ENGINE` (default and
    only value today: `rules`).
- `app/api/assistant/route.ts` — POST `{ message, path, cart, state }`;
  validates everything, resolves the product from `/products/<slug>`,
  applies hidden SKUs and the rate limit.
- `components/assistant/ShoppingAssistant.tsx` — the launcher and panel,
  mounted in the root layout; greets with the product on product pages;
  cards add straight to the cart.

## Swapping in a model later

Write another `AssistantEngine` (for example one calling a self-hosted
open model) and register it in `lib/assistant/index.ts`; set
`ASSISTANT_ENGINE` on Render. Keep the rules engine's tools — product
search, prices, quantity maths, jobs — as the model's only sources so it
can't invent prices or policy. Any engine that sends questions to an
outside service needs the Privacy Policy updated first.

## Extending it

- New words for an existing product: add synonyms in `text.ts`.
- A new job: add it to *Complete the job* and a phrase in `JOB_WORDS`.
- A new FAQ: add it to `data/faqs.ts` — it shows on /faq and the
  assistant can answer it.
