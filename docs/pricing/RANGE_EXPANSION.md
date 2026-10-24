# Range expansion — 35 departments (October 2026)

ROADMAP Phase 2, the owner's top priority from 23 October 2026: products, departments and categories first; pricing later. This takes the catalogue from **1,401 products in 19 departments to 4,247 products in 35 departments**. It adds **2,846 products** in **68 categories (CAT-57 to CAT-124)**, with:
- **16 new departments**;
- **deeper ranges in 7 existing ones** (timber, plumbing, electrical, flooring, hardware, paint, and boards, which now hold sheet materials only).

```
python3 scripts/catalogue/build_range.py && python3 scripts/public-catalogues.py
```

## Departments and categories

Product counts are in brackets.

| Department | Categories | Products | Landing page |
|---|---|---|---|
| Timber, Poles & Decking | CAT-57 Treated Poles, Droppers & Laths (96) · CAT-58 Engineered Timber & Glulam (49) · CAT-59 Hardwoods & PAR Timber (60) · CAT-60 Decking, Cladding & Battens (41) · CAT-61 Industrial & Mining Timber (40) · CAT-62 Carport, Pergola & Lapa Kits (17) | 303 | `/timber` |
| Garden, Lawn & Landscaping (new) | CAT-63 Instant Lawn & Lawn Seed (16) · CAT-64 Soils, Compost & Mulch (33) · CAT-65 Fertiliser & Lawn Care (40) · CAT-66 Irrigation, Sprinklers & Hoses (85) · CAT-67 Planters, Edging & Artificial Grass (41) · CAT-68 Garden Tools & Power Garden Equipment (53) | 268 | `/garden-landscaping` |
| Outdoor Living (new) | CAT-69 Braais, Fireplaces & Flues (50) · CAT-70 Shade Sails, Carports & Patio Cover (42) · CAT-71 Pools, Pool Care & Water Features (71) · CAT-72 Outdoor Finishes & Garden Lighting (37) | 200 | `/outdoor-living` |
| Formwork, Scaffolding & Access (new) | CAT-73 Formwork Ties, Cones & Accessories (59) · CAT-74 Props, Shoring & Formwork Beams (38) · CAT-75 Ladders, Towers & Trestles (48) | 145 | `/formwork-access` |
| Roads, Civil & Traffic (new) | CAT-76 Asphalt, Bitumen & Road Repair (22) · CAT-77 Road Marking & Road Studs (28) · CAT-78 Traffic Cones, Barriers & Signs (66) · CAT-79 Survey & Setting-Out Equipment (33) · CAT-80 Erosion Control, Sandbags & Silt Fencing (15) | 164 | `/roads-civil` |
| Precast Concrete (new) | CAT-81 Hollow-Core & Rib-and-Block Slabs (24) · CAT-82 Road Barriers, Bollards & Cable Ducts (24) · CAT-83 Precast Walls, Septic & Conservancy Tanks (29) | 77 | `/precast-concrete` |
| Construction Chemicals (new) | CAT-84 Concrete Repair, Curing & Floor Treatments (33) · CAT-85 Joint Fillers, Sealants & Waterstops (44) · CAT-86 Chemical Anchors, Epoxy & Grouts (31) · CAT-87 Waterproofing Systems & Tanking (32) | 140 | `/construction-chemicals` |
| Insulation, Fire & Acoustic (new) | CAT-88 Thermal Insulation & Lagging (53) · CAT-89 Fire Extinguishers, Hose Reels & Fire Stopping (50) · CAT-90 Acoustic Ceilings & Sound Insulation (19) | 122 | `/insulation-fire-acoustic` |
| Water Storage & Plumbing | CAT-91 Pumps, Boreholes & Water Treatment (53) · CAT-92 Valves, Meters & HDPE Fittings (93) · CAT-93 Heat Pumps & Hot-Water Systems (24) | 170 | `/water-plumbing` |
| Electrical & Solar | CAT-94 Commercial & Industrial Lighting (41) · CAT-95 Generators, UPS & Power Protection (34) | 75 | `/electrical` |
| Glass, Glazing & Aluminium (new) | CAT-96 Glass, Safety Glass & Mirrors (36) · CAT-97 Shower Enclosures & Glass Balustrades (31) · CAT-98 Aluminium Sections & Shopfronts (59) | 126 | `/glass-aluminium` |
| Kitchens & Built-ins (new) | CAT-99 Kitchen Cabinets & Carcasses (36) · CAT-100 Worktops & Built-In Appliances (44) · CAT-101 Built-In Cupboards & Cabinet Hardware (38) | 118 | `/kitchens-built-ins` |
| HVAC & Ventilation (new) | CAT-102 Air Conditioning (33) · CAT-103 Ventilation, Extraction & Ducting (46) | 79 | `/hvac-ventilation` |
| Site Establishment & Temporary Works (new) | CAT-104 Site Offices, Containers & Ablutions (29) · CAT-105 Temporary Fencing, Hoarding & Site Signs (37) · CAT-106 Site Power, Lighting & Distribution (19) · CAT-107 Site Consumables & Cleaning (30) | 115 | `/site-establishment` |
| Power Tools & Site Equipment (new) | CAT-108 Power Tools & Cordless Kits (58) · CAT-109 Drill Bits, Discs & Diamond Blades (134) · CAT-110 Concrete & Compaction Equipment (44) · CAT-111 Levels, Lasers & Measuring Tools (33) | 269 | `/power-tools-equipment` |
| Tiles & Flooring | CAT-112 Carpet, Carpet Tiles & Commercial Flooring (31) | 31 | `/tiles-flooring` |
| Security, CCTV & Access Control (new) | CAT-113 CCTV, Access Control & Alarms (57) | 57 | `/security-access` |
| Hardware & Fasteners | CAT-114 Industrial Fixings, Rivets & Nails by Weight (76) | 76 | `/hardware-fasteners` |
| Waterproofing, Sealants & Paint | CAT-115 Industrial & Protective Coatings (41) | 41 | `/paint-waterproofing` |
| Prefab Buildings & Structures (new) | CAT-116 Wendy Houses, Sheds & Steel Carports (43) · CAT-117 Light Steel Frame Building Systems (25) · CAT-118 Modular & Container Buildings (18) | 86 | `/prefab-structures` |
| Agricultural & Farm (new) | CAT-119 Farm Fencing, Gates & Cattle Grids (51) · CAT-120 Troughs, Dam Liners & Farm Water (30) · CAT-121 Shade Net, Tunnels & Crop Protection (28) | 109 | `/agricultural-farm` |
| Mining & Industrial (new) | CAT-122 Steel Grating, Stair Treads & Walkways (22) · CAT-123 Mining Consumables & Underground Support (28) · CAT-124 Industrial Flooring, Linings & Wear Protection (25) | 75 | `/mining-industrial` |

