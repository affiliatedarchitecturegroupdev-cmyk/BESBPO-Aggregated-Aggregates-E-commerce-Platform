# Building supplies catalogue (Phase 3)

Six departments approved by the owner on 17 Oct 2026, in one line —
**building supplies**, pricing family **SUPPLIES** — with eleven categories:

| Department | Categories | Landing page |
|---|---|---|
| Doors, Windows & Frames | CAT-32 Doors & Door Frames · CAT-33 Windows & Window Frames | `/doors-windows` |
| Fencing & Security | CAT-34 Fencing, Wire & Posts · CAT-35 Gates & Security | `/fencing-security` |
| Water Storage & Plumbing | CAT-36 Water Tanks & Geysers · CAT-37 Water Supply & Soil Pipe | `/water-plumbing` |
| Ceilings, Drywall & Insulation | CAT-38 Ceilings, Drywall & Cornice (insulation and brandering stay in roofing, linked) | `/ceilings-drywall` |
| Site Tools, PPE & Consumables | CAT-39 Site Tools & Consumables · CAT-40 PPE & Site Safety | `/tools-ppe` |
| Waterproofing, Sealants & Paint | CAT-41 Waterproofing & Sealants · CAT-42 Paint & Coatings | `/paint-waterproofing` |

82 products in `services/pricing/data/supplies_catalogue.json` (the
storefront copy, `apps/web/src/data/supplies-catalogue.json`, has the
internal research removed — `scripts/public-catalogues.py`). Underground
sewer pipe stays in Drainage (CAT-23); ceiling insulation and brandering stay
in Roofing (CAT-28, CAT-30).

## How it's priced

The two-retailer rule (`PRICING_POLICY.md`): a unit is live only where
**Cashbuild and Builders both list the same product at a regular price** —
the same make and size, or for commodity items the same specification (a
SANS 727 steel window code, a wire gauge and coil mass, a board size and
finish). The benchmark is the lower of the two; **list = benchmark × 1.08**.
Promotions are excluded. Checked 17 Oct 2026 on Cashbuild category listings
and the Builders product search (within robots.txt).

**43 products are priced**: seven F7 steel windows (NE1, NE2, NE4, NC2, NC2F,
NC4F, ND4F), galvanised wire, razor wire, Y-standards, droppers and palisade
posts, the Africa Tanks 5,000 L tank, Polycop pipe and 110 mm soil & vent
pipe, RhinoBoard 6.4 mm in four sizes, Rhino cove cornice, RhinoLite 10 kg,
PVC ceiling boards, Lasher bolsters, Ross levels, builder's line, barrier
tape, Alcolin silicone and acrylic sealants, and four Duram paints.

**39 are quoted with the supplier**, each with the reason in its (internal)
source note — usually because the two retailers' products differ in make,
series or finish (doors, aluminium windows, security gates, hard hats,
boots), a listing doesn't state the size (steel door frames, mesh gates),
only one retailer lists it (JoJo tanks, diamond mesh rolls, copper pipe,
wheelbarrows, torch-on), or the second price was a promotion (RhinoLite
40 kg, Filla Foam, Super Laykold).

Rebuild: `python3 -I scripts/catalogue/build_supplies.py services/pricing/data/supplies_catalogue.json`
then `python3 scripts/public-catalogues.py`.

## Family and delivery

- **SUPPLIES**: retail at list, **trade 4%**, volume quoted — set on
  17 Oct 2026 under the owner's directive, **for the owner's review**.
- Delivered on the merchant's own vehicle, like the other merchant lines: no
  tipper fee; staff confirm stock, the slot and any delivery charge before
  dispatch. Not offered for AA 60/120 yet (no qualifying suppliers).
- Units: `EACH` (doors, windows, posts, tins, tools), `SHEET` (boards),
  `ROLL` (mesh, pipe rolls, tape), `PACK` (masks) — no new units or
  migration.

## On the storefront

- Six department landing pages (shared `SuppliesDepartmentPage`): the
  categories, priced products, quoted products, and practical advice
  (registered plumbers for geysers, PPE rules, frame sizes, primers).
- The header department bar, `/departments`, the homepage category carousel
  ("Building supplies" page), `/products` filters, search, sitemap, footer,
  build stages (site prep, walls, roofing, drainage), material swatches and
  the shopping assistant's index all include the line.
- Product pages reuse the roofing product page with the department's
  breadcrumb, delivery and advice copy.
- No product photos yet — material swatches stand in until photos with
  confirmed permission are added (`PRODUCT_IMAGES.md`).

## Supplier leads

Six **unverified** manufacturer leads in
`packages/database/prisma/seed-data/suppliers-building-supplies.csv`
(Kwikot, Saint-Gobain Gyproc, Cape Gate ×2, Duram, JoJo) — town and province
only, from their own sites or business directories, addresses to confirm.
No phone numbers or map pins; staff verify before activating.

## Decisions for the owner to review

1. The six departments' categories and the 82-product starting range.
2. Trade 4% on building supplies.
3. Commodity-spec matching (steel window codes, wire gauge/mass, PVC board
   size) counts as "the same product" for the two-retailer rule.
4. Ceiling insulation and brandering stay in Roofing, linked from Ceilings.
5. Building supplies aren't offered for AA 60/120 until suppliers are
   verified for them.
