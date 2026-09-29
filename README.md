# Aggregated Aggregates — E-Commerce Platform (Foundation Scaffold)

**Division of Besbpo Group** · Domain: `aggregates.store` / `app.aggregates.store`
Positioning: *"Every Layer Starts Here"*

This repository is the **Phase 1 foundation scaffold** produced from the
*Aggregated Aggregates E-Commerce Platform Technical & Product Specification*
(v1.0). It follows the same planning-to-build sequence already used for
Roofsteel, Bricksplaza, and Aluminium Store: a spec locks scope and
architecture, then a scaffold like this one gives the agentic build-out
(Claude Code) a real foundation to extend rather than a blank repo.

**Read `AGENTIC_RULES.md` before starting Phase 2** — it defines how the
build-out should proceed from here, and the human PR review gate at the end
of every phase.

## What this is (and isn't)

The repository covers roadmap **Phases 1–4** (see `AGENTIC_RULES.md`): the
workbook-priced catalogue (48 aggregate SKUs plus 7 B2B packaged goods),
bulk/bag, packaged-goods and delivery calculators, a cart and checkout for
mixed bulk and bagged loads, order/quote/account notifications by email and
WhatsApp, trade accounts, the RFQ flow, compliance documents, the admin/CMS (site content, homepage
slideshow, promotions with image uploads, targeting and reporting, orders, blog, products, suppliers, payment routing, WhatsApp
orders), the partner-supplier network and delivery-point locator, the
payment architecture (18 methods routed through 6 gateway adapters), WhatsApp
Commerce, the Instagram/Facebook catalogue feed, and SEO hardening.

It is not launched: payment gateways, transactional email and the WhatsApp
Business API need real credentials, some payment logos and the social icons are still placeholders
for Brandfetch files, and suppliers need map pins — see "Open items" in `AGENTIC_RULES.md`.

## Tech stack (confirmed in the spec)

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| Backend | NestJS, modular monolith |
| Pricing microservice | FastAPI (Python) |
| Database | PostgreSQL via Supabase, Prisma ORM |
| Caching / queues | Upstash Redis + BullMQ |
| Hosting | Render |
| Infra / IaC | AWS af-south-1, Terraform/Terragrunt, ArgoCD GitOps |

## Confirmed platform decisions

- **Supplier network**: 87 approved partner suppliers (52 Tier 1, 35 Tier 2) plus 18 researched B2B leads — broker/network model, no owned yards or inventory. Seeded on deploy from `packages/database/prisma/seed-data/`, managed at `/admin/suppliers`; KZN and Gauteng active at launch
- **Domain**: `aggregates.store` (corporate + storefront) / `app.aggregates.store` (platform app)
- **VAT**: bills under Besbpo Group's company VAT registration from day one
- **Hosting**: Render
- **Courier**: Besfleet + 15+ external tipper-truck delivery partners (hybrid)
- **Launch geography**: KZN + Gauteng first, expanding to the Group's standard 7-province footprint

## Repository layout

```
aggregates-store-platform/
├── apps/
│   ├── web/            Next.js storefront + /admin — merchandising, products, RFQ, trade dashboard,
│   │                   blog, FAQ, ways-to-pay, industries, partner network, orders, legal pages
│   └── api/             NestJS backend — auth, catalogue, trade-accounts, quotes, orders, suppliers,
│                        compliance docs, content, promotions, blog, payment-gateway, channels/whatsapp,
│                        channels/catalogue-feed, notifications (email + WhatsApp)
├── services/
│   └── pricing/         FastAPI microservice — tonnage/volume, packaged-goods, delivery and order pricing
├── packages/
│   └── database/        Shared Prisma schema, migrations, seed, supplier CSVs (seed-data/)
├── content/
│   └── legal/           Source Markdown for all legal/compliance pages (POPIA, PAIA, Terms, etc.)
├── infra/
│   ├── terraform/        AWS af-south-1 IaC skeleton
│   └── docker/           Local Dockerfiles for api + pricing service
├── render.yaml           Render Blueprint (web, api, private pricing service)
├── AGENTIC_RULES.md      Human-in-the-loop rules for the build-out, updated per phase
├── B2B_BULK_CATALOGUE.md CAT-10/11 packaged goods and the dedup against the 48-SKU catalogue
├── BLOG_CMS.md           Blog/CMS: API, admin, content rules
├── PAYMENT_ASSETS.md     Logo/icon provenance (Brandfetch files and remaining placeholders)
└── PAYMENT_PROVIDER_TERMS.md  Researched BNPL / trade-credit terms behind "Ways to Pay"
```

## Local development

```bash
cp .env.example .env               # fill in Supabase/Upstash/OAuth credentials
docker compose up -d               # local Postgres + Redis for offline dev
pnpm install
pnpm --filter @aggregates/database db:generate
pnpm --filter @aggregates/database db:migrate
pnpm --filter @aggregates/database db:seed
pnpm --filter api build && node apps/api/dist/suppliers/seed-suppliers.js   # partner network

pnpm --filter web dev              # storefront → http://localhost:3000
pnpm --filter api dev              # backend    → http://localhost:4000
cd services/pricing && pip install -r requirements-dev.txt && uvicorn main:app --reload --port 8000

cd services/pricing && pytest     # includes the to-the-cent workbook reconciliation
pnpm --filter api test            # API unit tests
pnpm --filter api test:e2e        # API end-to-end: needs DATABASE_URL (migrated + seeded) and PRICING_SERVICE_URL
```

## Deploying

The app deploys to Render as a Blueprint from `render.yaml` at the repo root.
See [`docs/deployment/render.md`](docs/deployment/render.md).

## Pricing

Every price comes from the pricing framework workbook in `docs/pricing/`.
See [`docs/pricing/README.md`](docs/pricing/README.md) for how it flows into
the platform and how to change a price.

## Reference

- [`docs/aggregated-aggregates-ecommerce-spec.pdf`](docs/aggregated-aggregates-ecommerce-spec.pdf) —
  the pre-build Technical & Product Specification: architecture rationale,
  feature-adoption matrix, original wireframes, confirmed decisions.
- [`docs/aggregated-aggregates-platform-build-documentation.pdf`](docs/aggregated-aggregates-platform-build-documentation.pdf) —
  the as-built documentation (September 2026): architecture, data model and
  payment-routing diagrams, updated page wireframes, module status, and the
  pre-launch open items. The homepage, product page, RFQ and dashboard follow
  its as-built wireframes.