**Department changes:**
- **Timber.** "Roof & Structural Timber" is now **Timber, Poles & Decking** at `/timber`. It keeps CAT-30/31.
- **Formwork.** "Boards & Formwork" is now **Boards & Sheet Materials** (same URL). CAT-56 Formwork, Props & Scaffolding moves to the new **Formwork, Scaffolding & Access** department.
- **Security.** **Security, CCTV & Access Control** is a department of its own, next to Fencing & Security.

## Rules

- **Quote-only.** Every unit has null prices, with status "Quote-only — no retail benchmark", and the build script refuses a priced unit.
  - The pricing service answers 422 for these units, so the storefront routes them to a quote.
  - Prices are added under `PRICING_POLICY.md`, starting with supplier price lists (ROADMAP Phase 1). No price is invented.
- **Standard trade types and sizes.** Each product is a standard South African trade type and size, compiled on 23 October 2026.
  - It has **not yet been confirmed with a named supplier**. The catalogue's source note says so.
  - Products are generic and unbranded. Make, size, finish, price and availability are confirmed with the supplier on the quote.
  - Supplier price lists (Phase 1) and the catalogue-gaps report (2.0) will correct and prune the range.
- **Standards.** SANS and other standards are cited only where they are well established, for example:
  - SANS 457 poles, SANS 1460 glulam, SANS 1263 safety glass, SANS 1910 extinguishers, SANS 543 hose reels;
  - SANS 10400 parts, SANS 517 light steel frame, SANS 309/548 bitumen emulsions, SANS 50131 ladders.
  - Where unsure, the product names the type only.
- **No duplicates.** SKUs, slugs and category slugs are checked against every other catalogue, and the build fails on a clash.
  - Products the store already had stay where they are and are linked from the new landing pages. Examples: geyser elements, floodlights 50/100 W, tape measures 5/8 m, the 15 L bucket, aluminium stair nosing, and orange barrier mesh 1 × 50 m.
