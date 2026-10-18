# Range depth (October 2026)

Several departments had the right categories but too few sizes. For example, lintels stopped at 3.6 m in one
width, and there were only a handful of window sizes. `scripts/catalogue/range_depth.py` adds the lengths,
sizes and types that South African builders' merchants actually stock. No departments or categories were added.

```
python3 scripts/catalogue/range_depth.py   # adds to services/pricing/data/*_catalogue.json
python3 scripts/public-catalogues.py       # regenerates apps/web/src/data (research stripped)
cd packages/database && npx ts-node prisma/seed.ts
```

## Rules

- **Every added product is quote-only.** Price fields are null and `pricing_status` is
  "Quote-only — no retail benchmark". Prices are added later, product by product, under
  [PRICING_POLICY.md](../../PRICING_POLICY.md): at least two SA retailers, list = lowest × 1.08.
- **Generic and unbranded.** Manufacturer and brand are left empty. The make, colour, handing and glazing
  are confirmed with the supplier on the quote.
- **Cloned from a product of the same kind in the same category**, so every field the catalogue code
  expects is present. Typical uses come from the category, not the template. Unit sizes are set only
  where the product has one.
- **The script is idempotent.** It owns the products tagged `_range: "range-depth-2026-10"`, removes them
  and re-adds them. It refuses to write if any SKU or slug clashes with any catalogue.
- **Sources:** the Builders fenestration catalogue and product search, and Cashbuild listings, checked
  2026-10-18. The source note is research and is stripped from the storefront copy. Two other merchants'
  catalogue sites are blocked by the network policy and were not used.

## What was added (727 products; 1,122 in total)

| Catalogue | Category | Added |
|---|---|---|
| Masonry & precast (222) | Lintels, DPC & wall accessories: standard 110 mm lintels 0.9–6.6 m, maxi 140 mm, wide 150 mm, block lintels, DPC 450/600 mm | 43 |
| | Bricks & blocks: face, NFX, semi-face, plaster, cladding, cement stock 7/14 MPa, hollow/solid/half/U/fair-face blocks | 17 |
| | Paving, kerbs & edging: paver colours, clay pavers, slabs, garden pavers, cobbles, stepping stones, kerbs | 25 |
| | Retaining & erosion control: Terraforce L11 and 4x4 profiles, gravity blocks, gabions, Reno mattresses | 12 |
| | Pipes & fittings: sewer pipe 110–250 mm Class 34, bends, junctions and fittings | 26 |
| | Precast drainage: concrete pipes 375–1200 mm, manhole rings and covers, inlets, channels | 21 |
| | Geosynthetics & membranes: geotextiles, geocell, DPM 375 µm, construction film | 8 |
| | Concrete roof tiles: colours, slate profile, ridges, accessories | 12 |
| Building supplies (476) | Windows: full steel (FX7) and wooden schedules, aluminium top-hung, sidelights, obscure glass | 62 |
| | Doors & frames, sliding and garage doors | 36 |
| | Fencing, gates & security: mesh, netting, clear-view, palisade, Y-standards, electric fence, gates, motors, burglar bars | 62 |
| | Water tanks & geysers; water supply & soil pipe (Polycop, copper, HDPE, uPVC Class 9/12, waste) | 81 |
| | Ceilings, drywall & cornice: gypsum, fibre-cement and PVC boards, cornices, studs, tracks | 54 |
| | Site tools (35), PPE (24), waterproofing (18), paint & coatings (22) | 99 |
| Roofing (153) | Flashings, ridges & fixings (incl. polycarbonate sheets), insulation, gutters and downpipe fittings | 41 |
| Steel (151) | Structural: angles, flat bar, tube, bar, IPE/UB/UC/PFC, lipped channel, plate, sheet, checker plate, mesh; accessories | 108 |
| Packaged (62) | Mortars, grouts & admixtures (each and 25 kg bags) | 20 |

## Decisions to review

- Polycarbonate roof sheets sit under *Flashings, ridges & fixings*, because roofing has no sheeting
  category for them.
- The mortars line now accepts an `EACH` unit (for bonding liquids and admixtures sold by the bottle)
  as well as bags (`services/pricing/calculators/packaged_goods.py`).
- Screen (breeze) blocks were left out: the bricks-and-blocks rules need a per-m² count, and their
  sizes vary by maker.
