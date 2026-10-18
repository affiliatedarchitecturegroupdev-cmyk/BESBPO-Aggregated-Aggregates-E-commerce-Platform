# Phased deliveries and proof of delivery

Code: `apps/api/src/deliveries/` (rules in `phasing.ts`), the storefront's
order tracking page, `/pod/[token]`, and *Admin → Orders → Deliveries* and
*Admin → Deliveries*. Customer terms: T&C section 5, Shipping & Delivery
section 4A.

## Phased deliveries

An order can be split into **drops** — dated deliveries that between them
deliver every line exactly once.

- **Who plans**: the buyer (on *Track your order → Deliver in stages*) or
  staff, while the order is awaiting payment or confirmed and no drop has
  left. Replacing a plan replaces all its drops. AA 60/120 orders are one
  delivery.
- **Rules** (checked by the API): 2–12 drops; dates from tomorrow up to a
  year ahead (South African days); every unit of every line placed once;
  whole-unit lines stay whole. Drops are numbered in date order.
- **Value**: each drop carries its share of each line's total, split in
  cents so the drops add up exactly to the materials subtotal.
- **Staff steps per drop**: *Confirm date with supplier* → *Dispatch*
  (carrier, partner name, tracking ref) → *Delivered* (by signature, or by
  hand). Planned and confirmed drops can be rescheduled.
- **When a drop can leave**: payments must cover the delivery fee (and any
  express fee) plus the materials on every drop dispatched so far and this
  one. Orders on a trade account aren't held. The message says how much is
  short.
- **The order follows its drops**: *Out for delivery* from the first
  dispatched drop, *Delivered* when the last drop is. Staff can't move a
  phased order to *Out for delivery* / *Delivered* directly. Cancelling the
  order cancels its undispatched drops.
- **Extra delivery charges**: the plan doesn't change the order total. If
  more drops cost more to deliver, staff agree it with the customer by quote.
- **Calendar**: *Admin → Deliveries* lists drops due in the next 30 days (and
  any on the road), with the unpaid balance and the supplier's ready date.

## Proof of delivery (POD)

- Staff — or the supplier loading the order, in the supplier portal — make a
  **driver's link** for a delivery (the order, or a drop). Only its hash is
  stored; making a new one replaces the old. It works **once**.
- `/pod/<token>` needs no sign-in. It shows the order number and what's on
  the delivery — **no customer name, address or contact details**.
- The receiver gives their name and **signs on the phone**; the driver can
  add a **photo** (shrunk to 1600px on the phone) and the **phone's
  location**, and note shortages or damage.
- Capture is refused until the delivery is marked dispatched. On capture the
  drop (or order) is marked delivered, the customer is emailed, and staff are
  emailed — flagged *Delivery EXCEPTION* when something was noted.
- Signature (PNG) and photo (JPEG, PNG or WebP, ≤ 8 MB, checked by content)
  are kept in file storage under `proofs-of-delivery/<order>/`. The buyer,
  staff and the fulfilling supplier can view them (`/api/proofs/<id>/…`).

## API

| Method | Path | Who |
|---|---|---|
| GET | `/deliveries/orders/:id` | buyer, staff, fulfilling supplier |
| PUT / DELETE | `/deliveries/orders/:id/plan` | buyer, staff |
| PATCH | `/deliveries/drops/:id` | staff |
| POST | `/deliveries/orders/:id/pod-link`, `/deliveries/drops/:id/pod-link` | staff, fulfilling supplier |
| GET | `/deliveries/upcoming?days=` | staff |
| GET | `/deliveries/proofs/:id/signature|photo` | buyer, staff, fulfilling supplier |
| GET / POST | `/pod/:token` | public (multipart: `receivedBy`, `signature`, `photo`, `latitude`, `longitude`, `exceptions`) |

## Notifications

`DROP_DISPATCHED` (customer: which drop, what's on it, the next date) and
`DELIVERY_SIGNED` (customer and staff). A phased order sends
`DROP_DISPATCHED` instead of `ORDER_DISPATCHED`, and `ORDER_DELIVERED` when
the last drop is delivered.

## Decisions for the owner to review

1. **Pay-as-you-go release** per drop (delivery fee with the first drop),
   rather than full payment before the first drop.
2. **2–12 drops, up to a year ahead**; longer programmes go on a supply
   agreement.
3. **No automatic extra delivery fee** for extra drops — agreed by quote.
4. **The driver's page shows no address** — the driver has the delivery
   note. Location and photo are optional.
5. **Supplier can make driver links** for orders it's loading.
