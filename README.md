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

This scaffold delivers the confirmed **Phase 1** roadmap scope: schema, auth
scaffolding, category/product structure, base storefront, legal/compliance
pages, and merchandising sections. It is a working, runnable foundation —
not a finished storefront. Pricing calculators, trade-account logic, and the
RFQ flow are wired with real logic against seed data, but production
concerns (payment gateway integration, live inventory sync docs, full test
coverage, deployment secrets) are intentionally left for Phases 2–5.

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

- **Supplier network**: ~50 approved partner suppliers across South Africa — broker/network model, no owned yards or inventory
- **Domain**: `aggregates.store` (corporate + storefront) / `app.aggregates.store` (platform app)
- **VAT**: bills under Besbpo Group's company VAT registration from day one
- **Hosting**: Render
- **Courier**: Besfleet + 15+ external tipper-truck delivery partners (hybrid)
- **Launch geography**: KZN + Gauteng first, expanding to the Group's standard 7-province footprint

## Repository layout

```
aggregates-store-platform/
├── apps/
│   ├── web/            Next.js storefront — merchandising, product, RFQ, trade dashboard, legal pages
│   └── api/             NestJS backend — auth, catalogue, trade-accounts, quotes, orders, suppliers, compliance docs
├── services/
│   └── pricing/         FastAPI microservice — tonnage/volume + distance-banded delivery calculators
├── packages/
│   └── database/        Shared Prisma schema + seed data (12 core models)
├── content/
│   └── legal/           Source Markdown for all legal/compliance pages (POPIA, PAIA, Terms, etc.)
├── infra/
│   ├── render.yaml       Render deployment blueprint
│   ├── terraform/        AWS af-south-1 IaC skeleton
│   └── docker/           Local Dockerfiles for api + pricing service
└── AGENTIC_RULES.md      Human-in-the-loop rules for the Phase 2–5 build-out
```

## Local development

```bash
cp .env.example .env               # fill in Supabase/Upstash/OAuth credentials
docker compose up -d               # local Postgres + Redis for offline dev
pnpm install
pnpm --filter @aggregates/database db:generate
pnpm --filter @aggregates/database db:migrate
pnpm --filter @aggregates/database db:seed

pnpm --filter web dev              # storefront → http://localhost:3000
pnpm --filter api dev              # backend    → http://localhost:4000
cd services/pricing && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

## Reference

The full architecture rationale, feature-adoption matrix, wireframes, and
confirmed decisions live in the companion spec document:
`aggregated-aggregates-ecommerce-spec.pdf` (delivered alongside this scaffold).
