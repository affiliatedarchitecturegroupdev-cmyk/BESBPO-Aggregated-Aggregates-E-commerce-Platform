# Legal pages — internal status (not published)

These files render the public pages under `/legal/*`. This README is not
published — only the files named in `apps/web/src/app/legal/*/page.tsx` are.
**Never put drafting or review notes on the public pages themselves**
(AGENTIC_RULES.md rule 5); keep them here.

| Page | File | Status |
|---|---|---|
| Privacy Policy | `privacy-policy.md` | Draft — **awaiting attorney review** (updated 7 Oct 2026, see below) |
| POPIA Notice | `popia-notice.md` | Draft — **awaiting attorney review** (updated 7 Oct 2026) |
| Terms & Conditions | `terms-and-conditions.md` | Draft — awaiting attorney review |
| Plant Hire & Site Services Terms | `hire-terms.md` | **New draft, 7 Oct 2026 — awaiting attorney review before final** |
| Partner Terms | `partner-terms.md` | **New draft, 7 Oct 2026 — awaiting attorney review before final** |
| Cookie Policy | `cookie-policy.md` | Draft — awaiting attorney review |
| Returns & Refunds | `returns-refunds-policy.md` | Draft — awaiting attorney review |
| Shipping & Delivery | `shipping-delivery-policy.md` | Draft — awaiting attorney review |
| PAIA Manual | `paia-manual.md` | Draft — awaiting attorney review |

Non-legal page with legal content, also for counsel: **`/plant-hire/safety`**
(`apps/web/src/app/plant-hire/safety/page.tsx`) — how site health and safety
responsibilities are described (OHSA, Construction Regulations 2014,
principal contractor).

When counsel signs off a page, update its status here and its "Last
updated" date in the file. If the Plant Hire or Partner Terms change
materially, also bump `HIRE_TERMS_VERSION` / `PARTNER_TERMS_VERSION` in
`apps/api/src/bookings/terms.ts` — partners are then asked to accept again
before their next offer.

## How acceptance is recorded

- **Customers** tick "I agree to the Plant Hire & Site Services Terms" when
  accepting a booking quote; the API refuses acceptance without it and
  stores the terms version on the booking (`Booking.termsVersion`).
- **Partners** accept the Partner Terms in the portal on their company's
  behalf before they can accept any offer; the version, time and the login
  that accepted are stored on the partner (`HirePartner.termsVersion`,
  `termsAcceptedAt`, `termsAcceptedById`).

## Points for counsel — Plant Hire & Site Services Terms

1. **Agent model.** We describe ourselves as arranging the job, with the
   partner performing it as an independent business. Confirm this
   structure, who the customer contracts with for the hire, and the
   invoicing/VAT consequences (open tax question in
   `PLANT_HIRE_CATALOGUE.md`).
2. **Consumer Protection Act.** Cancellation charges after a partner
   accepts (§10), the 48-hour dispute window (§9) and the liability cap
   (§14) — check against the CPA for consumer customers.
3. **Business commitments written into the terms** (confirm the business
   can honour them): full refund if no partner is found; refunds "normally
   within 10 business days"; no charge for time lost to a partner's
   breakdown (§11); partners required to hold public-liability insurance.
4. **Damage and loss** allocation between customer and partner (§12).
5. **Non-circumvention wording for customers** (§13) — deliberately soft
   (no penalty); confirm.

## Points for counsel — Partner Terms

1. **Independent-contractor relationship**, and whether a separate signed
   partner agreement is also needed (§1 refers to one).
2. **Non-circumvention: 12 months** after introduction (§7) —
   enforceability and duration; this period is a placeholder for the
   business to confirm.
3. **Payouts "normally within 5 business days"** after the dispute window
   (§8) — confirm with finance.
4. **Indemnity** in §9, and the suspension/termination process in §11.
5. **Holding customer funds** before payout (EFT into the Group account
   today) — legal/banking advice.

## Points for counsel — Privacy Policy & POPIA Notice (7 Oct 2026 update)

Added to match features already live: enquiries and bookings; sharing the
job, site and the customer's **first name** with partners (never contact
details); automatic redaction of contact details in booking messages and
job cards, with **staff review flags** (new §5A — confirm the wording on
monitoring and that no automated decision-making occurs); partner data
(vetting documents, bank details, ratings); job applications and CVs
(12-month retention, matching the consent on the application form);
newsletter; WhatsApp notifications (opt-in); sign-in with X, Facebook and
Instagram; retention wording for enquiries and bookings. Cross-border
transfers: the API and database are hosted in Frankfurt (Render) —
confirm §6 of the POPIA Notice covers this.

## Known gaps elsewhere

- `terms-and-conditions.md` §2 still describes the original tier discounts
  (8% / 15%); cement and ready-mix tiers now follow the floor-based
  schedule in `PRICING_POLICY.md`, and §4 lists payment methods that are not
  all live yet.
