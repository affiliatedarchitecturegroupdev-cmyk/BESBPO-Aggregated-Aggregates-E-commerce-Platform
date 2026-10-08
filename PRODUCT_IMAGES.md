# Product Photography

The store's product photos come from two places:

1. **Photos Kimi found on supplier and other websites.** The owners gave
   permission in October 2026, so these are live and **shown first** on
   every product.
2. **Open-licence photos from Wikimedia Commons.** These are live too, after
   the sourced photos, with the credit their licence requires.

## October 2026 update

- All 55 Kimi-sourced photos were published (`"permission": "GRANTED"` in the
  manifest). A one-time database migration
  (`20261004090000_publish_sourced_photos`) cleared them on the live site and
  re-ordered every product's photos: staff photography first, then sourced
  photos, then open-licence ones.
- Weak Wikimedia matches were retired (set to removed, and dropped from the
  manifest's product lists — see `retiredOpenLicence`): River Sand (Washed)
  and Plaster Sand (2 each), Silica Sand (2), Agricultural Lime and Dolomitic
  Lime (1 each). The sourced photos replace them.
- Silica Sand had no sourced photo, so it got two better Commons photos: a
  heap of white quartz sand, and washed silica sand stockpiled at a sand mine.
- Admins can still withdraw a source on **Admin → Image permissions**, which
  hides its photos again.

Both sets are in `packages/database/prisma/seed-data/product-images/`
(WebP, ≤1200px), listed in its `manifest.json`. Open-licence entries carry
an `openLicence` block (licence, URL, author, credit). Staff uploads (your
own photography) always go live straight away.

## Cement pack shots (Oct 2026) — awaiting manufacturer permission

Manus sourced candidate photos for the 37-product cement master catalogue
(22 files). Each was checked by eye against the product's name, brand,
strength class and type; 14 were accepted, one per product, as the
manufacturers' own pack shots (resized to ≤1200px WebP on white).

They are imported **hidden** (`PERMISSION_PENDING`, no `"permission"` in
the manifest): staff see them, customers don't. Being on a public website
isn't permission to reuse. When a manufacturer agrees in writing, an admin
records it on **Admin → Image permissions** (one switch per manufacturer)
and its photos go live.

| Source (permission switch) | Products |
|---|---|
| AfriSam (afrisam.co.za) | StarBuild 32,5N · All Purpose 42,5N · High Strength (bag shows the 52,5N southern grade) · Rapid Hard 52,5R (bag shown; we sell it in bulk) · Roadstab 32,5N |
| Cemza (cemza.co) | General Purpose 32,5N · All Purpose 42,5N · Rapid Strength 42,5R · Ultra Strong 52,5N · Masonry 22,5X · RoadPro 32,5N |
| NPC - Natal Portland Cement (npc.co.za) | Newcastle Portland-fly ash 32,5N · Durban and Simuma Portland-limestone 32,5R (each with its own plant LOA number) |

**Rejected** (listed in the manifest's `rejected`): the three Kwikbuild files
were one identical plant photo (a forklift loading pallets) with no readable
product or class; the five Afrimat files were one identical photo of crushed
limestone on a conveyor — not cement. **Still to source** (23, listed in
`noImage`): KWIKBUILD 32.5N, 42.5N and Masonry; Afrimat DuraBuild,
Buildcrete, RoadCem, FastCast and Powercrete Plus; all PPC products; Sephaku
32/42/52/SepROAD; Dangote Falcon; Dugongo; Mamba; and generic photos for the
unbranded Bulk Cement 52.5N and the Road-Capping Binder. Sephaku 52 is
bulk-only per its brochure, so it needs a bulk photo, not a bag.

## Open-licence photos — live now

To give the store real photos before launch, photos were chosen from
**Wikimedia Commons** (Sep 2026; revised Oct 2026 — 38 now in use) under
licences that allow commercial use: CC0, public domain, CC BY and CC BY-SA.
No non-commercial (NC) or no-derivatives (ND) licences. They're imported as
`CLEARED`, so they're **live on the storefront** on 41 of the 48 aggregates
SKUs, shown after the sourced photos.

- **Credit.** CC BY and CC BY-SA require the photographer, source and
  licence to be credited. The storefront shows that under the photo on the
  product page ("Photo: *name*, via Wikimedia Commons · CC BY-SA 4.0", each
  part linked), and on **/photo-credits**, which is linked in the footer.
  CC0 and public-domain photos need no credit.
- **Meta catalogue feed.** An ad can't carry a credit line, so photos that
  need one are left out of the feed. Products whose only live photos need
  credit stay out of the feed until you add your own photos.
- **Nothing was edited.** The photos are only resized (≤1200px) and
  re-encoded as WebP, which counts as a format change, not an adaptation.
- **Context.** Wikimedia has few photos of South African aggregates. The
  gravel-road photos are from the Northern Cape; the rest are from wherever
  the material looks the same (by country: United States 8, India 6, South Africa 3, United Kingdom 3, Australia 2, unknown 2, Germany 2, Spain 1, Malaysia 1, Russia 1, Cyprus 1, Iraq 1, Nepal 1, United Arab Emirates 1, Switzerland 1, China 1, Nigeria 1, Estonia 1, Vietnam 1).
  Many are shared by similar products (for example, one photo of 19mm
  single-size stone serves the drainage stones), so they show the type of
  material, not the exact grading.
- **Staff control.** Admin → Products shows each photo as "Live — open
  licence (CC …)" with its credit. **Hide this photo** takes any one down.
  They don't appear on Admin → Image permissions, because no permission is
  needed.
- **How they were chosen.** Pexels and Unsplash photos can be downloaded,
  but their search pages block automated access from this build
  environment, and Pixabay blocks it entirely. So the photos came from
  Wikimedia Commons, where every file's licence and author can be checked
  through its API. Each one was checked visually against its product.

**Not found on Commons:** hydrated lime (only brand-labelled bags), crushed
brick aggregate, and crusher dust — these show Kimi's sourced photos.

### Per product (open-licence photos)

| SKU | Product | Photos | What they show |
|---|---|---|---|
| AA-SBC-01 | G1 Crushed Stone | 2 | Crushed-stone stockpiles at a limestone quarry (Germany); Pile of crushed gravel delivered to site (United States) |
| AA-SBC-02 | G2 Crushed Stone | 2 | Pile of crushed gravel delivered to site (United States); Crushed-stone stockpiles at a limestone quarry (Germany) |
| AA-SBC-03 | G3 Crushed Stone | 2 | Aggregate stockpiles at a limestone quarry (Germany); Pile of crushed gravel delivered to site (United States) |
| AA-SBC-04 | G4 Natural Gravel (Crushed) | 2 | Pile of crushed gravel delivered to site (United States); Gravel road to Olifantshoek, Northern Cape (South Africa) |
| AA-SBC-05 | G5 Natural Gravel | 2 | Gravel road to Olifantshoek, Northern Cape (South Africa); Stockpile of natural (pit) gravel (United States) |
| AA-SBC-06 | G6 Natural Gravel | 2 | Gravel road near Fraserburg, Northern Cape (South Africa); Stockpile of natural (pit) gravel (United States) |
| AA-SBC-07 | G7 Natural Gravel (Sub-base) | 2 | Gravel road near Fraserburg, Northern Cape (South Africa); Gravel road to Olifantshoek, Northern Cape (South Africa) |
| AA-SBC-08 | G8 Gravel (Fill) | 2 | Stockpile of natural (pit) gravel (United States); Gravel road near Fraserburg, Northern Cape (South Africa) |
| AA-SBC-09 | G9 Gravel (Fill) | 2 | Red gravelly soil in a cutting — typical of in-situ subgrade and fill material (India); Stockpile of natural (pit) gravel (United States) |
| AA-SBC-10 | G10 Selected Fill / Subgrade Material | 1 | Red gravelly soil in a cutting — typical of in-situ subgrade and fill material (India) |
| AA-CRS-01 | 6.7mm Crushed Stone (Dolomite) | 1 | 6–10 mm crushed limestone aggregate in the hand — shows the chip size (Spain) |
| AA-CRS-02 | 9.5mm Crushed Stone (Dolomite) | 1 | 6–10 mm crushed limestone aggregate in the hand — shows the chip size (Spain) |
| AA-CRS-03 | 13.2mm Crushed Stone (Dolomite) | 1 | Single-size crushed stone for concrete (India) |
| AA-CRS-04 | 19mm Crushed Stone (Dolomite) | 2 | Single-size crushed stone for concrete (India); Crushed stone laid as a driveway (United States) |
| AA-CRS-05 | 19mm Crushed Stone (Andesite/Hornfels) | 1 | Pile of dark crushed stone for concrete (India) |
| AA-CRS-06 | 19mm Crushed Stone (Granite) | 2 | Close-up of crushed granite aggregate; Crushed granite chips (United States) |
| AA-CRS-07 | 26.5mm Crushed Stone (Dolomite) | 2 | Crushed stone laid as a driveway (United States); Heap of pale crushed stone on a building site (India) |
| AA-CRS-08 | 37.5mm Crushed Stone (Dolomite) | 2 | Heap of pale crushed stone on a building site (India); Crushed-stone stockpiles at a limestone quarry (Germany) |
| AA-CRS-09 | 53mm Crushed Stone (Dolomite) | 2 | Heap of pale crushed stone on a building site (India); Crushed-stone stockpiles at a limestone quarry (Germany) |
| AA-CRS-10 | Crusher Dust / Stone Dust | — | Kimi photos only (awaiting permission) |
| AA-SND-01 | River Sand (Washed) | — | Retired Oct 2026 — sourced photos only |
| AA-SND-02 | Plaster Sand | — | Retired Oct 2026 — sourced photos only |
| AA-SND-03 | Building Sand (Unwashed) | 1 | Heap of building sand for mixing mortar and concrete (Nigeria) |
| AA-SND-04 | Filling Sand | 2 | Riverside sand stockpile with tipper trucks (China); Heap of building sand for mixing mortar and concrete (Nigeria) |
| AA-SND-05 | Concrete Sand | 2 | Heap of washed river sand, used as fine aggregate in mortar and concrete (India); Washed sand stockpile under a quarry conveyor (Estonia) |
| AA-SND-06 | Screeding Sand | 1 | Washed sand stockpile under a quarry conveyor (Estonia) |
| AA-SND-07 | Silica Sand | 2 | Heap of white quartz (silica) sand (Vietnam); Washed silica sand stockpiles at a sand mine, ready for shipping (United Kingdom) |
| AA-CRR-01 | Crusher Run 0-19mm | 2 | Mixed crushed stone with fines (Nepal); Aggregate stockpiles at a limestone quarry (Germany) |
| AA-CRR-02 | Crusher Run 0-40mm | 2 | Mixed crushed stone with fines (Nepal); Crushed-stone stockpiles at a limestone quarry (Germany) |
| AA-CRR-03 | Rip Rap / Rock Armour | 2 | Rock-armour (riprap) revetment being built (United Arab Emirates); Riverbank protected with rip rap (Switzerland) |
| AA-CRR-04 | Gabion Stone | 2 | Stepped gabion retaining wall (Malaysia); Close-up of stone-filled gabion baskets (Russia) |
| AA-BAL-01 | Ferrocrete Ballast | 1 | Single-size crushed stone for concrete (India) |
| AA-BAL-02 | Rail Ballast | 2 | Close-up of track ballast, Pimpama Station, Gold Coast (Australia); Rail ballast on a rural line (Great Northern line, Queensland) (Australia) |
| AA-BAL-03 | Building Rubble / Ballast Mix | 2 | Pile of broken stone and concrete rubble on a building site (United Kingdom); Pile of crushed demolition rubble (United Kingdom) |
| AA-DRN-01 | French Drain Stone | 2 | Crushed stone laid as a driveway (United States); Single-size crushed stone for concrete (India) |
| AA-DRN-02 | Filter Media Aggregate | 1 | Single-size crushed stone for concrete (India) |
| AA-DRN-03 | Weeping Tile Bedding Stone | 1 | Single-size crushed stone for concrete (India) |
| AA-DRN-04 | Subsoil Drainage Stone | 1 | Crushed stone laid as a driveway (United States) |
| AA-DEC-01 | River Pebble | 2 | Rounded natural pebbles; Smooth dark pebbles (Cyprus) |
| AA-DEC-02 | Crushed Stone Chips (Decorative) | 2 | Pale decorative stone chips in a garden bed (United States); Decorative stone chips in a planted bed (United States) |
| AA-DEC-03 | Pea Gravel | 2 | Pea gravel (India); Rounded gravel laid on a yard (Iraq) |
| AA-DEC-04 | Mineral Stone Mulch | 1 | Smooth dark pebbles (Cyprus) |
| AA-AGR-01 | Agricultural Lime (Calcitic) | — | Retired Oct 2026 — sourced photo only |
| AA-AGR-02 | Dolomitic Lime | — | Retired Oct 2026 — sourced photo only |
| AA-AGR-03 | Hydrated Lime | — | Kimi photos only (awaiting permission) |
| AA-REC-01 | Recycled Crushed Concrete Aggregate (RCA) | 1 | Pile of crushed demolition rubble (United Kingdom) |
| AA-REC-02 | Recycled Crushed Brick Aggregate | — | Kimi photos only (awaiting permission) |
| AA-REC-03 | Reclaimed Asphalt Planings (RAP) | 2 | Road surface after the old asphalt was milled off (United States); Asphalt being milled off a road and loaded into a truck (United States) |

### Credits

| Photo | Author | Licence | Credit shown |
|---|---|---|---|
| [6–10 mm crushed limestone aggregate in the hand — shows the chip size](https://commons.wikimedia.org/wiki/File:Gravel_03375C.JPG) | Emadrazo | CC BY-SA 4.0 | yes |
| [Aggregate stockpiles at a limestone quarry](https://commons.wikimedia.org/wiki/File:Wuppertal_-_Hahnenfurth_-_Oetelshofen-Steinbruchtag_048_ies.jpg) | Frank Vincentz | CC BY-SA 3.0 | yes |
| [Asphalt being milled off a road and loaded into a truck](https://commons.wikimedia.org/wiki/File:2021-07-29_14_39_10_Asphalt_road_surface_being_milled_in_preparation_for_the_addition_of_a_fresh_asphalt_surface_along_Tranquility_Court_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg) | Famartin | CC BY-SA 4.0 | yes |
| [Close-up of crushed granite aggregate](https://commons.wikimedia.org/wiki/File:Coarse_Granite_Aggregate_Texture.jpg) | Paul The Writer | CC0 | no |
| [Close-up of stone-filled gabion baskets](https://commons.wikimedia.org/wiki/File:Moscow,_Starodanilovsky_Proezd_2c9,_gabion_wall_finishes,_Apr_2026_02.jpg) | Retired electrician | CC0 | no |
| [Close-up of track ballast, Pimpama Station, Gold Coast](https://commons.wikimedia.org/wiki/File:Tracks_and_ballast,_Pimpama_Railway_Station,_Old_Pacific_Highway,_Gold_Coast_P1013627.jpg) | John Robert McPherson | CC0 | no |
| [Crushed granite chips](https://commons.wikimedia.org/wiki/File:Gravel_3_2018-06-17.JPG) | FASTILY | CC BY-SA 4.0 | yes |
| [Crushed stone laid as a driveway](https://commons.wikimedia.org/wiki/File:Gravel_driveway_(28119645366).jpg) | dankeck | CC0 | no |
| [Crushed-stone stockpiles at a limestone quarry](https://commons.wikimedia.org/wiki/File:Wuppertal_-_Hahnenfurth_-_Oetelshofen-Steinbruchtag_061_ies.jpg) | Frank Vincentz | CC BY-SA 3.0 | yes |
| [Decorative stone chips in a planted bed](https://commons.wikimedia.org/wiki/File:Gravel_2_2017-05-14.jpg) | FASTILY | CC BY-SA 4.0 | yes |
| [Gravel road near Fraserburg, Northern Cape](https://commons.wikimedia.org/wiki/File:Fraserburg,_South_Africa_-_panoramio_(7).jpg) | Graham Maclachlan | CC BY-SA 3.0 | yes |
| [Gravel road near Fraserburg, Northern Cape](https://commons.wikimedia.org/wiki/File:Fraserburg,_South_Africa_-_panoramio_(8).jpg) | Graham Maclachlan | CC BY-SA 3.0 | yes |
| [Gravel road to Olifantshoek, Northern Cape](https://commons.wikimedia.org/wiki/File:Road_to_Olifantshoek_-_panoramio.jpg) | Graham Maclachlan | CC BY-SA 3.0 | yes |
| [Heap of building sand for mixing mortar and concrete](https://commons.wikimedia.org/wiki/File:Pile_of_Sand_for_Building_in_Anambra_State.jpg) | Johnnybam | CC BY-SA 4.0 | yes |
| [Heap of pale crushed stone on a building site](https://commons.wikimedia.org/wiki/File:KaMkara.JPG) | Bhaskaranaidu | Public domain | no |
| [Heap of washed river sand, used as fine aggregate in mortar and concrete](https://commons.wikimedia.org/wiki/File:River_sand_mining_in_orissa.jpg) | Mahimagroups | CC BY-SA 3.0 | yes |
| [Mixed crushed stone with fines](https://commons.wikimedia.org/wiki/File:Varieties_of_Gravel_in_different_shapes_and_size._01.jpg) | Sabina Bajracharya | CC BY-SA 4.0 | yes |
| [Pale decorative stone chips in a garden bed](https://commons.wikimedia.org/wiki/File:Gravel_1_2017-05-14.jpg) | FASTILY | CC BY-SA 4.0 | yes |
| [Pea gravel](https://commons.wikimedia.org/wiki/File:PEA_GRAVEL.jpg) | Ranjithkumar Murugesan | CC0 | no |
| [Pile of broken stone and concrete rubble on a building site](https://commons.wikimedia.org/wiki/File:Pile_of_rubble_at_a_construction_site,_Trenwith_Lane,_St_Ives,_Cornwall_-_April_2025.jpg) | Mutney | CC BY 4.0 | yes |
| [Pile of crushed demolition rubble](https://commons.wikimedia.org/wiki/File:A_pile_of_rubble_-_geograph.org.uk_-_7197655.jpg) | Anthony O'Neil | CC BY-SA 2.0 | yes |
| [Pile of crushed gravel delivered to site](https://commons.wikimedia.org/wiki/File:Lone_pile_of_gravel_-_Hillsboro,_Oregon.JPG) | M.O. Stevens | CC BY-SA 3.0 | yes |
| [Pile of dark crushed stone for concrete](https://commons.wikimedia.org/wiki/File:Stone_Crush_Metel.JPG) | RanjithSiji | CC BY-SA 3.0 | yes |
| [Rail ballast on a rural line (Great Northern line, Queensland)](https://commons.wikimedia.org/wiki/File:Tracks_and_ballast,_Great_Northern_railway_line_at_Maxwelton,_2019.jpg) | Kerry Raymond | CC BY 4.0 | yes |
| [Red gravelly soil in a cutting — typical of in-situ subgrade and fill material](https://commons.wikimedia.org/wiki/File:Coarsening_upward.jpg) | Saran Rengaraj | CC BY-SA 4.0 | yes |
| [Riverbank protected with rip rap](https://commons.wikimedia.org/wiki/File:Difesa_della_sponda_del_fiume_Maggia_con_massicciata.jpg) | Arkelin | CC BY 4.0 | yes |
| [Riverside sand stockpile with tipper trucks](https://commons.wikimedia.org/wiki/File:Red_River_valley_between_Nanping_and_Hekou_-_P1380291.JPG) | Vmenkov | CC BY-SA 3.0 | yes |
| [Road surface after the old asphalt was milled off](https://commons.wikimedia.org/wiki/File:2014-09-09_09_03_10_Asphalt_milled_in_preparation_for_new_asphalt_overlay_with_new_overlay_partially_applied_on_Idaho_Street_(Interstate_80_Business_and_Nevada_State_Route_535)_in_Elko,_Nevada.JPG) | Famartin | CC BY-SA 4.0 | yes |
| [Rock-armour (riprap) revetment being built](https://commons.wikimedia.org/wiki/File:Revetment_Dubai.jpg) | Henk Jan Verhagen | CC BY-SA 4.0 | yes |
| [Rounded gravel laid on a yard](https://commons.wikimedia.org/wiki/File:Gravel_in_Duhok.jpg) | Firm Foundations Duhok | CC BY-SA 4.0 | yes |
| [Rounded natural pebbles](https://commons.wikimedia.org/wiki/File:Saltation.JPG) | The High Fin Sperm Whale | CC BY-SA 3.0 | yes |
| [Single-size crushed stone for concrete](https://commons.wikimedia.org/wiki/File:Gravel_Stones.jpg) | Saral Shots | CC0 | no |
| [Smooth dark pebbles](https://commons.wikimedia.org/wiki/File:Plage_de_Galets.jpg) | Bachelot Pierre J-P | CC BY-SA 3.0 | yes |
| [Stepped gabion retaining wall](https://commons.wikimedia.org/wiki/File:Gabion_Wall.jpg) | Encik Tekateki | CC0 | no |
| [Stockpile of natural (pit) gravel](https://commons.wikimedia.org/wiki/File:Sorted_gravel_pile_from_Pleistocene_glacial_outwash_(St._Louisville_gravel_pits,_Licking_County,_Ohio,_USA)_17_(45396483065).jpg) | James St. John | CC BY 2.0 | yes |
| [Washed sand stockpile under a quarry conveyor](https://commons.wikimedia.org/wiki/File:Estonia_sand_stockpile_under_conveyor_(6256459049).jpg) | Peter Craven | CC BY 2.0 | yes |
| [Heap of white quartz (silica) sand](https://commons.wikimedia.org/wiki/File:White_quartz_sand.jpg) | cty long lanh | CC BY-SA 4.0 | yes |
| [Washed silica sand stockpiles at a sand mine](https://commons.wikimedia.org/wiki/File:Strontian_sand_mine-washed_sand_-_geograph.org.uk_-_747805.jpg) | David Hogg | CC BY-SA 2.0 | yes |

## Kimi-sourced photos — live with the owners' permission

These come from supplier, marketplace, blog and editorial websites, and the
copyright stays with each owner. They were imported hidden until the owners
agreed; permission was received in October 2026, so they're now live and
shown before any open-licence photo. A sourced photo added to the manifest
later without `"permission": "GRANTED"` is still imported **hidden**
(`PERMISSION_PENDING`), and the controls below still apply:

- staff see them on each product in **Admin → Products** and in
  **Admin → Image permissions**, grouped by source company, with the source
  page links and a draft permission-request email;
- the public never does. They're left out of the storefront, the product API,
  the Meta catalogue feed, and the image route (a direct link returns 404);
- to see the store as it will look, staff click **Preview the storefront with
  these photos** (on Admin → Image permissions). It uses Next.js draft mode,
  for that browser only: pending photos appear on the real storefront with an
  orange "Awaiting permission" tag and a banner with **Exit preview**. Visitors
  and customers keep the normal cached store, and the API still checks the
  staff session on every photo;
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

- **G3, G6, G7, G10 and Silica Sand** had no usable Kimi photo. They now
  have open-licence photos (see above).
- **Hydrated lime, crushed brick aggregate and crusher dust** have no live
  photo yet. There are no suitable open-licence photos, and Kimi's are
  awaiting permission.
- **Lime:** the calcitic and dolomitic lime photos are single branded bag
  shots. Ask your lime supplier for packshots.
- **Packaged goods** (cement, grout, admixtures) weren't part of this set.
- **Longer term:** a half-day photo shoot at a partner yard would replace most
  of these with photos you own outright.
