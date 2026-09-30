# Product Photography — Sourced Candidates

Kimi sourced about 140 candidate photos (Sep 2026) for the 48-SKU catalogue,
delivered as 9 image ZIPs plus a manifest. This file records what was done with
them. The images themselves are in
`packages/database/prisma/seed-data/product-images/` (WebP, ≤1200px, ≤400KB),
listed in its `manifest.json`.

## Licensing — why nothing is live yet

None of these photos has a confirmed licence for commercial use (Kimi's own
notes say so): they come from supplier, marketplace, blog and editorial
websites, and the copyright stays with each owner. So every sourced photo is
imported **hidden** (`PERMISSION_PENDING`):

- staff see them on each product in **Admin → Products** and in
  **Admin → Image permissions**, grouped by source company, with the source
  page links and a draft permission-request email;
- the public never does. They're left out of the storefront, the product API,
  the Meta catalogue feed, and the image route (a direct link returns 404);
- when a source agrees, an admin clicks **Permission received — publish** on
  its card, and all of that source's photos go live at once. **Withdraw** hides
  them again. Single photos can also be held back or cleared from the product
  page.

The photos are imported by `node apps/api/dist/merchandising/seed-product-images.js`
in Render's pre-deploy step. The import only creates photos, never changes one
already imported, and a photo staff remove stays removed.

Staff uploads (your own photography) are unaffected. They're live as soon as
they're uploaded, and always shown first.

**Quickest wins:**
- Gomes Sand is already a partner supplier (SUP-053), and Sika South Africa is
  on the B2B supplier list.
- INFRAMAT, Pavement Materials Group, Topsoil Tippers, Cloete's Sand & Stone
  and Imperial Paving are SA suppliers who may be glad of the exposure.
- Photos from overseas marketplaces and blogs are the least likely to be
  cleared. Replacing them with your own yard photos is better long-term.

## What was reviewed

- **134 image files** across the 9 ZIPs, but only **about 85 distinct
  photos**. Kimi reused the same photo under several products (for example,
  one crushed-stone photo under five sizes, and four sand photos across all
  seven sands).
