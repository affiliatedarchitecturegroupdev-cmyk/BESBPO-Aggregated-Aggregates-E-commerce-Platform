# Project Lists — the wishlist, built for construction (Oct 2026)

> **Where it lives in this repo:** API `apps/api/src/project-lists/`
> (`/api/v1/project-lists`), database `ProjectList` / `ProjectListItem` /
> `BuildStage` (migration `20261016090000_project_lists`), web
> `apps/web/src/lib/project-lists.ts`, `components/projects/`
> (`SaveToProject`, `ProjectBoard`), `/account/projects`,
> `/account/projects/[id]` and `/projects/shared/[token]`.

## Why not a heart list

Nobody buys stone, cement and rebar because they like the look of it — they
buy it for a job. So instead of a flat "favourites" list, customers save
materials **against a named project** ("House 14 — foundations"), **under the
build stage it's for**, with a quantity when they know it. The list then
reads like the job and answers the questions a builder actually has: what
will it cost, how much has to be delivered, and what still needs a price.

## What the customer gets

- **Save to project** on every product page (aggregates, cement and other
  packaged goods, ready-mix, steel). Pick a project or start one in the same
  panel, the build stage (pre-selected from the category — rebar and stone
  default to Foundations, mesh to Slabs, sand to Walls, and so on; the
  customer can change it), an optional quantity and unit, and a note.
  Signed-out visitors are asked to sign in and come back to the same page.
- **Build stages, in build order:** Site prep & earthworks, Foundations,
  Surface beds & slabs, Walls & superstructure, Paving/driveways/roads,
  Drainage & services, Landscaping, Not yet sorted.
- **The project board:** each stage with its materials and subtotal, and
  four totals —
  - **Estimated materials** at today's retail list price, for priced units
    with a quantity;
  - **To be quoted** — units that are quote-only (never guessed);
  - **Weight to deliver** in tonnes — aggregates by bulk density or bag
    weight, cement bags and bulk, steel lengths by their SANS 920 mass;
  - **Ready-mix** in m³ (it comes on the plant's truck, so it isn't added
    to the tonnage).
  Lines with no quantity are flagged. Quantities, units, stages and notes
  are edited in place.
- **One step to buy:** "Add N priced lines to cart" (the cart and checkout
  re-price with the customer's tier as usual) or "Request a quote for the
  list" (prefills the quote form with every line that has a quantity, and
  the project name in the notes). Print / save as PDF for site meetings.
- **Share with the team:** an unguessable link (`/projects/shared/…`) shows
  the list read-only — products, stages, quantities, notes — but never the
  owner's name, email or account. The builder or QS can order or quote
  from it, or **save a copy** to their own account. Sharing can be turned
  off at any time; the old link then stops working.
- **Duplicate for another job** (e.g. the next house on the same plans)
  and delete.

## Rules

- A product is saved in a unit it is actually sold in, and only while the
  product is active; packaged and steel units take whole quantities.
- Saving the same product and unit again updates that line rather than
  adding a duplicate.
- Limits: 25 projects per customer, 80 lines per project.
- Estimates are labelled as list-price estimates; tier pricing, delivery
  and quoted items are confirmed at checkout or on the quote.
- Shared pages are `noindex`.
