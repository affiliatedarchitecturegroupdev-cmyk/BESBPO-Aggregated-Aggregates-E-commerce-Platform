# Product families (ROADMAP 2.6)

Many products are the same thing in different sizes. Treated poles alone come in 59 diameter × length combinations; glulam, drill bits, PAR timber, lintels and farm gates are similar. Listing every size as its own card buries everything else. Hiding sizes behind a filter or dropdown is worse: many shoppers never use filters, and a size they can't see is a size they assume we don't sell.

So families are **a way of showing products, never a change to the catalogue**:
- every size keeps its own product page, price, cart line, search result and link;
- grouping is conservative, so only obvious cases group;
- the sizes are always visible as plain text: on the card, on the product page and in search suggestions.

## Which products group (`apps/web/src/lib/product-families.ts`)

A family is products that meet all three conditions:
- **they're in the same category**;
- **their names differ only in sizes.** The size is the numbers in the name and the units next to them, such as mm, m, kg, L, kW, BTU, rungs and steps. It also takes in nearby words like "Wide", "Wall" and "Grade 8.8", and brackets that contain a number, e.g. "(pack of 10)" or "(H3)";
- **there are at least 4 of them** (`MIN_FAMILY`). Smaller sets stay as separate products.

Words that make a product *different* keep it separate: colour, material, type, brand. A formulation ratio such as fertiliser **2:3:2** vs **3:1:5** is treated as part of what the product is, so those never group.

**Today:** 4,240 products form 240 families covering 1,725 products. The full catalogue shows as 2,755 cards instead of 4,240. In the Timber department, 385 products become 74 cards.

## Where it shows

**Product listing (`/products`)**
- Sizes are grouped by default. A plain-language banner says so, with a **Show every size separately** link (`view=all`), and **Group sizes together** goes back.
- **Searching for a size never groups.** A search containing a number ("38x114", "6 mm", "Y12") is someone looking for an exact product, so they see it directly.
- A family that has only one size in the current results shows as that product.
- Each family card shows:
  - "**N sizes**";
  - "Available in N sizes — pick yours";
  - up to 6 **size chips**, each linking straight to that size's page, then "+N more";
  - the lowest buy-online price;
  - a Buy online, "N buy online" or Quote badge;
  - a "See all N sizes" button.
- Product and page counts still count every product: "385 products (74 cards — sizes shown together)".

**Product pages**
- Every product in a family shows **"<Family>: all N sizes"** (`#sizes`): a grid with every size visible at once, each with its price or "Quote", and the current size marked.
- It ends with "Need a size that isn't listed? Ask on a quote."
- Roof & structural timber keeps its own grade, treatment and finish picker instead.

**Header search suggestions**
- A family appears once, as "CCA Treated Pole · 59 sizes · …", linking to its size grid.
- Again, a search containing a number lists exact sizes.

**Unchanged:** homepage and department rows, compare, the cart, quotes, the sitemap and structured data all still work per product.

## Tests

`apps/web/src/lib/product-families.test.ts` covers:
- size and title splitting;
- the ratio rule;
- the minimum family size;
- same-category only;
- listing order;
- a single match showing as the product.

Run them with `pnpm --filter web test`.
