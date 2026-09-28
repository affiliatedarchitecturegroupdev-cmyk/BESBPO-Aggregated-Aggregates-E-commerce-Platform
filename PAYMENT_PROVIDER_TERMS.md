# Payment Provider Terms — Research Notes

Backs the customer-facing `instalments` copy in
`apps/web/src/data/payment-methods.ts` ("we should showcase that we are
savvy about all of them"). Researched via live web search against each
provider's own published terms, September 2026. Re-verify before launch —
BNPL terms and merchant fee structures change; this is a snapshot, not a
live feed.

## Buy-Now-Pay-Later (consumer)

| Provider | Terms as published | Notes |
|---|---|---|
| **PayJustNow** | 3 payments — 1/3 upfront, remaining 2/3 split across the customer's next two salary dates. 0% interest, no fees when paid on time. | Widely integrated via both PayFast and Peach Payments. |
| **Payflex** | 4 equal payments over 6 weeks (fortnightly), interest-free and fee-free on time. | PayFast-aggregated. |
| **Mobicred** | Revolving credit facility — one consolidated monthly payment across all Mobicred spend, not a fixed instalment count. | Functions more like a credit account than a fixed BNPL plan. |
| **MoreTyme** | Standard BNPL-style split; PayFast-aggregated. No customer-facing instalment count confirmed in the researched terms — showcased as available without a specific instalment claim in the storefront copy. | |
| **Happy Pay** | 2 payments — split across 2 paycheques, interest-free, no deposit required. | Added to the lineup after the original Roofsteel payment-asset library was built. |
| **Float** | Up to 24 monthly instalments, zero interest, zero fees — draws against the customer's existing card's available credit rather than a separate credit line. | This is "Float Payments," the credit-facility product Fortune confirmed — distinct from any unrelated "Float" project-management tool. |

## B2B / Trade credit

| Provider | Terms as published | Notes |
|---|---|---|
| **Lulapay** | Up to 6 months to repay. No early-repayment penalties. No joining, account, or monthly fees. | Scoped Trade/Volume tier only (`tradeOnly: true` in `PaymentMethodConfig`), with a R10,000–R5,000,000 order-value eligibility band. |

## Merchant aggregators (who actually processes what)

Two providers already aggregate most of the above under one merchant
integration — this is *why* the backend routing layer
(`PaymentGatewayAdapter` / `PaymentMethodConfig`) exists, even though every
method still renders as its own standout tile to the customer (the
confirmed "smart compromise" — see `AGENTIC_RULES.md`):

- **PayFast**: card networks, Instant EFT, Capitec Pay, Apple/Google/Samsung
  Pay, SnapScan, Zapper, Payflex, Mobicred, MoreTyme, PayJustNow — one
  merchant account covers nearly the entire consumer-facing set.
- **Peach Payments**: an alternative/overlapping aggregator, notably strong
  on the BNPL partner network (PayJustNow, Happy Pay, Float) — used as the
  routing default for those three and as a documented failover target for
  several PayFast-routed methods in the seed data (`PAYMENT_METHODS`
  in `packages/database/prisma/seed.ts`; editable at `/admin/payments`).
- **Ozow, Stitch, Lulapay**: each kept on its own direct integration
  (`OZOW_DIRECT`, `STITCH_DIRECT`, `LULAPAY_DIRECT`) rather than routed
  through an aggregator, since none of the researched aggregator
  integrations confirmed first-class support for all three.

## What's still a default, not a confirmed commercial decision

The gateway assignment in `PAYMENT_METHODS` (seed.ts) and the
adapter stubs in `apps/api/src/payment-gateway/adapters/` are a reasonable
default built from the researched terms above — they are **not** a
confirmed merchant-account setup. No real credentials exist for any
provider yet (see each adapter's `requiredEnvVars`). Ops should review the
routing table before any adapter goes live, per `AGENTIC_RULES.md` rule 1
applied to payment configuration.
