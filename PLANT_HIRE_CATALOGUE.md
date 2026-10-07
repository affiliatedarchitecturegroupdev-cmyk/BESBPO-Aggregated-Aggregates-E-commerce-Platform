# Plant Hire & Site Services (CAT-13 / CAT-14)

Phases B and C of the October 2026 plan. Plant hire, site services, five
further lines, job packs, the project estimator and partner recruitment are
live as **quote-only** pages (Phase B). A quoted job then runs as a
**booking** — accepted and paid by the customer, dispatched to partners,
started with an arrival code and paid out after sign-off (Phase C).

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

## Bookings (Phase C)

```
QUOTED → AWAITING_PAYMENT → DISPATCHING → ACCEPTED → IN_PROGRESS → COMPLETED → CLOSED
                                   ↘ UNFULFILLED          ↘ DISPUTED ↗ / CANCELLED
```

1. **Quote.** From an enquiry (Admin → Enquiries → "Price as a booking"),
   staff enter the partner's **written quote for the whole job** and where
   it's on record (`quoteSource`, required). The customer price is that
   amount plus the commission, calculated by the API — never typed in. The
   customer needs an account with the enquiry's email; they're emailed the
   quote (`BOOKING_QUOTED`).
2. **Accept and pay.** The customer accepts in Account → Hire bookings and
   pays by **EFT** with the booking reference (banking details from
   `EFT_BANKING_DETAILS`). Staff confirm the payment on the booking, which
   starts dispatch. Online card/instant-EFT payment for bookings needs live
   gateway credentials and isn't wired yet.
3. **Dispatch.** The job is offered to one partner at a time with a
   **30-minute window**: the quoting partner first, then ACTIVE partners with
   an active fleet unit for the SKU in the province, free on the dates
   (partner calendar blocks), ranked by proximity (only where both sides
   have a map pin — pins are never guessed), reliability (acceptance rate,
   disputes, ratings) and a small Group-company tie-break. Declines and
   expiries move to the next partner; when none are left the booking is
   UNFULFILLED and staff re-dispatch, re-date or refund. Offers show the
   partner the job, site and **their payout** — never the customer's name or
   contact details.
4. **Assigned.** The partner who accepts is named to the customer (name
   only). Their fleet unit is blocked for the dates and a payout record is
   opened. Chat opens.
5. **Arrival code.** On site, the customer opens a 6-digit code in their
   booking (each new code replaces the last; only its SHA-256 hash is
   stored) and the operator enters it in the portal. Five wrong codes lock
   it until the customer opens a new one.
6. **Job cards.** The partner records hours, hour-meter readings or loads
   per day, within the booking's dates; the customer sees them.
7. **Sign-off and payout.** The customer signs off (optional 1–5 rating),
   starting a **48-hour dispute window**. With no open dispute the minute
   sweep marks the payout **due**; staff pay it by EFT (bank confirmation
   letter must be on file) and record the reference, which closes the
   booking. Automatic split payouts need gateway credentials.
8. **Disputes.** Either side can dispute while the job is in progress or
   within the window. The payout is held; staff resolve it as *pay the
   partner* (payout due now) or *refund the customer* (payout cancelled,
   refund paid by staff).

**Anti-bypass.** Partners and customers never see each other's contact
details. Chat messages and job-card notes are stored with phone numbers,
emails, links, WhatsApp links and handles removed
(`apps/api/src/common/redact.ts`); each removal raises a **review flag**, as
does a customer–partner pair that booked three or more times and then
stopped (Admin → Hire bookings → Review flags → Scan). Flags are prompts
for a conversation, never automatic penalties. Staff messages aren't
redacted (e.g. to share a gate code on request).

**Terms.** Customers must agree to the Plant Hire & Site Services Terms
(`/legal/hire-terms`) to accept a quote, and partners must accept the
Partner Terms (`/legal/partner-terms`) in the portal before accepting any
offer; the accepted versions are stored (`apps/api/src/bookings/terms.ts`).
Both are drafts awaiting attorney review — `content/legal/README.md`.

**Public pages.** `/plant-hire/how-it-works` (walk-through + FAQs, also on
`/faq`), `/plant-hire/safety` (vetting and site responsibilities),
`/partners/onboarding` (documents, rate-card template download at
`/downloads/partner-rate-card-template.csv`, portal, payouts) and
`/plant-hire/areas/[province]` — published **only** for provinces with an
active partner and active fleet (`GET /hire-coverage`, provinces and SKUs
only, no partner details); other provinces 404 and stay out of the sitemap.

**Partners.** Staff add partners in Admin → Hire partners (contact details
staff-only), set them ACTIVE, record their fleet per province, and link the
account they registered on the site as a portal login (role `PARTNER`). The
portal (`/partners/portal`) shows open offers, jobs, fleet calendars and
payouts. Suspended partners lose portal access.

**The sweep.** Every minute the API expires offers past their window and
marks payouts due (`BookingsScheduler`; `BOOKINGS_SCHEDULER=off` disables
it). Each step is a conditional update, so a second instance can't
double-process. Admins can run it on demand (`POST /bookings/admin/sweep`).

**Emails.** Customers: quoted, payment received, partner assigned, no
partner found. Staff: no partner, signed off, disputed, payout due.
Partners (always on): job offered, signed off, disputed, payout released.

## Needs a decision or advice

- Partner rate cards (two per province per SKU) before any price is shown.
- Agent invoicing and VAT (who invoices the hire; whether the commission is
  charged on a VAT-inclusive partner quote) — tax advice. Bookings currently
  take the partner's quote as the total they're paid and add 12% on top.
- Holding customer funds before payout (EFT into the Group account today;
  gateway split payouts later) — legal/banking advice.
- Diesel: the plan names a Group fuel entity; the page says "a licensed fuel
  supplier" until its licences and the arrangement are confirmed.
- Non-circumvention wording in partner agreements — legal review.
