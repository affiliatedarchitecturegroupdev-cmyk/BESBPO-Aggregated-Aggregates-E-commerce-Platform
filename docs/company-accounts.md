# Company accounts with several users

ROADMAP 6.1. A trade account can have a team. People order at the company's prices, buyers' larger orders wait for an approver, and every order can carry the company's purchase-order (PO) number. It's managed at **My account → Team** (`/account/team`).

## Roles

| Role | Orders | Approves buyers' orders | Manages team and rules | Pays |
|---|---|---|---|---|
| **Account admin** | yes | yes | yes | yes |
| **Approver** | yes | yes | — | yes |
| **Buyer** | yes, up to their limit | — | — | yes |
| **Accounts** | **no** | — | — | yes |

- **Everyone in the company sees its orders, quotes and invoices,** as before.
- **Account admins:**
  - are `COMPANY_ADMIN` users, the same role that applies for trade credit;
  - a company always keeps at least one;
  - whoever applied for the trade account is its first account admin, and existing companies' users became admins when this was released.
- **Roles are set per person** (`User.companyRole`). An account admin can change someone's role or limit, or take them off the account. Their past orders stay with the company.

## Inviting people

1. The account admin enters the person's email address, their role and, for a buyer, an optional **limit per order**.
2. The person gets an email with a link. It works once, for 14 days, and only stores a hash.
3. They sign in, or register, with **that** email address and accept. Their account then joins the company with that role.

**An invitation can't be accepted:**
- with a different email address;
- by someone already in another company;
- by staff, partner or supplier logins.

**Managing invitations:**
- a new invitation to the same address replaces the old one;
- open invitations can be withdrawn.

## Approvals

A **buyer's** order waits for approval when its total is above:
- their own limit per order, or
- the company's **approval threshold** (an account admin sets it under "Ordering rules").

Account admins' and approvers' own orders never wait.

**While it waits:**
- **The order can't be paid,** charged to the account, or sent a payment link. The order page says why.
- **AA 60/120 express can't be chosen,** because it must be paid there and then.
- **Approvers and account admins are emailed** (`ORDER_APPROVAL_REQUESTED`). They decide under **Team → Waiting for approval**, with an optional note. A buyer can't approve their own order.
- **Approved:** the buyer is emailed (`ORDER_APPROVAL_DECIDED`) and the order can be paid as usual.
- **Declined:** the order is cancelled, nothing is charged, and the buyer is emailed.

Staff see "Waiting for the company's approval" and "Declined by the company" in Admin → Orders.

## Purchase-order numbers

- **At checkout:** a PO number field, required when the company ticks "Every order needs our purchase-order number".
- **Where it shows:** on the order page, in order emails, and on the order confirmation, proforma, invoice and delivery note PDFs.

## API

| Method | Path | Who |
|---|---|---|
| GET | `/company/team` | company members: members, open invitations (admins), settings, orders waiting for approval |
| POST | `/company/team/invites` `{ email, companyRole, spendLimit? }` | account admin |
| DELETE | `/company/team/invites/:id` | account admin |
| GET | `/company/invites/preview?token=` | public: the company and role an invitation is for |
| POST | `/company/invites/accept` `{ token }` | the invited person, signed in |
| PATCH | `/company/team/members/:id` `{ companyRole, spendLimit? }` | account admin |
| DELETE | `/company/team/members/:id` | account admin |
| PUT | `/company/settings` `{ approvalThreshold?, requirePurchaseOrder? }` | account admin |
| POST | `/company/approvals/:orderId` `{ decision: APPROVE / DECLINE, note? }` | approvers and account admins |

`POST /orders` takes `purchaseOrderNumber`. The rules are in `apps/api/src/company-accounts/company-accounts.ts` (unit-tested), and the end-to-end test covers the whole flow.

## Still to come (Phase 6)

- **6.2** Monthly statements.
- **6.3** Contract pricing.
- **6.4** Project / site accounts.
- **6.5** Saved cards.