- **No images and no brands.** Swatches use department colours until there are licensed or supplier-permitted photos (Admin → Image permissions).
- **Hire items.** Props, scaffolding, containers, toilets, lighting towers and mixers appear as "(Sale)" and "(Hire)" products. They stay quote-only, so the hire rate, minimum period and delivery are confirmed on the quote.

## New units of sale

Migration `20261105090000_range_units` adds `SQUARE_METRE`, `LINEAR_METRE`, `CUBIC_METRE`, `KG` and `BUNDLE`. They are wired through four places:
- the Prisma enum;
- the pricing service (`RANGE_UNITS`, part of `SUPPLIES_UNITS`);
- the API (`PACKAGED_UNITS`, `UNIT_LABEL`);
- the storefront (`UNIT_LABEL`, `RoofingUnitCode`).

`LINEAR_METRE` is separate from roofing's `METRE`, which means cut-to-length on a cutting list. The building-supplies line also accepts `TONNE` (hot-mix asphalt).

| Unit | Units in the range |
|---|---|
| `EACH` | 2,164 |
| `LINEAR_METRE` | 239 |
| `PACK` | 206 |
| `SQUARE_METRE` | 162 |
| `ROLL` | 72 |
| `SHEET` | 44 |
| `KG` | 19 |
| `BUNDLE` | 15 |
| `CUBIC_METRE` | 12 |
| `TONNE` | 1 |

## How it fits together

**Builder** (`scripts/catalogue/build_range.py`)
- Builds from `scripts/catalogue/range_expansion/` (`common.py` plus one module per roadmap wave, `wave_a` … `wave_d`).
- Validates the result and writes `services/pricing/data/range_catalogue.json`.
- Each category carries its department, typical uses and handling notes once, rather than repeating them on every product.

**Pricing service**
- `packaged_goods.load_range()` loads the catalogue into the building-supplies line (SUPPLIES family, merchant's own transport).
- `/products/range` lists it, and `/calculate/packaged-goods` prices it (422 while quote-only).

**Storefront copies** (`scripts/public-catalogues.py`)
- `apps/web/src/data/range-catalogue.json`: the full public copy, used by server components through `data/range.ts`, which fills in each product's uses and handling from its category. `data/supplies.ts` merges it into `SUPPLIES_PRODUCTS`, so product pages, search, the sitemap, admin and department pages pick it up.
- `apps/web/src/data/range-index.json`: a slim index (categories, plus SKU, name, category and units per product) for the cart, quote form and other client components, through `data/range-index.ts` and `data/quotable.ts`. It keeps descriptions out of the browser bundle: about 80 kB gzipped, against about 120 kB for the full copy.
- `services/pricing/tests/test_range.py` fails if either copy drifts from the source.

**Database seed**
- `seedRangeCatalogue()` seeds the categories after the building supplies (`catalogueGroup: supplies`, so the Distributed Delivery Premium counts their supply points), plus the products and a price band per unit. It takes about 40 s locally.

**Storefront**
- `data/departments.ts` takes the range categories for each department from the catalogue's `department` field.
- The header bar shows the 14 departments marked `inBar`, plus "All 35 departments". The menu, footer, homepage tiles and `/departments` list them all.
- Shop by Category gains four pages, one per wave.
- Department landing pages show up to 8 quote-only products per category, with "See all".
- Project lists file each new category under a build stage.

**Supplier CSV**
- CAT-57 to CAT-124 are valid category codes for supplier imports (`apps/api/src/suppliers/supplier-csv.ts`).

## Next

1. **Prices:**
   - supplier price lists per department (Phase 1);
   - two-retailer benchmarks for the commodity lines (fasteners, PPE, garden, pool chemicals, power-tool accessories).
2. **Prune and correct** against what suppliers actually stock, and against Admin → Catalogue gaps (2.0).
3. **Photos:** supplier-permitted images, starting with York Timbers for timber (2.1).
4. **Variant grids** (2.6) for the families generated as size grids, so each family has one product page:
   - poles: diameter × length;
   - glulam: width × depth;
   - fixings: diameter × length;
   - diamond blades: diameter × type.
5. **Weights and supplier groups** for the heavy lines (poles, precast, grating), so the delivery premium's per-ton charge applies.
6. **Still to deepen:** structural steel sections (steel line), and plant hire (plant-services catalogue).
