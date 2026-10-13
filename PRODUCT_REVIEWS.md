# Product ratings & reviews

Owner's rule (13 Oct 2026): **any signed-in customer can rate a product
(stars); only a customer who has bought and paid for it can write a review.**

## Who can do what

| | Stars (1–5) | Title and written review |
|---|---|---|
| Visitor (not signed in) | — (asked to sign in) | — |
| Signed-in customer | ✓ | — |
| Customer with a paid order of the product | ✓ | ✓ shown as **Verified purchase** |

- "Paid" means one of **their own** orders (not a colleague's company order)
  with `paidAt` set, not cancelled and not a test order, that included the
  product. The API checks it on every save; the form only shows the review
  fields when it holds.
- One rating/review per customer per product. Saving again updates it; the
  customer can remove it. The paid order is kept on the review as the proof
  of purchase (staff see the order number).
- Ratings and reviews publish immediately. Phone numbers, emails, links and
  social handles are stripped before saving (`common/redact.ts`), and the
  customer is told when that happened.
- Reviews show the reviewer's first name and surname initial only
  ("Thandi M."), never email, phone, company or order.

## On the storefront

- Under every product name: average stars and the number of ratings and
  reviews, linking to `#reviews` (or "Be the first to rate this product").
- **Ratings & reviews** section on all six product layouts: the average
  over every published rating, the 5-to-1 star spread, the written reviews
  newest first, and the customer's own form (star picker; title and text
  when eligible). Signed-out visitors get a sign-in link back to the reviews.
- **Your orders:** paid orders list "Rate & review" links to each product.

## Moderation

**Admin → Reviews**: every rating and review, newest first, with the
reviewer's name, email and order number. Staff can **hide** a review with a
reason (shown to the customer, who can edit it for another look) and
**publish it again**. Hidden reviews drop out of the list and the average.
Negative reviews are not hidden for being negative (Terms §6A).

## Policies

- Privacy Policy §3B — what is kept and what is published.
- Terms & Conditions §6A — written reviews only from paid purchases; honest,
  on-topic, not abusive; no paid or rewarded reviews.

## Code

- API: `apps/api/src/reviews/` — `GET /reviews/products/:sku` (public),
  `GET|PUT|DELETE /reviews/products/:sku/mine` (signed in),
  `GET /reviews/summaries` (public, per-SKU average and count),
  `GET /reviews/staff` and `PATCH /reviews/staff/:id` (staff).
- Schema: `ProductReview` (unique per product and user), migration
  `20261024090000_product_reviews`.
- Web: `components/reviews/` (`ProductReviews`, `ReviewForm`,
  `RatingSummaryLink`, `Stars`), `app/reviews/actions.ts`,
  `app/admin/reviews/`. Review data is cached for a minute under the
  `reviews` tag and refreshed when a review is saved or moderated.

## Not yet

- Stars on product cards in listings (`GET /reviews/summaries` is ready for it).
- Review stars in search results (schema.org `aggregateRating`).
