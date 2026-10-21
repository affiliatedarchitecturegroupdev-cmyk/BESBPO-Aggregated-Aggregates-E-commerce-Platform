# Sales quotations

Formal quotations that the sales team makes in the admin panel (**Admin → Quotations**) for clients who come in by WhatsApp, social media or phone. A quotation works like one from an invoicing app:

1. Fill in the client's details.
2. Add any products and price them.
3. Send it by email with the PDF attached, or share its link on WhatsApp.
4. The client opens a private page where they view the quotation, download the PDF, and **accept and pay** online.

Storefront quote requests (RFQ) are separate and stay under **Quote requests**.

## Pricing a line

Every product on the platform can be quoted, including products hidden from the storefront and products without a list price. Each line is priced one of three ways:

| Price from | What happens |
|---|---|
| **List price** | The platform's price at the chosen tier (Retail, Contractor/trade or Volume/civil bulk). Not available for products without a list price. |
| **Supplier cost + markup** | Enter the supplier's cost per unit (VAT inclusive). The quoted price is the cost plus the product's **standard markup**. That markup comes from the pricing service and follows the pricing policy: aggregates use the category markup (for example sand 28% and stone 25%), and packaged goods use 8%. Staff can type a different markup. |
| **Fixed price** | Staff type the price. |

All prices include VAT, as on the storefront. A line without a list price switches itself to *Supplier cost + markup*. The quotation can't be saved until every line has a price.

**Delivery.** Enter the distance and the editor suggests a delivery fee: the standard delivery rules for the load, plus any distributed delivery premium (`docs/delivery-premium.md`). Leave the fee empty to use the suggestion, or type your own.

**Margin.** The editor shows cost, margin and margin % to staff only. List-price lines carry their cost from the pricing service. Supplier-cost lines carry the cost that was entered. Fixed-price lines only show a margin if a cost is known.

## Sending

- **Email it**:
  - gives the quotation its number (`AAQ-000001`, never reused);
  - emails the client a summary with the **quotation PDF attached** and a "View, accept and pay" button. The email can be switched off under Admin → Notifications (*Quotation sent (sales)*).
- **Get link for WhatsApp**:
  - gives the quotation its number in the same way;
  - shows the client's link, an *Open WhatsApp* button with a ready-written message to the client's number, and *Copy message*.
- **Each send makes a fresh link, and earlier links stop working.** Only a hash of the link is stored, so it can't be looked up again later. Send again to get a new one.
- **Editing a sent quotation** takes it back to draft and turns its link off. The number stays. Send it again for the client to see the changes.
- **Validity** is 14 days by default (1–90). Open quotations past their date become *Expired* and can't be accepted. Save the quotation again to set a new date.
- **Download PDF** works at any stage. Drafts are marked "DRAFT — not yet issued".
- **Duplicate** copies a quotation as a new draft. Use it to re-quote, or after a quotation has been accepted or declined.

## The client's page (`/quotation/<link>`)

- Shows the lines, delivery and total (including the VAT amount), the notes and the PDF. It never shows costs, markups or margins.
- **Accept and pay** makes the order at the quoted prices, once only. It's a normal order in Admin → Orders, with channel QUOTE and the supplier costs kept for profit reporting. The client then goes straight to a payment link for the full amount, valid 7 days, where they can use any payment method. Accepting again before paying just gives a fresh payment link.
- **Decline** marks it declined and tells the sales team.
- Search engines are told not to index these pages (`robots.txt` and `noindex`).

## API

| Endpoint | Who |
|---|---|
| `GET /quotations/products?q=` | Staff: product search |
| `POST /quotations/price` | Staff: live pricing (nothing saved) |
| `GET /quotations`, `POST /quotations`, `GET/PUT /quotations/:id` | Staff |
| `POST /quotations/:id/issue` `{ email }` · `POST /quotations/:id/duplicate` · `GET /quotations/:id/pdf` | Staff |
| `GET /quotations/view/:token` (+ `/pdf`), `POST …/accept`, `POST …/decline` | The client's link |

The pricing rules live in `apps/api/src/quotes/sales-quote.ts` (pure and unit-tested). The service is `sales-quotes.service.ts` and the PDF is `apps/api/src/documents/quotation.ts`.