- **9 files were damaged in the upload** (the ZIPs' own index points at bytes
  that aren't there), so they can't be used. Re-send those two ZIPs to recover
  them:
- `01-sub-base-base-course/G2 Crushed Stone/02.png`
- `01-sub-base-base-course/G3 Crushed Stone/01.png`
- `01-sub-base-base-course/G3 Crushed Stone/02.png`
- `01-sub-base-base-course/G6 Natural Gravel/01.png`
- `01-sub-base-base-course/G6 Natural Gravel/02.png`
- `01-sub-base-base-course/G7 Natural Gravel (Sub-base)/01.png`
- `02-crushed-stone/6.7mm Crushed Stone (Dolomite)/02.png`
- `02-crushed-stone/6.7mm Crushed Stone (Dolomite)/03.png`
- `02-crushed-stone/9.5mm Crushed Stone (Dolomite)/01.png`
- Every readable photo was looked at and either **placed** or **rejected with a
  reason** (below).

**Result:** 55 distinct photos placed 92 times across **43 of the 48 products**
(1–3 each).

Flags on placed photos:
- 20 shared: the same photo is on similar products, so it shows
  the material, not necessarily the exact grading.
- 27 from outside South Africa.
- 14 low resolution: replace when possible.
- 3 show another company's brand: lime bags. Only use
  them if we sell that brand.

## Per product

| SKU | Product | Photos | Source (flags) |
|---|---|---|---|
| AA-SBC-01 | G1 Crushed Stone | 2 | Gomes Sand (gomessand.co.za) (low-res, shared); Gomes Sand (gomessand.co.za) (low-res, shared) |
| AA-SBC-02 | G2 Crushed Stone | 1 | INFRAMAT (inframat.co.za) |
| AA-SBC-03 | G3 Crushed Stone | — | **No usable photo** — Both files damaged in upload |
| AA-SBC-04 | G4 Natural Gravel (Crushed) | 2 | Sand Masters; Gomes Sand (gomessand.co.za) (low-res, shared) |
| AA-SBC-05 | G5 Natural Gravel | 2 | INFRAMAT (inframat.co.za) (shared); Gomes Sand (gomessand.co.za) (low-res, shared) |
| AA-SBC-06 | G6 Natural Gravel | — | **No usable photo** — Both files damaged in upload |
| AA-SBC-07 | G7 Natural Gravel (Sub-base) | — | **No usable photo** — One file damaged, the other 259px |
| AA-SBC-08 | G8 Gravel (Fill) | 2 | Gomes Sand (gomessand.co.za) (low-res, shared); Gomes Sand (gomessand.co.za) (low-res, shared) |
| AA-SBC-09 | G9 Gravel (Fill) | 2 | INFRAMAT (inframat.co.za) (shared); Gomes Sand (gomessand.co.za) (low-res, shared) |
| AA-SBC-10 | G10 Selected Fill / Subgrade Material | — | **No usable photo** — Diagram and a 262px photo only |
| AA-CRS-01 | 6.7mm Crushed Stone (Dolomite) | 1 | Topsoil Tippers (Pretoria) (shared) |
| AA-CRS-02 | 9.5mm Crushed Stone (Dolomite) | 1 | Topsoil Tippers (Pretoria) (shared) |
| AA-CRS-03 | 13.2mm Crushed Stone (Dolomite) | 2 | Topsoil Tippers (Pretoria) (shared); Topsoil Tippers (Pretoria) (shared) |
| AA-CRS-04 | 19mm Crushed Stone (Dolomite) | 3 | Cloete's Sand & Stone (shared); INFRAMAT (inframat.co.za) (shared); Topsoil Tippers (Pretoria) (shared) |
| AA-CRS-05 | 19mm Crushed Stone (Andesite/Hornfels) | 2 | INFRAMAT (inframat.co.za) (shared); Cloete's Sand & Stone (shared) |
| AA-CRS-06 | 19mm Crushed Stone (Granite) | 2 | Cloete's Sand & Stone (shared); INFRAMAT (inframat.co.za) (shared) |
| AA-CRS-07 | 26.5mm Crushed Stone (Dolomite) | 3 | Cloete's Sand & Stone (shared); INFRAMAT (inframat.co.za) (shared); Topsoil Tippers (Pretoria) (shared) |
| AA-CRS-08 | 37.5mm Crushed Stone (Dolomite) | 2 | INFRAMAT (inframat.co.za) (shared); Topsoil Tippers (Pretoria) (shared) |
| AA-CRS-09 | 53mm Crushed Stone (Dolomite) | 3 | INFRAMAT (inframat.co.za) (shared); Cloete's Sand & Stone (shared); Topsoil Tippers (Pretoria) (shared) |
| AA-CRS-10 | Crusher Dust / Stone Dust | 2 | Gardenscape (non-SA); Hammarlund Nursery (non-SA) |
| AA-SND-01 | River Sand (Washed) | 2 | Builders (builders.co.za) (shared); Pavement Materials Group (low-res, shared) |
| AA-SND-02 | Plaster Sand | 2 | IndiaMART listing (low-res, non-SA, shared); Builders (builders.co.za) (shared) |
| AA-SND-03 | Building Sand (Unwashed) | 2 | Gomes Sand (gomessand.co.za) (low-res, shared); Builders (builders.co.za) (shared) |
| AA-SND-04 | Filling Sand | 2 | Gomes Sand (gomessand.co.za) (low-res, shared); Builders (builders.co.za) (shared) |
| AA-SND-05 | Concrete Sand | 2 | Pavement Materials Group (low-res, shared); Builders (builders.co.za) (shared) |
| AA-SND-06 | Screeding Sand | 2 | IndiaMART listing (low-res, non-SA, shared); Builders (builders.co.za) (shared) |
| AA-SND-07 | Silica Sand | — | **No usable photo** — Only foreign/retail branded bags |
| AA-CRR-01 | Crusher Run 0-19mm | 2 | Gravel Delivery (non-SA, shared); Shelar Infrastructure / TradeIndia (non-SA, shared) |
| AA-CRR-02 | Crusher Run 0-40mm | 2 | Gravel Delivery (non-SA, shared); Shelar Infrastructure / TradeIndia (non-SA, shared) |
| AA-CRR-03 | Rip Rap / Rock Armour | 3 | INFRAMAT (inframat.co.za); Mainland Aggregates UK (non-SA); Holcim UK (non-SA) |
| AA-CRR-04 | Gabion Stone | 3 | Gabion Supplier (non-SA); Imperial Paving (imperialpaving.co.za); Ferguson Waterworks (low-res, non-SA) |
| AA-BAL-01 | Ferrocrete Ballast | 2 | Tarmac (low-res, non-SA); INFRAMAT (inframat.co.za) |
| AA-BAL-02 | Rail Ballast | 3 | INFRAMAT (inframat.co.za); Glory Track blog (non-SA); International Railway Journal (low-res, non-SA) |
| AA-BAL-03 | Building Rubble / Ballast Mix | 2 | Cloete's Sand & Stone; North West Aggregates (non-SA) |
| AA-DRN-01 | French Drain Stone | 3 | Bray Topsoil & Gravel (non-SA, shared); French Drain Man (non-SA, shared); Imperial Paving (imperialpaving.co.za) |
| AA-DRN-02 | Filter Media Aggregate | 2 | Bray Topsoil & Gravel (non-SA, shared); Pavement Materials Group (low-res) |
| AA-DRN-03 | Weeping Tile Bedding Stone | 3 | Complex Plumbing (non-SA, shared); Imperial Paving (imperialpaving.co.za) (low-res); Bray Topsoil & Gravel (non-SA, shared) |
| AA-DRN-04 | Subsoil Drainage Stone | 3 | Complex Plumbing (non-SA, shared); Pavement Materials Group; French Drain Man (non-SA, shared) |
| AA-DEC-01 | River Pebble | 2 | Rock Stone & Pebble blog (low-res, non-SA); Gardenista (non-SA, shared) |
| AA-DEC-02 | Crushed Stone Chips (Decorative) | 2 | Green Stone Company (non-SA, shared); Chips Groundcover (non-SA, shared) |
| AA-DEC-03 | Pea Gravel | 3 | Project Landscape (non-SA); A-1 Grass Sand & Stone (non-SA); Gardenista (non-SA, shared) |
| AA-DEC-04 | Mineral Stone Mulch | 2 | Green Stone Company (non-SA, shared); Chips Groundcover (non-SA, shared) |
| AA-AGR-01 | Agricultural Lime (Calcitic) | 1 | Agrimark (agrimark.co.za) (low-res, brand visible) |
| AA-AGR-02 | Dolomitic Lime | 1 | Newtown Fertilizers (gardenonline.co.za) (brand visible) |
| AA-AGR-03 | Hydrated Lime | 2 | Robert Price / Heidelberg (brand visible, non-SA); Hinterland (hinterland.co.za) (low-res) |
| AA-REC-01 | Recycled Crushed Concrete Aggregate (RCA) | 3 | Crushcrete (non-SA); Palmetto Sand & Gravel (non-SA); Sika South Africa (zaf.sika.com) |
| AA-REC-02 | Recycled Crushed Brick Aggregate | 2 | Longwater Gravel (non-SA); Builders Merchant (buildersmerchant.co.za) |
| AA-REC-03 | Reclaimed Asphalt Planings (RAP) | 2 | Breedon Group (non-SA); Crown Publications (crown.co.za) |

## Photos per source (permission requests to send)

| Source | Photos placed |
|---|---|
| INFRAMAT (inframat.co.za) | 12 |
| Gomes Sand (gomessand.co.za) | 9 |
| Topsoil Tippers (Pretoria) | 8 |
| Cloete's Sand & Stone | 6 |
| Builders (builders.co.za) | 6 |
| Pavement Materials Group | 4 |
| Imperial Paving (imperialpaving.co.za) | 3 |
| Bray Topsoil & Gravel | 3 |
| IndiaMART listing | 2 |
| Gravel Delivery | 2 |
| Shelar Infrastructure / TradeIndia | 2 |
| French Drain Man | 2 |
| Complex Plumbing | 2 |
| Gardenista | 2 |
| Green Stone Company | 2 |
| Chips Groundcover | 2 |
| Sand Masters | 1 |
| Gardenscape | 1 |
| Hammarlund Nursery | 1 |
| Mainland Aggregates UK | 1 |
| Holcim UK | 1 |
| Gabion Supplier | 1 |
| Ferguson Waterworks | 1 |
| Tarmac | 1 |
| Glory Track blog | 1 |
| International Railway Journal | 1 |
| North West Aggregates | 1 |
| Rock Stone & Pebble blog | 1 |
| Project Landscape | 1 |
| A-1 Grass Sand & Stone | 1 |
| Agrimark (agrimark.co.za) | 1 |
| Newtown Fertilizers (gardenonline.co.za) | 1 |
| Robert Price / Heidelberg | 1 |
| Hinterland (hinterland.co.za) | 1 |
| Crushcrete | 1 |
| Palmetto Sand & Gravel | 1 |
| Sika South Africa (zaf.sika.com) | 1 |
| Longwater Gravel | 1 |
| Builders Merchant (buildersmerchant.co.za) | 1 |
| Breedon Group | 1 |
| Crown Publications (crown.co.za) | 1 |

## Rejected (not imported)

| File | Reason |
|---|---|
| `01-sub-base-base-course/G1 Crushed Stone/01.png` | Shows large boulders, not G1 crusher-run base course |
| `01-sub-base-base-course/G10 Selected Fill - Subgrade Material/01.png` | Pavement-layer diagram, not a product photo |
| `01-sub-base-base-course/G10 Selected Fill - Subgrade Material/02.png` | Too small (262px) |
| `01-sub-base-base-course/G5 Natural Gravel/03.png` | Too small (259px) |
| `01-sub-base-base-course/G7 Natural Gravel (Sub-base)/02.png` | Too small (259px) |
| `02-crushed-stone/9.5mm Crushed Stone (Dolomite)/03.png` | Two-pile composite; neither pile clearly 9.5mm |
| `02-crushed-stone/Crusher Dust - Stone Dust/01.png` | Two-pile composite (same file as 9.5mm/03) |
| `02-crushed-stone/13.2mm Crushed Stone (Dolomite)/03.png` | Small (330px) and duplicates a better pile shot |
| `02-crushed-stone/19mm Crushed Stone (Andesite-Hornfels)/03.png` | Small (330px) duplicate |
| `02-crushed-stone/19mm Crushed Stone (Granite)/01.png` | White marble/quartz chips — would misrepresent granite |
| `03-sand-fine/River Sand (Washed)/02.png` | Duplicate of a better sand shot at 300px |
| `03-sand-fine/Concrete Sand/03.png` | Duplicate (plaster-sand pile) |
| `03-sand-fine/Plaster Sand/03.png` | Duplicate at 300px |
| `03-sand-fine/Silica Sand/01.png` | Branded 1kg retail bag (not our product/pack size) |
| `03-sand-fine/Silica Sand/02.png` | UK retailer's branded bag (Sandbag Store) |
| `04-crusher-run-road-building/Crusher Run 0-40mm/03.png` | Too small (342px) |
| `04-crusher-run-road-building/Crusher Run 0-19mm/03.png` | Too small (342px) |
| `04-crusher-run-road-building/Crusher Run 0-19mm/04.png` | Too small (263px) |
| `04-crusher-run-road-building/Gabion Stone/03.png` | Weaker duplicate of other gabion walls |
| `04-crusher-run-road-building/Rip Rap - Rock Armour/01.png` | Weaker of four rip-rap shots |
| `05-ballast-rail/Building Rubble - Ballast Mix/01.png` | Visible 'NICK AGER' watermark |
| `05-ballast-rail/Building Rubble - Ballast Mix/03.png` | Thin 4:1 strip, unusable as a product photo |
| `05-ballast-rail/Building Rubble - Ballast Mix/05.png` | Builders premix concrete bag — a different product |
| `05-ballast-rail/Ferrocrete Ballast/02.png` | Railway track — rail ballast, not ferrocrete |
| `05-ballast-rail/Ferrocrete Ballast/03.png` | Same file as the watermarked rubble photo |
| `05-ballast-rail/Rail Ballast/02.png` | Duplicate of the ferrocrete photo |
| `05-ballast-rail/Rail Ballast/03.png` | Duplicate at 479px |
| `06-drainage-filter/Filter Media Aggregate/01.png` | Filtration diagram, not a product photo |
| `06-drainage-filter/Filter Media Aggregate/04.png` | Clinobrite pool-filter zeolite — a different, branded product |
| `06-drainage-filter/French Drain Stone/03.png` | Too small (290px) |
| `06-drainage-filter/Weeping Tile Bedding Stone/04.png` | Duplicate |
| `06-drainage-filter/Subsoil Drainage Stone/04.png` | Duplicate |
| `07-decorative-landscaping/Crushed Stone Chips (Decorative)/02.png` | Small (350px) |
| `08-agricultural-industrial/Agricultural Lime (Calcitic)/02.png` | US product in 50 lbs bags |
| `08-agricultural-industrial/Dolomitic Lime/02.png` | Bag is labelled CALCITIC lime — wrong product |
| `08-agricultural-industrial/Hydrated Lime/03.png` | UK brand (Bolshaw) |
| `09-recycled-sustainable/Reclaimed Asphalt Planings (RAP)/02.png` | Tarmac (UK) branded truck, not the material |
| `09-recycled-sustainable/Recycled Crushed Brick Aggregate/02.png` | Small (360px) |
| `09-recycled-sustainable/Recycled Crushed Concrete Aggregate (RCA)/01.png` | Mixed rubble with brick — weaker than the other RCA shots |

## Still needed

- **G3, G6, G7, G10 and Silica Sand** have no usable photo. G3 and G6 are
  in the damaged files; the others had only a diagram, tiny images, or
  foreign branded bags.
- **Lime:** the calcitic and dolomitic lime photos are single branded bag
  shots. Ask your lime supplier for packshots.
- **Packaged goods** (cement, grout, admixtures) weren't part of this set.
- **Longer term:** a half-day photo shoot at a partner yard would replace most
  of these with photos you own outright.
