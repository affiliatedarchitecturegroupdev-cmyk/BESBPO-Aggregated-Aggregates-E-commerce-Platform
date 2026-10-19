# Retail benchmarks for quote-only products

Most of the range was listed as quote-only, with no price. This is how
quote-only units get a list price once two South African retailers publish
a comparable regular price. The rule is the one in `PRICING_POLICY.md`:

- at least two different retailers;
- regular prices only, never promotions;
- benchmark = the lowest listing; list = benchmark × 1.08.

## How it works

Each review round is an evidence file in `scripts/catalogue/benchmarks/`,
named by the date the prices were checked. Each item names one unit of one
product, plus the retailer listings that back it. The script checks the rule
and refuses the file if any item breaks it:

```
python3 scripts/catalogue/apply_benchmarks.py scripts/catalogue/benchmarks/2026-10-19.json
python3 scripts/public-catalogues.py
```

- A unit that already has a price is left alone unless its item says
  `"replace": true`.
- A unit that is priced gets:
  - status "Ready — benchmarked";
  - cost basis 100% (the benchmark-as-cost proxy);
  - markup 8%;
  - a source note listing every price seen, with the date.
- The source note, retailer names and benchmark are internal.
  `scripts/public-catalogues.py` strips them from the storefront copy.

## Comparing like with like

A listing counts only when it is the same thing:

- **Branded goods:** same make and size at both retailers. Examples: Duram
  bonding liquid 5 L, Kwikot vacuum breaker 15 mm, Radiant GU10 5 W.
- **Commodity items:** same specification. Examples: Surfix 2.5 mm² × 100 m,
  PVC conduit 20 mm × 4 m, hardboard 2440 × 1220 × 3.2 mm, empty 12-way
  surface DB board.
- **Different pack sizes:** when retailers sell the same item in different
  packs, a listing carries a `factor`, and its price × factor is what is
  compared. For example, cable sold per metre is × 100 against our 100 m
  roll, and nails sold in 1 kg packs are × 5 against our 5 kg box. Small
  packs scaled up usually cost more than the bulk pack, so a factor never
  understates the price. The lowest figure wins either way.

The following stay quote-only:

- generic products whose make decides the price, such as toilets, mixers,
  tiles, lock sets, inverters and batteries;
- bulk units, such as bulk bags, tankers and drums;
- items where a listing doesn't state the size;
- items found at only one retailer.

## Where prices were checked

Retailer sites were read only within their robots.txt, at their stated crawl
delays:

| Retailer | Source |
|---|---|
| Builders | public product search |
| Cashbuild | category pages |
| Chamberlains | product pages from its sitemap |
| Leroy Merlin | product pages from its sitemap |

Sites that block automated access were left alone: BUCO, PennyPinchers,
Timber City, Brights and Makro.

## Rounds

| File | Units priced | Lines |
|---|---|---|
| `2026-10-19.json` | 103 | cement and mortars (batch A); electrical, solar, tiling, plumbing fittings, fixings and boards (batch B); steel windows, door frames, fencing, geyser parts, copper and Polycop pipe and fittings, valves, soil fittings, ceilings, PPE and waterproofing (batch C) |

The October 2026 round ended with 195 of the 1,343 merchant-line products
priced. The batch C collection stopped at the background-job time limit after
328 of 433 supplies products. Tools, most PPE, paint and the rest of
waterproofing were matched against the Cashbuild crawl and earlier results
only.

Batch D (masonry, roofing, timber and steel) priced nothing new. Its remaining
products were found at only one retailer, or the listings disagreed too much
to trust. Concrete lintels are an example: Cashbuild lists 1.2 m at R179.95,
while Builders lists an unbranded 1200 mm one at R28.48. Those products stay
quote-only until a second source confirms them.
