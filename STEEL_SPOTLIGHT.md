# Steel spotlight

A homepage band, after the calculators strip, for the steel line
([STEEL_CATALOGUE.md](STEEL_CATALOGUE.md)):

- **Left:** what we sell (SANS 920 Y-bar, SANS 1024 mesh, brickforce, delivered by
  flatbed from merchants in the network), a card for **cut & bend to your schedule**
  (`/reinforcing-steel/cut-and-bend`), a card for the **rebar mass calculator**
  (`/reinforcing-steel#bar-mass-calculator`) and a link to the whole steel line.
- **Right:** today's retail list prices for the everyday steel, each row linking to
  its product page, with mass per metre for bars.

## Which prices show

`PICKS` in `apps/web/src/components/merchandising/SteelSpotlight.tsx`, in order:
Y10, Y12, Y16, Ref 193, Ref 100, brickforce 150, tie wire — at most six. A line
shows only when it has a benchmarked list price and staff haven't hidden it, so
nothing is invented: a pick without a price simply drops out and the next one
takes its place. Prices come from the same catalogue data as the product pages
and match them.

The header says "Retail list · trade tiers pay less". It does not say whether the
prices include VAT, because the storefront's VAT basis isn't confirmed yet
(PRICING_POLICY.md).
