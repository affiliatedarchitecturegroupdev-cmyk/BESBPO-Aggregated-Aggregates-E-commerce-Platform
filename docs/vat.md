# VAT: one switch

ROADMAP 0.10. The business may not charge VAT, or show it, until SARS registers it for VAT. The whole platform follows **one switch**:

> **`GROUP_VAT_NUMBER`** on the API (Render → aggregates-store-api → Environment).
> Empty (or not a valid South African VAT number) means **not registered**. A valid number (ten digits starting with 4) means **registered**.

The API exposes the mode publicly at `GET /tax` → `{ vatRegistered, ratePercent }`. The storefront reads it through `getVatRegistered()` (`apps/web/src/lib/tax.ts`), cached for five minutes. When the API can't be reached, the storefront assumes "not registered", so it never shows VAT it may not charge.

## What changes

| Where | Not registered (today) | Registered |
|---|---|---|
| Quotation PDF, client quotation page, quotation email | "Total amount payable", no VAT line | "Total (VAT inclusive)", "Includes VAT at 15%" |
| Order confirmation PDF | "This is not an invoice" | "This is not a tax invoice" |
| Proforma invoice | "A request for payment — your invoice follows once the order is paid" | "This is not a tax invoice", "Prices include VAT at 15%" |
| Invoice staff issue (Admin → Orders) | **Plain invoice**: titled "Invoice", one "Total amount payable" line, no VAT number | **Tax invoice**: the Group's VAT number, excl./VAT/incl. split |
| Invoice email | "Invoice AAI-…" | "Tax invoice AAI-…" |
| Admin quotation editor and quote-to-order form | Plain labels | "(incl. VAT)" labels and the VAT line |
| Buy online, AA 60/120, trade accounts, design fees and the shopping assistant | No VAT wording | VAT wording |

What decides each invoice is frozen on the invoice itself: `vatNumberBilled` is null on a plain invoice. An invoice issued before registration therefore stays a plain invoice for good, and one issued after stays a tax invoice.

## What is not affected

- **Customers' own VAT numbers** (trade accounts, quotations) still show as theirs.
- **The NHBRC's statutory fee** is still described as "plus VAT", because the NHBRC charges it, not us.
- **Supplier rate cards** may say whether *their* amounts include VAT.
- **Internal finance and insights figures** (operating costs, delivery costs, the VAT basis note) are admin-only. They are unchanged.
- **The legal pages** are written to be true in both modes ("invoices are issued by Besbpo Group (Pty) Ltd"). When the business registers, review them with the attorney and add a dated entry to `content/legal/policy-versions.json`.

## On registration

1. Set `GROUP_VAT_NUMBER` to the registration number and `PRICES_INCLUDE_VAT=true` on the API.
2. Redeploy the API. The storefront picks up the change within five minutes.
3. Check Admin → Orders: invoicing should say ready.
4. Have the legal pages reviewed (see above).
