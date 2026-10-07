# Agentic Build-Out Rules — Aggregated Aggregates Platform

Governance principle across every Besbpo Group platform build: **"AI proposes.
Humans approve."** This file is what makes that concrete for whoever (or
whichever agent) continues this build past Phase 1.

## The five phases

This scaffold delivers **Phase 1** only. Each subsequent phase closes on a
human PR review before the next begins — no phase starts on top of
unreviewed work.

| Phase | Scope | Status |
|---|---|---|
| 1. Foundation | Schema, auth (Email/Google/Microsoft), category/product structure, base storefront scaffold | **Delivered — this repo** |
| 2. Pricing & Calculators | Pricing microservice wired to real Category Markup Bands / Customer Tiers data; bulk/bag calculator; distance-banded delivery calculator | **Delivered** (PR #1) |
| 3. Trade & Quote Flows | Trade account/tier management, RFQ/bulk-quote flow, compliance document attachment | **Delivered** (PRs #3, #4) |
| 4. Storefront & CMS | Full storefront polish, CMS/admin, supplier & delivery-point locator; then the as-built expansion from the platform build documentation (Sep 2026): hero slideshow, industries, B2B Bulk & Infrastructure catalogue (CAT-10/11), ad system, blog, payment architecture, WhatsApp Commerce, Meta catalogue feed, partner-network page, SEO hardening | **Complete in code** — PRs #2, #5, #6 and the platform-expansion PR; supplier map pins still to be added by staff |
| 5. QA & Launch Prep | Human PR review throughout; pricing reconciled against both workbooks to the cent; real payment/WhatsApp credentials; real Brandfetch logo files; RICA activation of the 3 regional landlines | Not started |

## Rules for the agent doing the build-out

1. **Don't invent pricing.** Every rand figure, bulk density, bag premium,
   and delivery band must trace back to the Aggregated Aggregates pricing
   engine xlsx (Category Markup Bands, Customer Tiers, Delivery & Additional
   Charges sheets), committed at `docs/pricing/`. Prices reach the platform
   only through `services/pricing/scripts/import_pricing_framework.py`, and
   `services/pricing/tests/test_reconcile_workbook.py` holds every SKU to the
   workbook to the cent — see `docs/pricing/README.md`. Never hand-edit the
   generated JSON; flag any mismatch rather than silently "fixing" the number.
2. **No owned-yard logic.** The confirmed model is broker/network: an
   approved partner-supplier network (104 verified partners), no owned inventory. Do not add `StockLevel` /
   `StockMovement` models or any owned-inventory tracking — that was
   explicitly dropped. Stock questions route to a supplier, not a warehouse.
3. **Quote-only stays quote-only.** Volume/Civil Bulk tier orders (≥10m³)
   and any delivery beyond 100km must route to the RFQ flow, never to a
   live checkout price. This is a business rule, not a UI nicety — enforce
   it server-side in the pricing microservice, not just in the frontend.
4. **Every phase ends in a PR, not a merge.** Open a pull request per phase
   (or per meaningful milestone within a phase on a long one), summarize
   what changed and why, and stop for human review. Don't chain phase 3
   work onto an unreviewed phase 2 branch.
5. **Legal pages are templates, not law.** The content under `content/legal/`
   and the pages it renders are structured to match South African
   e-commerce/POPIA norms, but they are drafting templates. Do not represent
   them as final without sign-off from whoever handles Besbpo Group's legal
   review — flag this explicitly in the PR that first exposes them publicly.
6. **Match sibling platforms, don't reinvent.** Roofsteel and Bricksplaza
   already solved auth, trade-tier discounting, RFQ flows, and compliance-doc
   attachment on this exact stack. Where this scaffold's approach diverges
   from theirs without a documented reason in the spec, treat that as a bug
   to raise, not a design choice to run with.
7. **Keep the LoC estimate honest.** The spec's working benchmark is
   30,000–38,000 lines of code, anchored to Roofsteel's real delivered
   figure (35,521 LoC). If a phase is running far outside that band, that's
   a signal to check scope creep before writing more code.

8. **Payment routing is config, not code.** Every `PaymentMethodConfig`
   row is admin-editable (`/admin/payments`: active gateway, fallback,
   limits, on/off) so ops can fail a method over (e.g. Ozow outage → Peach)
   without a deploy. Never hardcode a gateway inside a controller or
   service — resolve it through `PaymentGatewayService` and
   `PaymentGatewayAdapterFactory`. Eligibility is decided server-side at the
   buyer's own tier and re-checked on every payment. See
   `PAYMENT_PROVIDER_TERMS.md` and `PAYMENT_ASSETS.md`.
9. **B2B catalogue dedup is load-bearing.** Before adding any SKU, apply
   `B2B_BULK_CATALOGUE.md`'s three-bucket rule against the **real** workbook
   catalogue, not a sample. Silica Sand and Gabion Stone were already in the
   workbook and were not added; Dump Rock, Pipe Bedding Sand and Filter Stone
   were approved as distinct SKUs (Oct 2026) and are priced by their category
   band only. Cement follows `CEMENT_MASTER_CATALOGUE.md` (one row per named
   product; bulk is a pack size, specialist traits are attributes, never
   duplicate SKUs).
10. **No fabricated prices, ever — including packaged goods.** CAT-10/11
    prices come only from `services/pricing/data/b2b_packaged_catalogue.json`
    (the B2B workbook). Where `pricing_status` isn't "Ready — benchmarked",
    the price stays null: the pricing service refuses to quote it, orders
    containing it are quote-only (`PRICE_ON_REQUEST`), and the storefront
    shows "Price on request". Bag units ride the bagged-goods delivery rules;
    bulk bags, tankers, drums and totes are quoted.
11. **Social channel scope stays as confirmed.** WhatsApp Commerce
    (`channels/whatsapp`) is the only channel with its own order intake, and
    it's for Retail-tier bagged and small orders — bulk and Volume/Civil Bulk
    go to `/quote`. Webhooks must carry Meta's signature
    (`WHATSAPP_APP_SECRET`). Instagram/Facebook are catalogue-feed only
    (`/api/v1/channels/catalogue-feed.csv`) — Meta dropped in-app checkout in
    August 2025, so a Shop tap lands on the normal storefront. TikTok Shop
    isn't available in South Africa; TikTok is marketing-only. No stock
    deduction anywhere (rule 2).
12. **Confirmed brand/channel config — don't "correct" it.** Group-level
    social handles (`apps/web/src/data/social.ts`: 5 live, 3 placeholder),
    the WhatsApp number (`wa.me/27683676276`), corporate contact details
    (`apps/web/src/data/corporate-contact.ts`: 1 live line, 3 RICA-pending),
    the corporate site (`aggregated.besbpo.co.za`), the group site
    (`besbpo.co.za`), the storefront domain (`aggregates.store`) and the legal
    line "Besbpo Group (Pty) Ltd T/A Aggregated Aggregates (2026/490480/07)"
    (footer and documents) are client-confirmed.
13. **Supplier data policy.** The supplier CSVs are committed
    (`packages/database/prisma/seed-data/`) and the public partner-network
    page shows supplier names, towns and categories, as the build
    documentation specifies. Contact details and map pins stay staff-only.
    Researched B2B leads (`isVerifiedPartner = false`) are labelled as leads,
    import inactive, and never count as delivery points.
14. **Discounts never go below the floor.** Every tier price is
    `max(list × (1 − tier discount), cost × 1.03)`, and cement and ready-mix
    Volume/Civil Bulk orders are quoted (`PRICING_POLICY.md`). Change the
    schedule in `discount_floor.py` and `tier-pricing.ts` together.
15. **Hire and services are quoted until partners put rates in writing.**
    Plant hire, site services and the further lines (recycled loop, fill
    exchange, testing, diesel, small-equipment hire) show no price until at
    least two partners' written rate cards exist for a SKU in a province,
    loaded only by `services/pricing/ratecards/load_rate_cards.py`
    (`PLANT_HIRE_CATALOGUE.md`). Until Phase C ships, never say a hire is
    booked, paid or protected online — requests are enquiries.

## Open items carried into the build-out

- Partner-supplier network: **received and seeded** — 104 verified partners
  (60 Tier 1 + 44 Tier 2; SUP-088–104 are the Free State and Northern Cape
  suppliers added Oct 2026, each with its source page in `source_url`) plus 18 researched B2B Bulk & Infrastructure leads,
  added on deploy by `apps/api/dist/suppliers/seed-suppliers.js` (create-only;
  staff edits survive). Neither CSV has coordinates, so each active supplier
  needs a map pin from staff before it's used for distance estimates. Pins
  must come from a map, never be guessed: a wrong pin moves customers across
  the 30/60/100km delivery bands. Delivery is national (all nine provinces,
  Oct 2026): verified partners in every province are active.
- Payment gateways: every adapter except Manual EFT/PO is a structural stub
  until merchant credentials exist (PayFast, Peach, Ozow, Stitch, Lulapay —
  see `/admin/payments` for what each still needs). The cart (`/cart`) and
  checkout (`/checkout`) create orders that are paid from
  `/orders/[id]/confirmation`; staff confirm, dispatch and close them in
  `/admin/orders`.
- Cart delivery distance is straight-line from the buyer's location to the
  nearest pinned supplier for each material (the furthest one sets the band);
  road distance is confirmed at dispatch. A material with no pinned supplier
  needs the buyer to enter a distance. Orders the pricing service marks
  quote-only (e.g. over 100km, or Volume/Civil Bulk over 10m³) can't be
  placed — the cart links to a prefilled quote request instead.
- Prices are shown as the workbook gives them; whether storefront prices
  should be labelled incl./excl. VAT is still to be confirmed. Tax invoices
  are built (Admin → Orders → Issue tax invoice; PDF for the buyer) but are
  refused until `GROUP_VAT_NUMBER` holds the Group's real VAT number and
  `PRICES_INCLUDE_VAT=true` confirms prices include VAT. If prices turn out
  to be VAT-exclusive, checkout must add VAT before invoices can be issued.
- EFT banking details come only from `EFT_BANKING_DETAILS` on the API
  (order confirmations, unpaid tax invoices, the EFT / purchase-order payment
  message). The Group's Nedbank account details were supplied (Sep 2026) and
  go into that Render setting, not the repository. Until it's set, buyers
  are told to ask for them — banking details are never invented.
- Transactional email: the notifications module is built (order, quote and
  trade-account messages to customers and staff, logged in
  `/admin/notifications`), but nothing is emailed until an email provider is
  chosen and `EMAIL_PROVIDER`, `EMAIL_API_KEY` and `EMAIL_FROM` are set
  (`docs/notifications.md`). WhatsApp order/quote updates also need the five
  message templates approved by Meta.
- WhatsApp Business API credentials (`WHATSAPP_PHONE_NUMBER_ID`,
  `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`,
  `WHATSAPP_APP_SECRET`). Free-text matching of chat requests to SKUs isn't
  automated; sales prices them from `/admin/whatsapp`.
- Payment-method logos: 17 of 18 are official files (PayFast's logo pack,
  Brandfetch, and the Lula and Float files Fortune supplied); EFT/PO uses a
  house icon. Social icons are the official symbols; LinkedIn stays hidden
  until it's registered (`PAYMENT_ASSETS.md`).
- Product photography (`PRODUCT_IMAGES.md`): Kimi's 55 sourced photos are
  live (owners' permission received Oct 2026) and shown first; open-licence
  Wikimedia Commons photos follow, each with the credit its licence requires
  (under the photo and on `/photo-credits`); credited photos never go to the
  Meta feed. Weak Commons photos for the sands and limes were retired.
  Never publish a photo without a licence that allows commercial use or the
  owner's permission, and never drop a required credit. 9 Kimi files arrived
  damaged.
- Hero slideshow: 10 of the planned 10–12 licensed photos are sourced
  (`apps/web/src/data/media.ts`); staff manage captions, order and visibility
  in Site content.
- Case studies are illustrative and labelled as such until real client
  projects are approved for publication.
- Besfleet vs. external-partner routing logic for the 15+ courier network —
  the data model supports either via `Shipment.carrier`, but the dispatch
  rule (which orders go to Besfleet vs. which external partner) isn't
  specified yet and shouldn't be hardcoded without confirmation.
- People data (POPIA): job applications (CVs are private, staff-only;
  delete after 12 months or on request — Admin → Careers) and newsletter
  subscribers (consent recorded; every email must carry the subscriber's
  unsubscribe link from the CSV export). Never email the list from a copy that
  includes unsubscribed people.
- `/coverage` town coordinates come from GeoNames (CC BY 4.0), never typed by
  hand; suburbs not in GeoNames are aliases of the town they belong to
  (`apps/web/src/data/coverage-towns.ts`). Keep the GeoNames credit on the page.
- Cross-sell copy for Affiliated Builders and Finishes Construction
  (`apps/web/src/data/group-companies.ts`) is deliberately general — confirm
  services with each company before adding specifics.

