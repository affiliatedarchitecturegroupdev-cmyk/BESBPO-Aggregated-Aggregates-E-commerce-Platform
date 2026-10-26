# Design-and-build projects

ROADMAP Phase 11 (11.1, 11.2a and 11.2b). The project engine sells a finished result as one package. We design it, partners make and install it, and we manage the job. Two packages so far:
- **Complete roofs** at `/services/complete-roofs`;
- **Steel structures** at `/services/steel-structures`: warehouses, workshops, carports and canopies.

Both use the same engine; only the brief and take-off differ.

## The flow

1. **Brief.** The client describes the roof and gets an instant **take-off**:
   - **What they enter:** shape (gable, hip or mono-pitch), length and span, pitch, overhang, covering (concrete tiles, IBR, corrugated, concealed-fix) and insulation.
   - **What the take-off shows:** **quantities only.** That covers roof area, trusses, tiles or sheeting, battens or purlins, screws, ridges, barges, fascias, gutters, downpipes, underlay and insulation, each linked to the shop.
   - **Never a price.** The design and partners' quotes set the price, under the no-invented-prices rule.
   - **Checks:** warnings for a pitch below the covering's usual minimum and for wide spans.
   - **Sending:** signed-in or signed-out (name, email and Privacy Policy consent). The client gets reference `AAP-000001…` by email; staff are alerted (`PROJECT_RECEIVED`).
2. **Design and quotes.** Staff move the project through *Being designed* and *Getting partners' quotes* in **Admin → Projects**, with staff-only notes.
3. **Proposal.** Staff build the package in the proposal editor:
   - **Starting point:** one line each for design, trusses, every take-off item and installation.
   - **Each line:** kind (design, materials, fabrication, installation, other), description, quantity, unit and price. Our **cost** and the **partner** are staff-only; the editor shows the margin.
   - **Stage payments:** they must add to 100%. A complete roof's default is 40% deposit on acceptance, 40% when trusses and materials are on site, and 20% on completion and sign-off.
   - **Validity:** a message and a validity of 1–90 days.
   - **Sending:** emails the client a link (`PROJECT_PROPOSAL_SENT`). Only its hash is stored. Changing a sent proposal withdraws the link, so the client can only ever accept the version they're shown; send again for a new link.
4. **Acceptance.** The client opens `/projects/proposal/<link>`. They see the lines, total and stage payments, never our costs, partners or notes. They accept with their name and the Terms (section 6B). Client and staff are emailed (`PROJECT_ACCEPTED`), and the proposal can't be changed after that.
5. **Stage payments.** The client pays by EFT with the project reference. Staff **record each payment**, and the client is emailed a receipt (`PROJECT_MILESTONE_PAID`). The first payment moves the project to *In progress*.
6. **Delivery and installation.** Staff use the existing tools (orders, phased deliveries, proof of delivery) and move the project to *Completed*.

Signed-in clients see their projects (and their company's) at **My account → Projects**.

## The take-off (complete roofs)

`apps/api/src/projects/roof-takeoff.ts`, unit-tested. Rules of thumb, all labelled indicative on the page:

| | |
|---|---|
| Roof area | (length + 2 × overhang) × (span + 2 × overhang) ÷ cos(pitch) |
| Trusses | length ÷ centres + 1. Centres are 760 mm for tiles and 1,200 mm for sheeting; the truss plant's layout decides |
| Concrete tiles | 10.5 per m² + 5%; ridge and hip tiles 2.7 per metre; battens at 345 mm gauge |
| Sheeting | roof area ÷ cover width (IBR 686 mm, corrugated 762 mm, concealed-fix 700 mm) + 5%; purlins at 1.2 m; 4 screws per m² |
| Rainwater | gutters along the eaves; one downpipe per 12 m, at least two |
| Usual minimum pitch | tiles 17.5°, corrugated 10°, IBR 5°, concealed-fix 3° (a warning, not a block) |

## The take-off (steel structures)

`apps/api/src/projects/steel-takeoff.ts`, unit-tested. It covers portal-frame buildings (warehouse or workshop, clad) and open carports, shade structures and canopies, with duo- or mono-pitch roofs.

**What the client enters:** length, span, eaves height and pitch; sheeting (IBR, corrugated, concealed-fix); clad walls; roller doors (about 4 × 4 m); insulation; floor slab.

**Rules of thumb**, all labelled indicative:

| | |
|---|---|
| Frames | bays of about 6 m: length ÷ 6, rounded up, + 1 frames; two columns each |
| Members | column and rafter metres. **Section sizes, steel mass, bracing, connections and footings come from the engineer's design** and are not estimated |
| Purlins and girts | lipped channel at about 1.5 m centres |
| Sheeting | roof area ÷ cover width + 5%. Wall cladding covers the perimeter to the eaves plus the gables, less the doors |
| Other items | 4 holding-down bolts per column, one footing per column, 4 screws per m², gutters along the eaves, a 150 mm slab if asked for |
| Warnings | always: wind bracing is designed for the site. Also: a pitch below the sheet's usual minimum, spans over 30 m, and eaves over 8 m |

**Suggestions and schedule:** take-off items made by a partner (frames, columns, rafters, bracing) are suggested on the proposal as *fabrication*, the rest as *materials*. The default stage payments are 40% on acceptance, 40% when the steel is fabricated and on site, and 20% when it is erected, clad and signed off.

**Next for this package:** mezzanines, stairs and walkways.

## Not yet built (ROADMAP 11.1b–d)

- **Partners in the portal:** today staff enter partners' quotes. Next, fabricators and installers see the job, quote and post progress in the partner portal.
- **Online stage payments:** card and instant EFT, and on trade credit. Today stage payments are paid by EFT and recorded by staff.
- **Compliance pack and sign-off:** uploads (the engineer's sign-off, the truss certificate) and the client's sign-off at completion.
- **A fixed roof-design fee,** if the owner approves one. Today it is priced per proposal.

## API

| Method | Path | Who |
|---|---|---|
| POST | `/projects/estimate` `{ package: "ROOF" or "STEEL_STRUCTURE", brief }` | public: the take-off |
| POST | `/projects` `{ package, brief, province, privacyAccepted, contactName?, contactEmail?, contactPhone?, siteAddress?, notes? }` | public (signed-in clients' details come from their account) |
| GET | `/projects/mine` | signed in: their projects and their company's |
| GET | `/projects/proposal/:token` | the client's link |
| POST | `/projects/proposal/:token/accept` `{ name, acceptTerms: true }` | the client's link |
| GET | `/projects/staff`, `/projects/staff/:id` | staff |
| PATCH | `/projects/staff/:id` `{ status?, staffNotes? }` | staff |
| PUT | `/projects/staff/:id/proposal` `{ lines, milestones, message?, validDays? }` | staff |
| POST | `/projects/staff/:id/send` | staff |
| POST | `/projects/staff/milestones/:id/paid` `{ reference? }` | staff |

Code: `apps/api/src/projects/` (`packages.ts` lists the packages, `proposal.ts` holds the totals and milestones, unit-tested), plus `components/projects/` and `app/admin/projects/` on the web. The e2e test covers the whole flow.
