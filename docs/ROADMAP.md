# Aggregated Aggregates — Platform Roadmap

*Agreed with the owner on 22 October 2026. This is a planning document: nothing in it is built yet unless it is marked **Done**. Items move to **Done** in this file as they ship, with the PR number.*

The aim is a store that is the benchmark for South African building-materials e-commerce:
- the deepest range;
- the clearest prices;
- the fastest delivery;
- the best tools for both homeowners and contractors.

## Contents

1. [Where we are today](#1-where-we-are-today)
2. [Architecture: core on Render, satellite services on Railway](#2-architecture-core-on-render-satellite-services-on-railway)
3. [Phase 0 — Unblock: deploys, payments, invoicing, legal](#phase-0--unblock)
4. [Phase 1 — Sell more of what we list: supplier price lists](#phase-1--sell-more-of-what-we-list)
5. [Phase 2 — Range depth: Garden & Lawn, Timber & Poles, and more](#phase-2--range-depth)
6. [Phase 3 — Merchandising: show the products off](#phase-3--merchandising)
7. [Phase 4 — Find and choose: search, product data, availability](#phase-4--find-and-choose)
8. [Phase 5 — Operations: Work module, analytics, accounting, WhatsApp](#phase-5--operations)
9. [Phase 6 — Trade and contractor accounts](#phase-6--trade-and-contractor-accounts)
10. [Phase 7 — Growth: marketing, SEO, content, loyalty](#phase-7--growth)
11. [Phase 8 — Customer experience extras](#phase-8--customer-experience-extras)
12. [Phase 9 — Delivery and logistics](#phase-9--delivery-and-logistics)
13. [Phase 10 — Reliability and security](#phase-10--reliability-and-security)
14. [Rules every phase follows](#rules-every-phase-follows)
15. [Owner actions and decisions](#owner-actions-and-decisions)

---

## 1. Where we are today

### Size (21 October 2026)

| Measure | Size |
|---|---|
| Files in the repository | 1,156 |
| Code (TypeScript, Python, SQL) | ~72,000 lines in ~770 files |
| — storefront and admin (web) | 447 files, ~40,000 lines |
| — API | 248 files, ~23,000 lines |
| — pricing engine | 28 files, ~3,600 lines |
| — database | 48 files, ~5,200 lines, 44 migrations |
| Automated tests | ~7,800 lines: 236 API unit, 122 end-to-end, 157 pricing |
| Catalogue and pricing data | ~110,000 lines |
| Documentation | 60 documents, ~7,000 lines |
| Page templates | 161 |
| Public pages | ~1,580 |
| Account, admin and portal pages | ~110 |

The ~1,580 public pages are made up of:
- 1,401 product pages;
- 54 category pages;
- ~47 main and landing pages;
- 18 plant hire, 11 service and up to 9 province pages;
- 17 design service pages;
- 14 industry and business-line pages;
- 11 legal pages.

**Products by line**

| Line | Products |
|---|---|
| Aggregates | 51 |
| Cement & binders | 62 |
| Ready-mix | 7 |
| Steel | 151 |
| Masonry | 222 |
| Roofing & timber | 153 |
| Building supplies | 755 |
| **Total** | **1,401** |

**Only 250 of the 1,401 products (18%) can be bought online.** The other 1,151 are quote-only. Closing that gap is the single most valuable thing on this roadmap (Phase 1).

### Built and live (or merged)

- **Catalogue and pricing:** 20 departments, the pricing engine, tier pricing, and the discount floor.
- **Checkout:** deposits, lay-by, payment links, proformas, and the AA 60/120 express service.
- **Payment gateways:** PayFast, Peach and Stitch adapters with failover, and suggesting pay by bank first from R30,000.
- **Quotes and projects:** RFQ quotes, BOQ upload, project lists, Complete the Job, Best With, calculators, the estimator and the shopping assistant.
- **Services:** plant hire and site services with a partner portal; cut & bend; architecture & engineering services.
- **Suppliers and delivery:**
  - the supplier network, with pins and a supplier portal;
  - phased deliveries and proof of delivery;
  - lead times;
  - the Distributed Delivery Premium.
- **Accounts and reviews:** trade accounts and trade credit; ratings and reviews.
- **Communication:** email (Resend) with PDF attachments and the official logo; WhatsApp notifications and WhatsApp Commerce (built, not yet connected to Meta).
- **Admin and reporting:** Insights with weekly email digests; the ad system and blog; careers; the newsletter (Listmonk built, not yet deployed).
- **Policies:** legal pages with version history.

### Pushed to the working branch, not yet merged

| Item | Doc |
|---|---|
| LayUp's official logo (replaces the generic lay-by badge) | `PAYMENT_ASSETS.md` |
| Sales quotations: admin-made, numbered PDF quotes, emailed or shared on WhatsApp, accepted and paid online | `docs/sales-quotes.md` |

---

## 2. Architecture: core on Render, satellite services on Railway

**Principle:** the business core stays on Render. Satellite services that support it run separately on Railway. The core never depends on a satellite to take an order or a payment.

| Render: the business core | Railway: satellite services |
|---|---|
| Storefront (Next.js) | Matomo: analytics (Phase 5) |
| API (NestJS) | BigCapital: accounting (Phase 5) |
| Pricing engine (FastAPI) | Meilisearch or Typesense: search (Phase 4) |
| Main database (Postgres) | GlitchTip: error tracking (Phase 10) |
| Listmonk: newsletter, as already set up in `render.yaml` | Chatwoot: client inbox, optional (Phase 5) |
| | Mattermost or Rocket.Chat: team chat, optional (Phase 5) |

### Integration rules

1. **The platform is the source of truth** for products, prices, orders, quotes, payments and invoices. Satellites receive copies.
2. **Data flows out of the core, asynchronously.**
   - The API sends events: a paid order becomes an invoice and a payment in BigCapital; a refund becomes a credit note; a sale goes to Matomo.
   - Events are queued and retried, so a Railway outage only delays them.
3. **The platform keeps issuing tax invoices** (AAI-000001…). BigCapital books them with the same numbers. There is never a second invoice series.
4. **Secrets:**
   - Satellite credentials live in Render or Railway environment variables only. They are never put in the repository or pasted into chat.
   - Each satellite gets its own scoped API key.
5. **POPIA:** before any satellite holds customer personal information, the Privacy Policy's section on processing outside South Africa is updated to name the host (for example Railway for BigCapital).

### Railway plan sizing

- **The free / trial plan** (30 days with $5 credit, then $1 a month; up to 1 vCPU and 0.5 GB RAM per service; 0.5 GB of storage) is only good for **short tests**, for example trying Matomo for a couple of weeks.
- **Hobby plan or higher** for anything kept. The free tier's RAM and storage are too small, and the credit runs out fast with always-on services.
- **BigCapital** is light and fits a small Hobby setup.
- **ERPNext is not chosen.** It would need 2–4 GB of RAM, and most of what it does duplicates the platform. It stays an option only if a full ERP (manufacturing, HR) is ever needed.

### Decisions recorded

| Decision | Choice |
|---|---|
| Accounting system | **BigCapital** (open source, accounting-focused, API). Confirm with the accountant first (Phase 5). Fallbacks: Odoo Community (accounting only), Akaunting. |
| Satellite host | Railway, separate from the core on Render. |

---

## Phase 0 — Unblock

These come first: nothing new reaches customers until they are done.

| # | Item | Status / owner |
|---|---|---|
| 0.1 | **Fix Render deploys.** Every deploy since 13:27 on 20 Oct 2026 failed within 1–2 seconds, for both the API and the web. That is a Render account or plan problem, not the code. Find the reason in the Render dashboard (Events → failed deploy; Billing / build minutes), clear it, then deploy the **API first** (it applies migrations) and then the web. | Owner (Render dashboard) |
| 0.2 | **Deploy from `main`.** Today Render deploys the working branch `claude/ecommerce-platform-rivx7o`, so pushes go live before they are approved. Set `branch: main` on each service in `render.yaml` (or in each service's Settings) so that "open the PR and merge" is the only way to release. | Decide, then a small change |
| 0.3 | **Staging environment.** A second, smaller Render environment that deploys the working branch, so changes can be tested live before merging. | After 0.2 |
| 0.4 | **Payments live:** Stitch review → live keys and webhook (`docs/payments-stitch.md`); PayFast KYC; Peach KYC and Hosted Checkout V2. After Stitch goes live, confirm which methods its page offers before routing card, Capitec Pay or bank tiles to it. | Owner + gateways |
| 0.5 | **Mark test order AA-1792488427457 as a test** so it never counts in reports or Best With. | Owner (Admin → Orders) |
| 0.6 | **Tax invoices:** set `GROUP_VAT_NUMBER` and `PRICES_INCLUDE_VAT=true` on the API so staff can issue tax invoices. | Owner (Render env) |
| 0.7 | **Legal review:** the Terms, Privacy Policy and POPIA Notice are still marked "awaiting attorney review" in `content/legal/README.md`. | Owner + attorney |
| 0.8 | **Merge the pending work:** the LayUp logo and sales quotations. | Owner approval |

---

## Phase 1 — Sell more of what we list

**Goal:** turn the 1,151 quote-only products into products customers can buy, using real supplier prices.

| # | Item | Notes |
|---|---|---|
| 1.1 | **Supplier price-list import** | Each supplier uploads a CSV (or staff upload it for them): SKU or supplier code, cost, unit, valid-until. The platform suggests sell prices using each product's standard markup (the same model as sales quotations). **Staff approve** the prices before they go live. Older prices are kept as history. |
| 1.2 | **Supplier cost book** | Each product's current supplier costs, with supplier, date and validity. The same costs feed sales quotations, so staff stop re-typing them. |
| 1.3 | **Product-to-supplier mapping** | Which partner supplier sells which SKU under which code. This is also the basis for "available near you" (Phase 4) and the Distributed Delivery Premium's supply points. |
| 1.4 | **Price freshness rules** | Prices expire when the supplier's price list does. An expired product reverts to quote-only rather than selling at a stale price. |
| 1.5 | **Supplier portal: self-service price updates** | Suppliers update their own prices and availability, and staff approve. |
| 1.6 | **Coverage target** | Target: half the catalogue buyable online within the first quarter of supplier onboarding. Report progress on Insights ("Priced online: X of Y"). |

---

## Phase 2 — Range depth

**Goal:** be the deepest range in the market. Each new department follows the same process:
1. catalogue research;
2. price benchmarks or supplier price lists;
3. category pages, calculators and Complete the Job pairings;
4. supplier leads;
5. tests and docs.

### 2.1 New department: Timber, Poles & Decking

Builds on the existing structural timber.

| Range | Products |
|---|---|
| **Treated gum poles** | CCA- and creosote-treated, diameter 50–250 mm+ × length 1.8–9 m |
| **Laths, droppers, fencing and vineyard poles** | Various sizes |
| **Engineered timber** | Laminated (glulam) beams, I-joists, LVL |
| **Hardwoods** | Meranti, saligna, balau: frames, decking, joinery |
| **Decking** | Pine, hardwood and composite boards; joists, clips and decking screws |
| **Cladding** | Shiplap, tongue-and-groove, battens |
| **Kits** | Carport and pergola kits (poles + beams + roofing + fixings), tied into Complete the Job and Job Packs |

**Needs:**
- size variants (a diameter × length grid);
- sale per metre for decking and cladding;
- weights for the delivery premium.

### 2.2 New department: Garden, Lawn & Landscaping

Start before the planting season ends: October to March.

| Range | Products |
|---|---|
| **Instant lawn** | Kikuyu, LM, buffalo, Cynodon and others, per m² |
| **Soils and growing media** | Topsoil, compost, potting soil, lawn dressing, bark mulch: bagged and bulk (bulk fits existing tipper delivery) |
| **Fertilisers and lawn care** | Various |
| **Irrigation** | Drip kits, sprinklers, hoses, controllers, fittings |
| **Garden structures** | Planters, raised beds, edging, artificial grass, weed control, shade netting |
| **Garden tools** | Various |
| **Plants and trees** | Later, through nursery partners |

**Needs:**
- sale per m²;
- a **perishable delivery rule** (lawn is laid the same day, with short lead times and no Sunday delivery);
- lawn-area and soil-volume calculators;
- a garden "build stage" in Shop by Stage;
- seasonal merchandising (Phase 3).

### 2.3 Deepen existing departments

| Area | Additions |
|---|---|
| **Outdoor living** | Braais and fireplaces; shade-net carports; paving sealers; outdoor lighting |
| **Security & access** | Gate motors and access control; electric fencing kits; CCTV |
| **Water & energy** | Borehole and pressure pumps; water treatment and filtration; rainwater harvesting kits; inverter and battery bundles |
| **Insulation & energy efficiency** | Ceiling insulation per m²; roof insulation sheets; geyser blankets |

### 2.4 New smaller ranges

| Range | Products |
|---|---|
| **Prefab & structures** | Wendy houses; steel sheds and carports; containers (sale, or hire through partners); precast boundary walls |
| **Civil & road** | Cold asphalt and bitumen; road-marking paint; traffic cones and barriers; culverts |

### 2.5 Platform needs for the new ranges

- **New units of sale:** per m² (lawn, insulation, cladding) and per linear metre (decking, cladding, poles where sold by length).
- **Variant grids:** extend the timber variant switcher to diameter × length and similar product families.
- **Perishable and seasonal products:** delivery rules, lead times, and "in season" flags.
- **Supplier groups:** each new category gets a supplier group (`Category.catalogueGroup`) so the Distributed Delivery Premium counts supply points correctly.
- **Unit weights for heavy goods:**
  - research manufacturers' published weights (with sources) for the existing bricks, blocks, roof sheets and steel mesh, and for the new heavy ranges;
  - the premium's per-ton charge then works for them with no code change (`docs/delivery-premium.md`).

---

## Phase 3 — Merchandising

**Goal:** product-led pages that sell. The current homepage is mostly tools and services, a carry-over from the aggregates-only version.

### 3.1 New homepage sections

All driven by real data:

| Section | Fed by |
|---|---|
| **Best sellers this month** | Paid, non-test orders (same data as Best With) |
| **Trending in your province** | Orders by delivery province |
| **New in store** | Products recently added or made buyable (Phase 1) |
| **Buy online today** | Priced products, a rotating spotlight by department |
| **Deals & price drops** | Real promotions only, with honest was/now pricing (Phase 7) |
| **Shop by brand** | PPC, AfriSam, Corobrik, Safintra and others: text cards unless we have permission to use their logos |
| **Seasonal** | Rainy season: waterproofing and gutters. Spring: garden and lawn. Winter: insulation. Festive: outdoor living. |
| **Site essentials under R500** | Tie wire, PPE, fixings, sealants |
| **Delivered in 120 minutes** | Products eligible for AA 60/120 |
| **Bundles & kits** | Job Packs as buyable products with one price |

### 3.2 Department landing pages

Every department gets:
- its own hero image;
- top sellers;
- "Buy online" products first;
- popular sub-categories;
- a buying guide;
- an FAQ;
- related calculators;
- Complete the Job ideas.

### 3.3 Product listings

- filters and sorting (with Phase 4 search);
- quick add-to-cart;
- "compare up to 3";
- clear **Buy online** and **Quote** badges;
- "available near you" (Phase 4).

### 3.4 Admin → Collections

- Staff build curated collections ("Carport build", "Black Friday", "Back to site after the holidays").
- They choose the products or rules, the start and end dates, and where each collection appears (homepage, department, banner).
- No code changes are needed for each campaign.

---

## Phase 4 — Find and choose

| # | Item | Notes |
|---|---|---|
| 4.1 | **Search engine** | Meilisearch or Typesense on Railway. Typo tolerance, synonyms (e.g. "stone" ↔ "aggregate", "IBR" ↔ "roof sheet"), filters (brand, size, price, department, buy online), sorting, and fast suggestions in the header. The core keeps its own search as a fallback if the satellite is down. |
| 4.2 | **Product data depth** | A photo for every product (permission-cleared), specification tables, datasheets and SANS references, and unit weights. |
| 4.3 | **Compare products** | Side by side: specs, price per unit, coverage per m². |
| 4.4 | **Availability** | "In stock at a partner supplier near you" or the expected lead time, fed by the supplier portal and price lists (Phase 1). |

---

## Phase 5 — Operations

### 5.1 Work module (Admin → Work)

A collaboration system for the store, built **inside the platform** because the work is about the platform's own records.

- **Tasks:** an assignee, due date, status and priority. Each task is linked to an order, quotation, booking, delivery, supplier or partner.
- **Internal notes and @mentions** on every record.
- **An activity timeline per record:** changes, emails and WhatsApp messages sent, payments, and who did what.
- **"My work" queue per staff member:** tasks, quotations awaiting follow-up, overdue payments, unanswered client queries.
- **One client-query inbox:**
  - brings together contact-form enquiries, storefront quote requests and WhatsApp conversations;
  - assignment to staff and a response-time clock (SLA).
- **Partners and service providers:**
  - tasks and messages to suppliers and hire partners through their existing portals;
  - booking chat already does this for hire partners.
- **Team reports:** a weekly report of tasks done, quotations sent and won, and response times, alongside Insights.

**Questions for the owner before building:**
- how many admin users in the next 6–12 months;
- the roles (sales, dispatch, accounts, management);
- whether partners and suppliers may message the team directly, or only reply to tasks.

### 5.2 Optional open-source add-ons (Railway)

- **Chatwoot:** an omnichannel client inbox (WhatsApp, email, web chat). Only if query volume outgrows the Work inbox.
  - Only one system can receive the WhatsApp Business number's messages: either the platform (what's built now) or Chatwoot. Decide this before connecting Meta.
- **Mattermost or Rocket.Chat:** general team chat, if the team wants more than notes on records.

### 5.3 Analytics: Matomo (Railway)

- Matomo plus MariaDB, at `analytics.aaggregates.store`.
- **Tracking:**
  - browser tracking of page views, searches, product views, add-to-cart and checkout steps;
  - only after the visitor accepts the cookie banner.
- **Revenue:** paid orders are reported by the API, not the browser, so revenue matches the order ledger and test orders are left out.
- The corporate site can be added as a second site.
- Update the Privacy Policy and Cookie Policy.
- **Owner actions:**
  - approve the hosting;
  - add the DNS record;
  - run the Matomo installer (create your own login and keep the password to yourself);
  - create the site with Ecommerce on and currency ZAR, and share its site ID;
  - create an auth token and put it in Render only.

### 5.4 Accounting: BigCapital (Railway)

- **First:** confirm with the accountant what they need each VAT period and at year-end (VAT201, statements).
- **Trial BigCapital** with a week of realistic transactions:
  - invoices, payments and a refund;
  - a supplier bill;
  - an Absa bank reconciliation;
  - a VAT report and a P&L.
- **The sync**, from the platform to BigCapital, asynchronous and retried:
  - customers;
  - tax invoices (same numbers);
  - payments by gateway;
  - refunds as credit notes;
  - delivery premium and express fees;
  - later, supplier purchase invoices from the cost book (Phase 1).
- **Fallbacks:** Odoo Community (accounting only) or Akaunting. If the accountant insists on Sage or Xero, the same sync can target them instead.

### 5.5 WhatsApp go-live

The code is built (notification templates and WhatsApp Commerce intake). Owner steps in Meta, from `docs/notifications.md`:
1. Verify the business.
2. Create a Business app with WhatsApp.
3. Add the number.
4. Get the display name approved.
5. Add a payment method.
6. Create a System User permanent token.
7. Put `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` and `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in Render.
8. Set the webhook.
9. Submit the 5 templates.
10. Switch WhatsApp on in Admin → Notifications.

Later: sync the Meta Commerce catalogue from the product feed, and automatic cart matching for free-text WhatsApp orders.

### 5.6 Newsletter: Listmonk

Deploy the Listmonk service already defined in `render.yaml` (`docs/listmonk`) and connect double opt-in.

---

## Phase 6 — Trade and contractor accounts

| # | Item | Notes |
|---|---|---|
| 6.1 | **Company accounts with several users** | Roles (buyer, approver, accounts); spending limits with approval above a set amount; purchase-order numbers on every order. |
| 6.2 | **Monthly statements** | Per company, emailed, with ageing. Ties to trade credit. |
| 6.3 | **Contract pricing** | Agreed price lists per account or project, on top of tier discounts, with validity dates. |
| 6.4 | **Project / site accounts** | Orders grouped by site, a site address book, spend per project, and documents per site (POD, compliance, invoices). |
| 6.5 | **Saved cards and fast reorder** | One-click reorder exists; add saved payment cards through the gateway's tokenisation (no card data stored by us). |

---

## Phase 7 — Growth

| # | Item | Notes |
|---|---|---|
| 7.1 | **Abandoned-cart and quotation follow-ups** | Consented emails (Listmonk or Resend): cart reminders, and quotation reminders before expiry. |
| 7.2 | **Promotions engine** | Discount codes, "free delivery over X", limited-time prices, and honest was/now pricing that meets Consumer Protection Act and advertising rules. Builds on the existing ad and promotion slots. |
| 7.3 | **Local SEO landing pages** | One page per covered town (100–150 towns): "Building sand delivered in Pinetown", "Bricks in Polokwane". Each has real local delivery information, suppliers by region (no contact details), and priced products. |
| 7.4 | **Buying guides and how-tos** | Blog content tied to calculators and products: "How much sand for 1,000 bricks", "Choosing roof sheets", "Laying instant lawn". |
| 7.5 | **Google Merchant Center / Shopping** | Check the existing catalogue feed, then connect it. Priced products only. |
| 7.6 | **Loyalty and referrals** | For trade customers: points or rebates on spend, and referral credit. |
| 7.7 | **Reviews growth** | Review requests after delivery (the prompt exists), and photo reviews. |

---

## Phase 8 — Customer experience extras

| # | Item | Notes |
|---|---|---|
| 8.1 | **Online returns** | Request a return or report damage online, with photos; track it through to refund. Follows the Returns & Refunds policy (cut-to-length items excluded). |
| 8.2 | **Installable app (PWA)** | Add to home screen; offline project lists and calculators. Cheaper than native apps. |
| 8.3 | **Delivery time slots** | Choose a day plus morning or afternoon at checkout, within supplier and fleet capacity. |
| 8.4 | **Price and back-in-stock alerts** | Email when a quote-only product becomes buyable or a price drops. |
| 8.5 | **Accessibility and speed** | An audit and fixes (keyboard, contrast, screen readers); performance budgets for product and listing pages. |

---

## Phase 9 — Delivery and logistics

| # | Item | Notes |
|---|---|---|
| 9.1 | **Admin → Delivery rates** | The standard delivery rates (bands, small-load and bagged fees) are only editable in code today. Move them to an admin page like the delivery premium's. |
| 9.2 | **Flatbed delivery fees** | Steel, masonry, roofing and building supplies charge R0 delivery at checkout today and confirm the supplier's truck charge later. Add owner-set flatbed fees (from supplier rates) so these orders show a delivered price at checkout. |
| 9.3 | **Benchmark delivery costs** | Compare delivery income with the costs recorded at dispatch (Insights → Finance) and tune the standard rates and the delivery premium. |
| 9.4 | **Dispatch and driver tools** | Route planning for Besfleet; "driver on the way" tracking for customers; delivery photos (proof of delivery exists). |
| 9.5 | **Supplier performance scores** | On-time rate, damage rate and price competitiveness, from orders and proof of delivery. |

---

## Phase 10 — Reliability and security

| # | Item | Notes |
|---|---|---|
| 10.1 | **Error tracking** | GlitchTip (open-source, Sentry-compatible) on Railway, for the web, API and pricing engine. |
| 10.2 | **Backups with tested restores** | Scheduled database backups and a quarterly restore drill. |
| 10.3 | **Two-step sign-in (2FA)** | Required for staff and admins. |
| 10.4 | **Admin audit log** | Who changed which price, order, setting or role, and when. |
| 10.5 | **Browser tests in CI** | Playwright end-to-end tests for checkout, quotations, payments and the admin editor, alongside the API tests. |
| 10.6 | **Uptime and alerting** | Extend the existing uptime checks to the Railway satellites. |

---

## Rules every phase follows

These are the platform's standing rules:
- **Prices:**
  - never invent prices: a product without a confirmed price is quote-only;
  - benchmark prices need at least two South African retailers (list = lowest × 1.08, promotions excluded).
- **Confidential research:** competitor names and prices never appear publicly.
- **Images:** only with confirmed permission or an open licence, with attribution.
- **Suppliers:**
  - new suppliers start as unverified leads;
  - supplier contact details and pins are staff-only;
  - never guess coordinates or phone numbers.
- **Secrets:**
  - only in Render or Railway environment variables, never in the repository or chat;
  - banking details stay in `EFT_BANKING_DETAILS`.
- **Legal and data:** legal pages are updated with each change that affects customers, with a dated entry in `content/legal/policy-versions.json`. POPIA is followed for every new processor.
- **Release process:** every change is tested (unit, end-to-end, build) and documented in `docs/`, and released only by "open the PR and merge".

---

## Owner actions and decisions

| Item | Phase |
|---|---|
| Find and clear the reason Render deploys fail; deploy the API then the web | 0.1 |
| Decide: Render deploys from `main` | 0.2 |
| Stitch review → live keys; PayFast KYC; follow up Peach | 0.4 |
| Mark AA-1792488427457 as a test order | 0.5 |
| Set `GROUP_VAT_NUMBER` and `PRICES_INCLUDE_VAT` | 0.6 |
| Attorney review of the legal pages | 0.7 |
| Approve merging the LayUp logo and sales quotations | 0.8 |
| Supplier price lists (CSV) as suppliers are onboarded | 1 |
| Garden and timber supplier contacts; confirm lawn varieties and pole sizes | 2 |
| Brand-logo permissions for Shop by Brand | 3 |
| Railway account and plan (Hobby for anything kept) | 2 (architecture), 4, 5 |
| Accountant: VAT201 and year-end needs; BigCapital trial | 5.4 |
| Matomo: DNS record, installer, site ID, token | 5.3 |
| Meta WhatsApp Business Platform setup | 5.5 |
| Work module: team size, roles, partner messaging | 5.1 |
| Flatbed delivery rates from suppliers | 9.2 |

## Suggested order

1. **Phase 0:** fix deploys and deploy from `main`; payments live; merge the pending work.
2. **Phase 1:** supplier price-list import, to start converting the 1,151 quote-only products.
3. **Phase 2.1–2.2:** Garden, Lawn & Landscaping and Timber, Poles & Decking, while the season is right.
4. **Phase 3:** merchandising (homepage sections, department pages, Collections).
5. **Phase 4:** search and product data depth.
6. **Phase 5:** the Work module, Matomo and BigCapital.
7. **Phase 6:** trade company accounts and contract pricing; **Phase 7.3:** local SEO pages.
8. **Phases 7–10:** growth, customer extras, logistics and reliability, alongside the above as capacity allows.
