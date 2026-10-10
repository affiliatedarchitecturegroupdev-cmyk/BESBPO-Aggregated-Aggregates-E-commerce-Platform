# Complete the job

Every product page carries a **Complete the job** panel: the other materials the
same job needs, from any line — not just the product's own category — each with
one line on why it belongs. A paver page offers the sub-base, base course,
bedding sand, kerbs and haunching cement; a mesh page offers the chairs, DPM,
tie wire, screed sand and the ready-mix.

It sits above the existing "More in <category>" row, which stays as it was.

## How a product finds its job

The pairings live in `apps/web/src/data/complete-the-job.ts`.

- **Jobs** (`JOBS`): a title, a build stage (the same stages as project lists and
  Shop by Build Stage) and an ordered list of companions — SKU, reason, and the
  unit to offer when the product sells in more than one.
- **By category** (`BY_CATEGORY`): the default job for every product in a category.
- **By SKU** (`BY_SKU`): overrides where one category holds products for different
  jobs — plaster sand plasters, pipe bedding sand lays drains, road-stabilising
  cement builds road layers, brickforce builds walls.

The product itself and anything staff have hidden drop out, and at most six
companions show. A job left with fewer than two companions isn't shown.

| Job | Stage | Used by |
|---|---|---|
| Level and build up the site | Site prep | G8–G10 fill, pioneer layer, recycled aggregates |
| Build the layers for a driveway or road | Paving & roads | Sub-base & base course, crusher run |
| Stabilise the road layers | Paving & roads | Road-stabilising cements and binder |
| Lay the paving | Paving & roads | Pavers, kerbs & edging; washed river sand |
| Mix and reinforce the concrete | Foundations | Crushed stone, ballast, cement, grouts & admixtures, concrete sand |
| Pour the slab | Slabs | Ready-mix, mesh, DPM, filling and screed sand |
| Fix the steel and cast it | Foundations | Rebar, steel-fixing accessories |
| Fix the steelwork down | Foundations | Structural steel |
| Build the walls | Walls | Bricks & blocks, lintels/DPC, building sand, masonry cement, brickforce, wall ties, hoop iron |
| Plaster the walls | Walls | Plaster sand, hydrated lime |
| Lay the drain | Drainage | Pipes & fittings, pipe bedding sand |
| Build the French drain | Drainage | Drainage & filter stone, subsoil pipe, channel drain, geotextile |
| Install the precast drainage | Drainage | Precast drainage |
| Finish the garden and paths | Landscaping | Decorative stone, crusher dust, weed mat |
| Build the retaining wall | Landscaping | Retaining blocks, geogrid |
| Build the gabions | Landscaping | Gabions, gabion stone, rip rap |

Agricultural and dolomitic lime and silica sand have no job on purpose — they go to farms, blasting and filtration, not builds (`NO_JOB` and the unmapped agricultural category).

## Buying from the panel

- Priced companions have a quantity box and a tick. **Add to cart** adds the ticked
  lines and shows the running total at list price; the cart reprices everything
  through the pricing service as usual.
- Quantities start at one unit. Ready-mix starts at the plant's minimum load and is
  **not** ticked to begin with, so a full truck is never added by accident.
- Companions without a list price show **Price on quote** and link to their page.
- **Save these to a project** saves every companion under the job's stage
  (no quantities; anything already on the list keeps its quantity).
- **Everything for <stage>** opens Shop by Build Stage on that stage
  (`/shop-by-stage?stage=PAVING_ROADS`).

## Changing the pairings

Edit `JOBS`, `BY_CATEGORY` or `BY_SKU`. A companion SKU that no longer exists is
skipped rather than breaking the page, so after renaming products check that every
SKU in `COMPANION_SKUS` and `MAPPED_SKUS` still resolves with `findQuotable`.
New categories need a `BY_CATEGORY` entry to get a panel.
