# Calculators

Every calculator on the site lives with the materials it sizes. The homepage
**Calculators strip** and the **/calculators** page list them in one place and link
straight to each one; neither does any maths of its own.

| Calculator | Works out | Lives on |
|---|---|---|
| Tonnage & volume | Tons ↔ m³ by bulk density, bags where bagged, delivery estimate | Every aggregate product page (`#calculator`); the strip links to washed river sand |
| Ready-mix concrete | m³ priced by grade and tier, rounded up to a full truck; pump hire separately | Every ready-mix grade's page (`#calculator`); the strip links to 25 MPa |
| Bricks & blocks | Wall area less openings × units per m² × leaves, +5% breakage | `/bricks-blocks#wall-calculator` |
| Paving | Area × units per m², +5% for cuts | `/paving#paving-calculator` |
| French drain | Trench to drainage stone (t), perforated pipe (6 m lengths), geotextile rolls | `/drainage#french-drain-calculator` |
| Rebar mass | Bars × length to kg, tonnes and 6 m stock lengths (SANS 920 mass/m) | `/reinforcing-steel#bar-mass-calculator` |
| Project estimator | Job size to volume, tonnes and tipper loads, with the matching job pack | `/estimator` |

The list is `apps/web/src/data/calculators.ts`. Each entry has a short line for
the strip (`works`), a longer note for the page (`detail`), the link and an icon.
An entry tied to a product page (`sku`) drops out if staff hide that product.

On the homepage the strip sits after the featured products: four across on
desktop, two on tablets, and a sideways-scrolling row on phones so it doesn't
lengthen the page. The page is in the footer (Services) and the sitemap.

When adding a calculator, give its wrapper an `id` and `scroll-mt-24` so the link
lands on it below the sticky header, and describe only what it actually outputs.
