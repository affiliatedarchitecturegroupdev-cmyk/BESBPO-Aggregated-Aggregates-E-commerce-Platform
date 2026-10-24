# Merchandising: homepage sections, department pages and collections (ROADMAP Phase 3)

Product-led pages built from real data. A section with nothing real to show hides itself rather than padding out with filler.

## Homepage (`components/merchandising/HomeMerchandising.tsx`)

The sections come after the department tiles, in this order:

| Section | Fed by | Shows when |
|---|---|---|
| **Collections** placed on the homepage | Admin → Collections | Live, and it has products |
| **Best sellers this month** | Paid, non-test, not-cancelled orders in the last 30 days, ranked by how many orders included the product, then quantity (`/merchandising/top-sellers`) | ≥ 4 products |
| **Buy online today** | Priced products of one department, rotating daily among departments with ≥ 4 priced products, cheapest first, one per category | Always (while anything is priced) |
| **In season** | The South African season: festive (Dec–Jan) outdoor living; spring (Sep–Nov) lawn, soil, irrigation and waterproofing; late-summer rains (Feb–Mar); autumn (Apr–May) insulation; winter (Jun–Aug) insulation, fireplaces and hot water | ≥ 4 products |
| **New in store** | Products added at least a week after the store's first products, and within 60 days (the product's `createdAt`) | ≥ 4 products |
| **Trending in your province** | The same ranking per delivery province, for provinces with ≥ 3 paid orders in 30 days (tabs, up to 4 provinces) | ≥ 4 products per province |
| **Shop by brand** | Brands the catalogue names, with product counts. Text cards only: no logos without the brand's permission | ≥ 4 brands |
| **Delivered in 120 minutes** (with the AA 60/120 band) | Priced products with a unit AA 60/120 accepts. This is a copy of the API's rules in `apps/api/src/orders/express.ts`: keep the two in step. The API still decides every real cart | ≥ 4 products |
| **Site essentials under R500** | Buy-online products up to R500 in tie wire, fixings, sealants, PPE, tools and similar categories | ≥ 4 products |

**What stays private:**
- Best sellers and trending send **only ranked SKUs and province names** out of the API, never order counts.
- Rankings are cached for 10 minutes.

**Not built:**
- **Deals & price drops.** These wait for real promotions with was/now prices (Phase 7).
- **Bundles & kits.** These stay with Job Packs.

## Department pages (`SuppliesDepartmentPage`, `DepartmentExtras.tsx`)

The 26 building-supplies and range-expansion department pages gain the following, in order:
1. Collections placed on the department.
2. **Top sellers** in the department (≥ 4 products).
3. Buy online first, as before.
4. Up to 8 quote-only products per category.
5. **Complete the job:** the job checklist for the department's first mapped category.
6. **Calculators for this work.**
7. Buying tips, as before.
8. **An FAQ** with `FAQPage` structured data. Its answers use the department's own numbers, e.g. "N of M products can be bought online".

## Collections (ROADMAP 3.4)

Staff build collections in **Admin → Collections**:
- **Products:** hand-picked SKUs, shown first and in order, and/or a **rule** (search words, department, category, buy-online or quote only, a price limit).
- **Placements:** the homepage, any department pages, and always its own page at `/collections/<link name>`. `/collections` lists every live collection.
- **Timing:** optional start and end dates (the end date is inclusive), a switch, and a display order.

The admin list shows each collection's status (Live, Scheduled, Ended, Off), product count and placements.

Saving refreshes every page at once. Hidden products never show, and a collection with no products shows nothing.

**API:**
- Storefront: `GET /merchandising/collections?placement=HOMEPAGE|DEPARTMENT:<slug>` and `GET /merchandising/collections/:slug`, both returning live collections only.
- Staff: `GET|POST /merchandising/staff/collections`, and `PUT|DELETE /merchandising/staff/collections/:id`.

**Validation** (`collections.ts`):
- the link name format;
- known placements;
- something to show;
- a price limit from R1 to R1,000,000;
- the end date after the start date.

The database table is `Collection`, from migration `20261106090000_collections`.

## Tests

- **API unit tests:**
  - `collections.spec.ts`: slugs, validation, rule cleaning, live dates;
  - `top-sellers.spec.ts`: the ranking.
- **End-to-end:**
  - staff-only editing, placements, scheduling, switching off and deleting;
  - best sellers ignore test orders and expose SKUs only.
