# Trade credit: ordering on account

Approved trade companies can order **on account**: the order is confirmed
and delivered now, and paid within the company's terms. Code:
`apps/api/src/credit/` (rules in `credit.ts`), the `ON_ACCOUNT` branch in
`PaymentsService`, and the storefront's `/account/credit` and
`/admin/credit`. Customer terms: T&C section 4A.

## How it works

1. A company with an **approved trade account** applies from
   *My account → Trade credit*. Only its account administrator
   (`COMPANY_ADMIN`) can apply. The application records the limit and terms
   asked for (7, 14, 30 or 60 days), years trading, monthly spend, two trade
   references, an accounts contact, and when the terms were accepted.
2. Staff get a *Trade credit application* email and review it on
   *Admin → Trade credit*: approve with a **limit** (R1,000 – R5,000,000) and
   **terms**, or decline. The company is emailed either way.
3. At checkout the **Trade account (pay on terms)** tile shows only when the
   company's available credit covers the whole order and nothing on account
   is overdue. Choosing it:
   - sets the order's plan to `ACCOUNT` and method to `ON_ACCOUNT`,
   - sets `accountDueAt` = now + the company's terms,
   - confirms the order (confirmation email with the due date, no receipt).
   Nothing is charged and no ledger payment is created.
4. The order can be dispatched and delivered while unpaid — the "balance
   before dispatch" rule (docs/payments.md) doesn't apply to account orders.
5. Payment comes later by EFT (staff record it on the ledger as a balance
   payment), from the order page, or by payment link. Part payments count.

## The credit position

| | |
|---|---|
| Used | Σ (total − paid) on the company's `ACCOUNT` orders, not cancelled |
| Overdue | the part of that past its `accountDueAt` |
| Available | limit − used (never below 0) |

An order can go on account only if it fits in *available* **and** nothing is
overdue. AA 60/120 orders can't go on account (they're paid on the spot).

## Staff tools

- *Admin → Trade credit*: every application and account, with the position;
  approve, change the limit or terms, decline, or **suspend** (a note is
  required — the company sees it). Suspending stops new orders on account;
  orders already on account stay due on their terms.
- *Owed on account*: every unpaid account order, soonest due first, overdue
  in red. Each links to the order's payments page.
- *Admin → Orders*: account orders show "On account · due …".

## API

| Method | Path | Who |
|---|---|---|
| GET | `/credit/me` | the company's users |
| POST | `/credit/apply` | the company admin |
| GET | `/credit/accounts?status=` | staff |
| GET | `/credit/receivables` | staff |
| POST | `/credit/accounts/:companyId/decide` | staff (`APPROVE` / `DECLINE` / `SUSPEND`) |

## Notifications

`CREDIT_APPLIED` (the company and staff) and `CREDIT_DECIDED` (the company:
approved with the limit and terms, declined, or suspended).

## Decisions for the owner to review

1. **Terms offered**: 7, 14, 30 or 60 days from confirmation; limits from
   R1,000 to R5,000,000 (larger facilities agreed outside the platform).
2. **Hard stop when overdue**: one overdue order blocks new account orders.
3. **No interest or late fees** are charged by the platform — the published
   terms don't provide for any.
4. **Sales are reported from confirmation** (as for every order, `paidAt`
   marks the sale), even though cash arrives later; the receivables list is
   the cash view.
5. **Credit vetting is manual** — no credit bureau check is wired in.
