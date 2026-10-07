# Plant Hire & Site Services (CAT-13 / CAT-14)

Phase B of the October 2026 plan. Plant hire, site services, five further
lines, job packs, the project estimator and partner recruitment are live as
**enquiry-led, quote-only** pages. Online booking, dispatch and payouts are
Phase C and are not built yet.

## Model

- **Agent model.** The partner does the work; Aggregated Aggregates earns a
  **12% commission**. Customer price = partner's written rate × 1.12
  (`commission_percent` in `services/pricing/data/plant_services_catalogue.json`).
- **Wet hire only** for CAT-13: machine, operator, fuel and PPE. A hire day is
  capped at 8 machine hours; excess hours and standing time are quoted.
- **Day and week** can carry published rates once partner rate cards exist.
  **Monthly / long-term hire, demolition and scheduled waste are always quoted.**
- **Mobilisation** is banded 0–30, 30–60 and 60–100 km (fees empty until rate
  cards exist); 100 km+ is always quoted. Large excavators and rollers travel
  on a lowbed (`needs_lowbed`).
- **Regions are the nine provinces** (the source plan used KZN/GAUTENG only).
- Small-equipment and scaffolding **dry hire** (with deposit) is one of the
  five further lines, not CAT-13.

## Catalogue

- 18 plant SKUs (`AA-PLT-*`): TLB 4x4; excavators 1.7t, 3t, 5t, 8t, 14t, 20t,
  30t; tippers 6m³, 10m³, 34t; rollers 1–3t, 8–12t, padfoot; skid steer,
  wheel loader, site dumper, water truck.
- 10 services (`AA-SVC-*`): tipper haulage 6m³ / 10m³ per load and per day;
  rubble removal 6m³ / 10m³; skip bins 6m³ / 12m³; site clearing per m²;
  demolition and scheduled waste (always quoted).
- The same JSON is mirrored at `apps/web/src/data/plant-services-catalogue.json`;
  the loader below writes both.
- Pricing service: `GET /products/plant-hire`, `GET /products/site-services`,
  `POST /calculate/rental`, `POST /calculate/service` (`calculators/rental.py`).
  With no rates loaded, every calculation returns "request a quote".

## Pricing status (now)

**Everything is quote-only.** No partner has supplied written rates. A
SKU/province shows a price only at status "Ready — benchmarked", which needs
**written rate cards from at least two partners in that province**; the
median partner rate is used. One partner = "Provisional" (still quoted).
No prices are invented (AGENTIC_RULES.md rules 1 and 15).

## Rate-card intake

1. Send partners `services/pricing/ratecards/PARTNER_RFQ_EMAIL.md`.
2. Capture each written rate in `rate_card_template.csv`
   (`partner,region,sku,day_rate,week_rate,excess_hour_rate,service_rate,vat_included,valid_from,source_document`).
   Every row needs a `source_document` (the email or PDF it came from) and a
   province as `region`; VAT-inclusive rows are converted to ex-VAT.
3. Run `python3 services/pricing/ratecards/load_rate_cards.py <file.csv>`,
   check the summary, commit both JSON files and deploy.

## How requests are handled (Phase B)

Every request form (plant item, service, further line, job pack, estimator,
partner application) posts to `POST /enquiries` (public, honeypot-protected;
a signed-in customer is linked). The API stores an `Enquiry` with a
reference `ENQ-YYMMDD-XXXXXX`, emails the customer an acknowledgement and
staff a summary (`ENQUIRY_RECEIVED`, switchable in Admin → Notifications),
and staff work it in **Admin → Enquiries** (status New → In progress →
Quoted → Won / Lost / Closed, notes). Admins can erase an enquiry and its
email log on request (POPIA). Customers' contact details are never passed
to partners without their agreement — only the job details.

## Pages

`/plant-hire`, `/plant-hire/[slug]`, `/services`, `/services/[slug]`,
`/job-packs`, `/estimator`, `/partners`, `/recycled`, `/fill-exchange`,
`/testing`, `/diesel`, `/equipment-hire`; the home page has the business-lines
carousel, a plant & services section, job packs and a partner call to action.
Job packs only reference real SKUs (aggregates, ready-mix, plant, services).

## Not built yet (Phase C)

Bookings and payment before dispatch, partner offers and acceptance,
arrival OTP, job cards, masked chat, disputes and payout release, partner
availability and the partner portal. Until then nothing on these pages says
a job is paid, protected or dispatched online.

## Needs a decision or advice

- Partner rate cards (two per province per SKU) before any price is shown.
- Agent invoicing and VAT (who invoices the hire; commission on ex-VAT) — tax advice.
- Diesel: the plan names a Group fuel entity; the page says "a licensed fuel
  supplier" until its licences and the arrangement are confirmed.
- Non-circumvention wording in partner agreements — legal review.
