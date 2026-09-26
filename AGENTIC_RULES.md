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
| 2. Pricing & Calculators | Pricing microservice wired to real Category Markup Bands / Customer Tiers data; bulk/bag calculator; distance-banded delivery calculator | **In review** |
| 3. Trade & Quote Flows | Trade account/tier management, RFQ/bulk-quote flow, compliance document attachment | Not started |
| 4. Storefront & CMS | Full storefront polish, CMS/admin, supplier & delivery-point locator | Not started |
| 5. QA & Launch Prep | Human PR review throughout; pricing microservice reconciled against the pricing xlsx to the cent | Not started |

## Rules for the agent doing the build-out

1. **Don't invent pricing.** Every rand figure, bulk density, bag premium,
   and delivery band must trace back to the Aggregated Aggregates pricing
   engine xlsx (Category Markup Bands, Customer Tiers, Delivery & Additional
   Charges sheets), committed at `docs/pricing/`. Prices reach the platform
   only through `services/pricing/scripts/import_pricing_framework.py`, and
   `services/pricing/tests/test_reconcile_workbook.py` holds every SKU to the
   workbook to the cent — see `docs/pricing/README.md`. Never hand-edit the
   generated JSON; flag any mismatch rather than silently "fixing" the number.
2. **No owned-yard logic.** The confirmed model is broker/network: ~50
   partner suppliers, no owned inventory. Do not add `StockLevel` /
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

## Open items carried into the build-out

- Exact partner-supplier list (the ~50 approved suppliers) — commercial
  detail, not a schema question; `SupplierLocation` records should be
  seeded from Fortune's actual supplier onboarding list once available, not
  invented.
- Besfleet vs. external-partner routing logic for the 15+ courier network —
  the data model supports either via `Shipment.carrier`, but the dispatch
  rule (which orders go to Besfleet vs. which external partner) isn't
  specified yet and shouldn't be hardcoded without confirmation.
