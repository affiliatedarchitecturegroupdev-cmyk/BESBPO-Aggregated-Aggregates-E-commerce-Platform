# Shop by Build Stage (Oct 2026)

> **Where it lives in this repo:** `apps/web/src/data/build-stages.ts` (the
> stages, picks, categories, hire and tools), `components/merchandising/`
> `ShopByStage.tsx` (server) and `StageShop.tsx` (tabs), on the homepage under
> Shop by Category and at `/shop-by-stage`. "Save this stage to a project"
> is `components/projects/SaveStageToProject.tsx` with the
> `saveStageToProject` action (`app/account/projects/actions.ts`).

## What it is

The range arranged the way a job is built. Ten stages, in build order —
the same stages as project lists (`PROJECT_LISTS.md`):

| Stage | Picks today | Hire & services |
|---|---|---|
| Site prep & earthworks | G10 selected fill, G7 sub-base, G5, dump rock pioneer layer, recycled concrete, filling sand | Site clearing, TLB, padfoot roller, water truck, skip |
| Foundations | 25 MPa ready-mix, 19 mm stone, concrete sand, 42,5N cement, Y12, tie wire | Mini excavator, TLB, steel fixing, rubble removal |
| Surface beds & slabs | 25 and 30 MPa ready-mix, Ref 193 mesh, bar chairs, 250 µm DPM, screed sand | 1–3 t roller, steel fixing, site dumper |
| Walls & superstructure | Clay stock bricks, 140 mm blocks, building sand, 32,5N cement, 110 mm DPC, brickforce | Site dumper, skip |
| Roofing | 38 × 114 S5 H2 roof timber (6.6 m), 0.47 mm IBR (6.0 m), colour-coated IBR (6.0 m), Double Roman tiles, IBR ridge capping, 135 mm ceiling insulation, PVC downpipes | Skip |
| Electrical & plumbing | 20 mm conduit, 2.5 mm² Surfix (100 m), 12-way distribution board, earth leakage, Polycop pipe, 150 L geyser, 5,000 L tank, 5 kVA hybrid inverter | TLB |
| Finishes & fit-out | RhinoBoard ceilings, 600 × 600 porcelain floor tiles, toilet suite, sink and drainer, interior doors, 3-lever locksets, matt wall paint | Skip |
| Paving, driveways & roads | G7 sub-base, crusher run base, bedding sand, Bosun 60 mm interlocking pavers, 50 mm bevel pavers, barrier kerbs | Smooth-drum roller, water truck, tipper, haulage |
| Drainage & services | 110 mm uPVC pipe, 45° bends, pipe bedding sand, French drain stone, nonwoven geotextile, channel drain | Mini excavator, TLB, rubble removal |
| Landscaping | Terraforce L22 retaining blocks, 450 mm paving slabs, river pebble, pea gravel, stone mulch, crusher dust | Skid steer, site dumper, skip |

Each pick is labelled with its job on site ("Concrete stone", "Main bars")
and shows today's retail list price for its unit, or "Price on quote" —
never a guessed price. Each stage also links its categories, the plant and
services it needs, and the calculator that sizes it.
Where a stage needs design or sign-off, it also links the matching BAE
design service (`DESIGN_SERVICES.md`): plans at site prep, the engineer's
foundation inspections, structural design for slabs, roof structure design,
stormwater design and retaining wall design.

**Save this stage to a project** adds the stage's picks (no quantities) to
an existing project list or a new one, under that stage. Saving again keeps
any quantities already entered.

The two services & fit-out stages were added with the electrical, tiles, bathroom, hardware and boards departments
(`docs/pricing/FITOUT_CATALOGUE.md`); shutterboard and props also appear under Surface beds & slabs.

## Adding to it

Stages are data. When a new category lands, add its slug to the stage's
`categories` and swap in picks. Planned (owner, Oct 2026):

| Phase | Categories | Stage |
|---|---|---|
| W | CAT-19 Bricks & Blocks, CAT-20 Lintels, DPC & Wall Accessories | Walls — **built** (`MASONRY_CATALOGUE.md`) |
| P | CAT-21 Paving, Kerbs & Edging, CAT-22 Retaining & Erosion Control | Paving and Landscaping — **built** (`MASONRY_CATALOGUE.md`) |
| D | CAT-23 Pipes & Fittings, CAT-24 Precast Drainage, CAT-25 Geosynthetics & Membranes | Drainage and Slabs (DPM) — **built** (`MASONRY_CATALOGUE.md`) |
| R | CAT-26 Roof Sheeting, CAT-27 Flashings, Ridges & Fixings, CAT-28 Insulation, Underlay & Rainwater, CAT-29 Concrete Roof Tiles | Roofing — a new stage between walls and paving — **built** (`ROOFING_CATALOGUE.md`) |
| T | CAT-30 Roof & Structural Timber, CAT-31 Timber Connectors & Accessories | Roofing — **built**; S5 H2 38 × 76, 38 × 114 and 38 × 228 priced, the rest quoted (`ROOFING_CATALOGUE.md`) |

A pick whose product is hidden by staff (Admin → Merchandising) drops out of
its stage automatically.
