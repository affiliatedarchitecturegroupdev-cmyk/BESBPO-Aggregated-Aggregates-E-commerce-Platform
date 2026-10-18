# Lead times

The usual time from order confirmation to delivery, per category, in
working days — set by staff on *Admin → Lead times* (SiteContent
`lead-times`).

- Shown on product pages, in the cart and at checkout (the longest of the
  categories in the cart, only if every category has one), and on the order
  confirmation.
- **No defaults.** A category without a lead time shows nothing — lead times
  are never guessed. Set them from what partner suppliers confirm.
- Validation: shortest ≤ longest, 0–60 / 0–90 days, one row per category,
  an optional note (e.g. "Ex quarry, weekdays").
- They're estimates, as the Shipping & Delivery Policy (section 4) says.
