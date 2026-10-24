# Search, product listing and compare (ROADMAP Phase 4 and 3.3)

With 4,247 products, shoppers need to find things by the words they use and narrow the results down quickly. This release does that inside the storefront, with no extra service to run.

## Search engine — `apps/web/src/lib/search-engine.ts`

A small, pure module (no app imports). It does the following:

- **Normalising.** "42,5" and "42.5" match each other, and so do "38 × 114", "38x114" and "38 114". Case and accents are ignored.
- **Stemming.** Plurals reduce to one form (pipes → pipe, batteries → battery).
- **Synonyms.** About 60 groups of South African trade words, in `SYNONYMS`. Examples:
  - stone ↔ aggregate;
  - IBR ↔ roof sheet;
  - rebar ↔ Y-bar ↔ reinforcing steel;
  - JoJo ↔ water tank;
  - Nutec ↔ fibre cement;
  - aircon ↔ air conditioner;
  - dagha ↔ mortar;
  - latte ↔ lath.

  Multi-word phrases are matched first. Add a group by adding a line to `SYNONYMS`.
- **Typo tolerance.** A word that no product contains is replaced by the closest catalogue words: one edit for words of 4–7 letters, two for longer words. The page then says "Showing results for cement — you typed cemnt".
- **Word-start matching.** "tile" finds "tiles" and "cem" finds "cement", but "rod" never matches inside "products".
- **Ranking.** Matches in the name score above matches in the description. The whole query at the start of a name scores highest. Buy-online products get a small boost. With no query, buy-online products come first.
- **Facets, sorting and pages:**
  - each facet's counts are computed with the *other* filters applied, so a filter option never leads to an empty page;
  - sorts are best match, price low→high or high→low (quoted products always last), and name;
  - results come 48 to a page.

The engine sits behind one call, `search()`. If the catalogue outgrows in-process search, a hosted engine (Meilisearch or Typesense on Railway, ROADMAP 4.1) can sit behind the same call.

**Tests:** `apps/web/src/lib/search-engine.test.ts`. Run `pnpm --filter web test`, which compiles with `tsc` and runs `node --test`, so it needs no new dependencies. CI runs it in the web job.

## Catalogue index — `apps/web/src/lib/product-index.ts`

Every product, from all lines, is held as one flat record with:
- department, category and brand;
- standard;
- every unit with its buy-online price;
- the cheapest unit (used by quick add);
- **Sold by** (bulk, bags, each, per m², by length, packs, rolls, by weight…).

`searchCatalogue()` runs the engine over this index. Products staff have hidden are passed as `exclude`.

**Facets:** Department, Category, Availability (Buy online / Price on quote), Sold by, Brand and Standard.
- Standard uses only recognised codes (SANS, EN, ISO, ASTM, IEC, DIN, COLTO, TRH), because the catalogue's standard field is often a description.
- Each facet shows its top 8 values, with "more" revealing up to 40.

## Pages

| Page | What it does |
|---|---|
| `/products` | The whole catalogue: search box, filters with counts, removable filter chips, four sorts, 48 per page with numbered pages, **Buy online / Quote** badges, quick add-to-cart (one of the cheapest buy-online unit; ready-mix goes through its page for the minimum load) and **Compare**. |
| `/compare?skus=A,B,C` | Up to three products side by side: price per unit, availability, how it's sold, brand, standard, coverage per m², bulk density, summary and uses. The SKUs are in the URL, so a comparison can be shared. |
| `/search` | Site search: the top 12 products (with the typo note), plus "See all N products, with filters" linking to `/products?q=…`, then departments, categories, articles and pages. |
| Header suggestions | Use the same engine, so synonyms and typo tolerance work as you type. |

**URL parameters for `/products`:** `q`, `department`, `category`, `availability` (online / quote), `sold`, `brand`, `standard`, `sort`, `page`.

**Older links still work:**
- `group` (core, steel, masonry, roofing, supplies…) and `industry` scope the listing;
- `grading` maps to `standard`, and `sale=bag|bulk` maps to `sold`.

**Compare:**
- The list is kept in this browser only (`localStorage`, `lib/compare.ts`) and holds three products.
- The **Compare** checkbox is on every listing card and product page. A tray at the foot of the screen links to `/compare`.

Department landing pages link to their filtered listing ("Browse all N products with filters").

## Not in this release

- **"Available near you" and lead times (4.4).** These need supplier price lists and product-to-supplier mapping (Phase 1).
- **Photos and datasheets for every product (4.2).** These need supplier permission. Products without photos keep their material swatch.
- **One product page per family**, e.g. poles by diameter × length (2.6). This is the next step for the listing: fewer, richer cards.
