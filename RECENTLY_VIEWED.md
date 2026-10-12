# Recently viewed

The homepage, the `/products` listing, product pages and the cart show a
**Recently viewed** row: the last products this browser opened, newest first, as one sideways-scrolling row with each product's
headline list price (or "Price on quote").

## Privacy

- The list lives only in the visitor's browser (`localStorage`, key
  `aa-recently-viewed`): SKUs only, at most 12. Nothing is sent to the server,
  stored against an account or used for analytics.
- **Clear** on the row empties it; clearing the site's data in the browser does too.
- The Cookie Policy (functional cookies and browser storage) says so.
- In private browsing, or where storage is blocked, the row works for the current
  page only and nothing breaks.

## Behaviour

- Opening a product page records it (`recentlyViewed.record`) and the row on that
  page leaves the current product out, so the first product viewed shows no row.
- Products staff have hidden never show; SKUs no longer in the catalogue are dropped
  when the list is read.
- Tabs stay in step through the `storage` event.

## Code

- `apps/web/src/lib/recently-viewed.ts`: the store (`useRecentlyViewed`, `recentlyViewed.record/clear`).
- `apps/web/src/components/merchandising/RecentlyViewed.tsx`: the row (client).
- `apps/web/src/components/merchandising/RecentlyViewedRow.tsx`: server wrapper that
  passes hidden SKUs; used at the end of all five product page layouts, `/products`
  and `/cart`. The homepage renders `RecentlyViewed` directly (it already has the
  hidden SKUs) after the quick tonnage calculator.
- The row renders nothing until the visitor has viewed a product, so first-time
  visitors never see an empty section.
