# Supplier portal

Partner suppliers see the orders our team gives them to load, and answer.
Code: `apps/api/src/deliveries/supplier-portal.*`, storefront
`/suppliers/portal`.

## Set-up (staff)

1. The person at the supplier creates an ordinary account on the site.
2. *Admin → Suppliers → (supplier) → Supplier portal logins*: link the
   account by email. It becomes a `SUPPLIER` login tied to that supplier
   (`User.supplierLocationId`). Staff, partner and trade-company accounts
   can't be linked; unlinking makes it a customer account again.
3. *Admin → Orders → Deliveries → Supplier*: **assign** the order to a
   supplier. Its portal logins get a *Order to load* email (the order
   number, products and quantities, province, and a portal link).
   Re-assigning clears the previous supplier's answer.

## What the supplier sees and does

- Open and closed orders assigned to it: products, quantities, delivery
  address and province, the customer's delivery note, drops and their
  dates, and who signed for each delivery.
- **Never**: prices or totals, the customer's name, email or phone.
- Answers each order: **can load** (optionally from a date) or **can't**
  (a reason is required). Staff are emailed either way.
- Sets a **ready-to-load date** per drop.
- Makes the **driver's proof-of-delivery link** (docs/deliveries.md).
- Sends its **current price list** (*Your price list*, docs/supplier-prices.md). It gives the date the prices hold until and sees which lines we matched and accepted. It never sees our sell prices. Staff approve every price.
- Orders are marked *Ready to load* only once confirmed (paid, deposit in,
  or on account).

Access is checked on every request from the database link, not the
session, and the supplier must be active.

## Notifications

`SUPPLIER_ORDER`: the supplier's email (always sent to its portal logins
when staff assign with *Email*), and the staff alert when the supplier
answers (switchable on Admin → Notifications).

## Decisions for the owner to review

1. The supplier sees the **delivery address** (it may deliver on its own
   vehicle) but no customer contact details — questions go through our team.
2. Suppliers can't change order quantities or dates — they answer and set
   ready dates; staff make the changes.
3. Only portal logins are emailed: supplier contact details stay staff-only.
