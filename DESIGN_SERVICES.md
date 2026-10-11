# Design services — Bellwether Architecture & Engineering (BAE)

BAE is Besbpo Group's architecture and engineering practice. The store sells
its services next to the materials, so a customer can go from a brief to
approved plans, a bill of quantities, a project list and the order — the
turnkey path.

Pages: `/design` (landing, fixed packages, disciplines, how it works, fee
estimator, brief form) and `/design/[slug]` (one service, its fee basis and a
brief form). Data: `apps/web/src/data/design-services.ts`.

## How a brief flows

1. The customer sends a brief from `/design` or a service page. It is logged
   as an **enquiry** with `kind = DESIGN` (migration
   `20261019090000_design_enquiries`), `subject = "Design: <service>"`,
   `sku = BAE-<slug>` and the answers (project type, floor area, budget, erf
   number, what they have, when they want to build, the brief) in `details`.
2. The customer gets a "We've received your design brief" email — it
   promises a fee proposal and terms of engagement, not a supply quote, and
   says nothing is charged until they accept. Staff get the usual enquiry
   email.
3. Staff see it in **Admin → Enquiries** under "BAE design" and in the
   pipeline report. BAE sends the proposal and terms of engagement outside
   the store for now; the status moves New → In progress → Quoted → Won/Lost.

Nothing is sold through the cart: every design job is engaged on BAE's own
proposal.

## Services and fees

Three kinds of fee:

- **Fixed** — one price for a defined scope (the scope is shown with it).
- **Indicative rate** — R/m² of floor area with a minimum, or a percentage
  range of the estimated building cost. Shown as a budget; the proposal sets
  the fee.
- **Quoted** — priced from the brief.

| Service | Discipline | Fee |
|---|---|---|
| House plans & council submission | Architectural | R120/m², minimum R18,000 |
| Additions & alterations | Architectural | R120/m² of new area, minimum R12,000 |
| Full architectural service | Architectural | 5–7% of building cost |
| Measured as-built drawings | Architectural | R6,500 fixed (one house ≤ 250 m², metro) |
| Plan regularisation | Architectural | R18,500 fixed (one house ≤ 250 m²; council fees and penalties at cost) |
| Structural design | Structural | 1.5–2% of building cost, minimum R12,000 |
| Foundation inspections & completion certificate | Structural | R7,500 fixed (3 visits, single-storey house, metro) |
| Crack & structural assessment | Structural | R6,500 fixed (one house, metro) |
| Retaining wall design | Structural | R8,500 fixed (one wall ≤ 1.5 m, residential) |
| Steel & roof structure design | Structural | Quoted |
| Stormwater & drainage design | Civil | Quoted |
| Roads, parking & paving design | Civil | Quoted |
| Energy (SANS 10400-XA) design | Compliance | Quoted |
| Bill of quantities | Quantities | 1–1.5% of building cost, minimum R8,500 |
| Bar bending schedule | Quantities | Quoted |

Not included anywhere, paid at cost and shown separately on the proposal:
municipal plan fees and penalties, NHBRC enrolment, land surveys and
specialist reports (geotechnical, fire, traffic).

**Status: proposed.** The owner said BAE normally quotes per project and
asked for derived rates with some fixed packages. These figures are derived
from the benchmarks below and need the owner's sign-off; change them in
`design-services.ts` (one place) and this table.

### Where the rates come from

Published South African benchmarks, researched October 2026:

- Draughtsperson plans: R75–R200/m² (about R100/m² average) or R600–R1,100/h;
  Johannesburg plan sets about R40k–70k under 100 m² and R70k–150k around
  150 m² (Procompare and draughting practices' published guides). BAE's
  R120/m² with an R18,000 minimum sits in the middle.
- Architects: the SACAP guideline fee is a percentage of the cost of works
  by bracket over six work stages (Board Notice, Government Gazette, Feb
  2026); full residential services commonly land at about 5–8%. BAE: 5–7%.
- Structural engineers: about 2% of construction cost for design;
  residential inspections R5k–R15k; simple slab and roof checks R3k–8k; full
  frame designs R12k–40k+. BAE: 1.5–2% with a R12,000 minimum; R7,500 for
  foundation inspections; R6,500 for a crack assessment; R8,500 for a
  retaining wall up to 1.5 m.
- As-built drawings R2k–R8k; regularisation R5k–R20k+ (and up to R20k–R80k
  with engineer's work and council penalties). BAE: R6,500 and R18,500.
- Quantity surveyors: ASAQS guideline tariff (sliding scale); typical
  1.5–4% for a full QS service. A measured BoQ alone: BAE 1–1.5%, minimum
  R8,500.
- XA energy rational designs: no reliable published fee — quoted.

### The fee estimator

`DesignFeeEstimator` on `/design#fee-estimator`: new house or addition, floor
area, finish level (economy R9,500, standard R14,000, high spec R20,000 per
m² — editable; mid-range 2026 cost guides put Gauteng builds at about
R12k–18k/m²), and ticks for the engineer and the BoQ. It shows:

- the building cost (area × rate),
- plans (R/m² with the minimum), structural design (%), foundation
  inspections (new house), BoQ (%), and the total as a range,
- the full architectural service as an alternative,
- for a new house, the **NHBRC enrolment fee** (below).

"Send BAE this brief" opens the plans service page with the area and cost
filled in.

### NHBRC enrolment fee

Statutory — Rules regarding NHBRC Fees (GN R.1407, rule 2) under the Housing
Consumers Protection Measures Act — on the selling price or contract value,
marginal bands: 1.3% of the first R500,000, 1% to R1m, 0.75% to R2m, 0.5% to
R5m, nothing more above R5m (so R6,500 at R500k, R11,500 at R1m, R34,000 at
R5m and above). Excludes VAT. The home builder pays it at enrolment and the
NHBRC confirms the amount; the site says so. `nhbrcEnrolmentFee()` in
`design-services.ts`.

## What the site does not claim

- No SACAP or ECSA registration numbers or categories are shown until the
  owner supplies them. The site says only that work the law requires a
  registered professional to sign is signed by one.
- Fixed fees are firm for the scope stated; everything else is a budget
  figure confirmed on the proposal.
- No VAT statement on the fees until the owner confirms BAE's VAT treatment.

## Links into the store

- Build stages: Site prep → house plans; Foundations → foundation
  inspections; Slabs → structural design; Roofing → steel & roof structure
  design; Drainage → stormwater design; Landscaping → retaining wall design.
- Service pages link on to the materials (steel, cut & bend, ready-mix,
  retaining blocks, drainage, paving, insulation, project lists).
- Header ("Design"), footer (Hire & Services), search and the sitemap.

## Privacy

The Privacy Policy (11 October 2026) lists design briefs among enquiries and
BAE among the recipients, and notes that a council submission carries the
owner details the municipality requires. The brief form's consent line names
BAE.
