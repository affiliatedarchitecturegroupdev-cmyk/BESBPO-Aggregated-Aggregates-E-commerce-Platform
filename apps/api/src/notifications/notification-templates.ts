import type { NotificationEvent, UnitOfSale } from "@aggregates/database";
import { formatZAR, UNIT_LABEL, type Money } from "../common/format";

export { formatZAR };

/**
 * Every message the platform sends, as pure functions of the record it's
 * about. Emails get a plain-text and an HTML body; WhatsApp gets a Meta
 * message template name plus its body parameters (business-initiated
 * WhatsApp messages must use a template Meta has approved — the template
 * texts to submit are in docs/notifications.md and mirror `whatsappText`).
 *
 * Copy rules: never promise a delivery time or a price the platform didn't
 * calculate, and never show supplier contact details (AGENTIC_RULES.md).
 */

export type OrderData = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: Money;
  deliveryFee: Money;
  total: Money;
  deliveryAddress: string | null;
  deliveryProvince: string | null;
  deliveryDistanceKm: number | null;
  customerName: string | null;
  companyName: string | null;
  lines: { name: string; quantity: number; unitOfSale: UnitOfSale | null; lineTotal: Money | null }[];
  shipment: { carrier: string; externalPartnerName: string | null; trackingRef: string | null } | null;
};

export type QuoteData = {
  id: string;
  reference: string;
  contactName: string | null;
  companyName: string | null;
  projectName: string | null;
  deliveryAddress: string | null;
  estimatedSubtotal: Money | null;
  quotedTotal: Money | null;
  staffNotes: string | null;
  reasons: string[];
  hasAccount: boolean; // guest requests can't accept online — they reply to the email
  lines: { name: string; quantity: number; unitOfSale: UnitOfSale }[];
};

export type CompanyData = {
  id: string;
  name: string;
  applicantName: string | null;
  applicantEmail: string | null;
  tierLabel: string;
  requestedTierLabel: string | null;
  reviewNotes: string | null;
};

export type EnquiryData = {
  id: string;
  reference: string;
  kindLabel: string;
  subject: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  province: string | null;
  siteAddress: string | null;
  message: string | null;
  details: [string, string][];
};

export type BookingData = {
  id: string;
  reference: string;
  itemName: string;
  status: string;
  customerName: string | null;
  partnerName: string | null;
  province: string;
  siteAddress: string;
  startDate: string; // display form, e.g. "12 Oct 2026"
  endDate: string;
  quantityLabel: string; // e.g. "3 days", "4 loads"
  customerTotal: Money;
  partnerAmount: Money;
  quoteValidUntil: string | null;
  disputeReason: string | null;
};

export type ScheduleData = {
  id: string;
  reference: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  projectName: string | null;
  province: string | null;
  siteAddress: string | null;
  requiredBy: string | null; // display form, e.g. "12 Oct 2026"
  message: string | null;
  lineCount: number;
  totalMassKg: number;
  bySize: [string, string][]; // e.g. ["Y12", "1,234.5 kg"]
  fileName: string | null;
  quotedAmount: Money | null;
  quoteValidUntil: string | null;
  quoteNotes: string | null;
  hasAccount: boolean; // guests accept by replying to the email
};

export type EmailMessage = { subject: string; text: string; html: string };
export type WhatsAppMessage = { templateName: string; params: string[]; text: string };

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aggregates.store").replace(/\/+$/, "");
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const lineText = (l: { name: string; quantity: number; unitOfSale: UnitOfSale | null }) =>
  `${l.quantity} ${l.unitOfSale ? UNIT_LABEL[l.unitOfSale] : ""} — ${l.name}`.replace(/\s+—/, " —");

const carrierName = (s: NonNullable<OrderData["shipment"]>) =>
  s.carrier === "BESFLEET" ? "Besfleet" : (s.externalPartnerName ?? "one of our delivery partners");

const greeting = (name: string | null) => (name?.trim() ? `Hi ${name.trim().split(/\s+/)[0]},` : "Hi,");

export type Block = { kind: "h"; text: string } | { kind: "p"; text: string } | { kind: "list"; items: string[] } | { kind: "rows"; rows: [string, string][] } | { kind: "cta"; label: string; href: string };

const DEFAULT_FOOTER = "Aggregated Aggregates — a Besbpo Group company. You're receiving this because of an order, quote or account on aggregates.store.";

/** One layout for every email, so the text and HTML bodies always say the same thing. */
export function email(subject: string, blocks: Block[], footer = DEFAULT_FOOTER): EmailMessage {
  const text = [
    ...blocks.map((b) => {
      if (b.kind === "h") return b.text.toUpperCase();
      if (b.kind === "p") return b.text;
      if (b.kind === "list") return b.items.map((i) => `- ${i}`).join("\n");
      if (b.kind === "rows") return b.rows.map(([k, v]) => `${k}: ${v}`).join("\n");
      return `${b.label}: ${b.href}`;
    }),
    "--",
    footer,
  ].join("\n\n");

  const body = blocks
    .map((b) => {
      if (b.kind === "h") return `<h2 style="margin:24px 0 8px;font-size:16px">${escapeHtml(b.text)}</h2>`;
      if (b.kind === "p") return `<p style="margin:0 0 16px">${escapeHtml(b.text)}</p>`;
      if (b.kind === "list") return `<ul style="margin:0 0 16px;padding-left:20px">${b.items.map((i) => `<li style="margin:0 0 4px">${escapeHtml(i)}</li>`).join("")}</ul>`;
      if (b.kind === "rows") {
        const rows = b.rows
          .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5b6470">${escapeHtml(k)}</td><td style="padding:4px 0;text-align:right">${escapeHtml(v)}</td></tr>`)
          .join("");
        return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px">${rows}</table>`;
      }
      return `<p style="margin:24px 0"><a href="${escapeHtml(b.href)}" style="display:inline-block;background:#1f4e79;color:#f4f1ea;padding:12px 20px;border-radius:2px;text-decoration:none;font-weight:600">${escapeHtml(b.label)}</a></p>`;
    })
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f;font-size:15px;line-height:1.5"><div style="max-width:560px;margin:0 auto;padding:24px 16px"><p style="margin:0 0 24px;font-weight:700;letter-spacing:.04em">AGGREGATED AGGREGATES</p><div style="background:#fff;border:1px solid #e3dfd6;padding:24px">${body}</div><p style="margin:16px 0 0;font-size:12px;color:#5b6470">${escapeHtml(footer)}</p></div></body></html>`;
  return { subject, text, html };
}

function orderSummary(o: OrderData): Block[] {
  const rows: [string, string][] = [
    ["Materials", formatZAR(o.subtotal)],
    ["Delivery", Number(o.deliveryFee.toString()) === 0 ? "Included" : formatZAR(o.deliveryFee)],
    ["Total", formatZAR(o.total)],
  ];
  const where = o.deliveryAddress ? [{ kind: "p" as const, text: `Delivering to ${o.deliveryAddress}${o.deliveryProvince ? `, ${o.deliveryProvince}` : ""}.` }] : [];
  return [{ kind: "list", items: o.lines.map(lineText) }, { kind: "rows", rows }, ...where];
}

// ---------------------------------------------------------------------------
// Customer emails
// ---------------------------------------------------------------------------

export function customerOrderEmail(event: NotificationEvent, o: OrderData): EmailMessage | null {
  const site = siteUrl();
  const track = { kind: "cta" as const, label: "Track your order", href: `${site}/orders/${o.id}/tracking` };
  const hi = { kind: "p" as const, text: greeting(o.customerName) };
  switch (event) {
    case "ORDER_PLACED":
      return email(`Order ${o.orderNumber} received — choose how to pay`, [
        hi,
        { kind: "p", text: `Thanks for your order. Here's what you ordered — it's confirmed with our partner supplier once payment is received.` },
        ...orderSummary(o),
        { kind: "cta", label: "Pay for your order", href: `${site}/orders/${o.id}/confirmation` },
      ]);
    case "ORDER_CONFIRMED":
      return email(`Order ${o.orderNumber} confirmed`, [
        hi,
        { kind: "p", text: `Payment received — your order ${o.orderNumber} is confirmed. The partner supplier nearest your site is preparing your load, and we'll let you know when it's dispatched.` },
        ...orderSummary(o),
        track,
      ]);
    case "ORDER_DISPATCHED": {
      const s = o.shipment;
      return email(`Order ${o.orderNumber} is on its way`, [
        hi,
        { kind: "p", text: `Your load is out for delivery${s ? ` with ${carrierName(s)}` : ""}.${s?.trackingRef ? ` Tracking reference: ${s.trackingRef}.` : ""}` },
        ...(o.deliveryAddress ? [{ kind: "p" as const, text: `Delivering to ${o.deliveryAddress}${o.deliveryProvince ? `, ${o.deliveryProvince}` : ""}. Please make sure the site is accessible for a tipper truck.` }] : []),
        track,
      ]);
    }
    case "ORDER_DELIVERED":
      return email(`Order ${o.orderNumber} delivered`, [
        hi,
        { kind: "p", text: `Your order ${o.orderNumber} has been delivered. Compliance documents for the materials are on your order record.` },
        { kind: "cta", label: "View your order", href: `${site}/orders/${o.id}/confirmation` },
        { kind: "p", text: "Something not right with the delivery? Reply to this email and our team will help." },
      ]);
    case "ORDER_CANCELLED":
      return email(`Order ${o.orderNumber} cancelled`, [
        hi,
        { kind: "p", text: `Your order ${o.orderNumber} (${formatZAR(o.total)}) has been cancelled. If you've already paid, our team will be in touch about your refund under our returns and refunds policy.` },
        { kind: "cta", label: "Returns & refunds policy", href: `${site}/legal/returns-refunds` },
      ]);
    default:
      return null;
  }
}

export function customerQuoteEmail(event: NotificationEvent, q: QuoteData): EmailMessage | null {
  const site = siteUrl();
  const hi = { kind: "p" as const, text: greeting(q.contactName) };
  switch (event) {
    case "QUOTE_RECEIVED":
      return email(`Quote request ${q.reference} received`, [
        hi,
        { kind: "p", text: `Thanks — we've received your quote request${q.projectName ? ` for ${q.projectName}` : ""}. Our sales team responds within one business day with delivered pricing.` },
        { kind: "list", items: q.lines.map(lineText) },
        ...(q.deliveryAddress ? [{ kind: "p" as const, text: `Delivery to ${q.deliveryAddress}.` }] : []),
        { kind: "p", text: `Your reference is ${q.reference} — quote it if you contact us.` },
      ]);
    case "QUOTE_PRICED":
      return email(`Your quote ${q.reference} is ready: ${q.quotedTotal !== null ? formatZAR(q.quotedTotal) : ""}`.replace(/: $/, ""), [
        hi,
        { kind: "p", text: `We've priced your quote request ${q.reference}${q.projectName ? ` for ${q.projectName}` : ""}.` },
        { kind: "list", items: q.lines.map(lineText) },
        ...(q.quotedTotal !== null ? [{ kind: "rows" as const, rows: [["Quoted total", formatZAR(q.quotedTotal)]] as [string, string][] }] : []),
        ...(q.staffNotes ? [{ kind: "p" as const, text: q.staffNotes }] : []),
        q.hasAccount
          ? { kind: "cta", label: "Review and accept your quote", href: `${site}/account/dashboard` }
          : { kind: "p", text: `To accept it, reply to this email quoting ${q.reference} and our team will arrange invoicing and delivery.` },
      ]);
    default:
      return null;
  }
}

export function customerCompanyEmail(event: NotificationEvent, c: CompanyData): EmailMessage | null {
  const site = siteUrl();
  const hi = { kind: "p" as const, text: greeting(c.applicantName) };
  switch (event) {
    case "TRADE_APPLICATION_RECEIVED":
      return email(`Trade account application received — ${c.name}`, [
        hi,
        { kind: "p", text: `Thanks for applying for a ${c.requestedTierLabel ?? "trade"} account for ${c.name}. We'll review it within one business day. You can order and request quotes at list price in the meantime.` },
        { kind: "cta", label: "Go to your account", href: `${site}/account/dashboard` },
      ]);
    case "TRADE_APPLICATION_APPROVED":
      return email(`Your trade account is approved — ${c.name}`, [
        hi,
        { kind: "p", text: `Good news: ${c.name} is approved as a ${c.tierLabel} account. Your trade pricing applies to every order and quote from now on.` },
        ...(c.reviewNotes ? [{ kind: "p" as const, text: c.reviewNotes }] : []),
        { kind: "cta", label: "Start ordering", href: `${site}/products` },
      ]);
    case "TRADE_APPLICATION_DECLINED":
      return email(`Your trade account application — ${c.name}`, [
        hi,
        { kind: "p", text: `We weren't able to approve the trade account application for ${c.name} at this stage. You can keep ordering and requesting quotes at list price.` },
        ...(c.reviewNotes ? [{ kind: "p" as const, text: `Note from our team: ${c.reviewNotes}` }] : []),
        { kind: "p", text: "Questions? Reply to this email and our team will help." },
      ]);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Staff alerts
// ---------------------------------------------------------------------------

export function staffOrderEmail(event: NotificationEvent, o: OrderData): EmailMessage | null {
  if (event !== "ORDER_PLACED") return null;
  return email(`New order ${o.orderNumber} — ${formatZAR(o.total)}`, [
    { kind: "p", text: `${o.companyName ?? o.customerName ?? "A customer"} placed order ${o.orderNumber}. It's awaiting payment.` },
    ...orderSummary(o),
    ...(o.deliveryDistanceKm !== null ? [{ kind: "p" as const, text: `Delivery distance: ${o.deliveryDistanceKm}km (confirm road distance at dispatch).` }] : []),
    { kind: "cta", label: "Open in admin", href: `${siteUrl()}/admin/orders` },
  ]);
}

export function staffQuoteEmail(event: NotificationEvent, q: QuoteData): EmailMessage | null {
  const who = q.companyName ?? q.contactName ?? "A customer";
  const cta = { kind: "cta" as const, label: "Open in admin", href: `${siteUrl()}/admin/quotes` };
  switch (event) {
    case "QUOTE_RECEIVED":
      return email(`New quote request ${q.reference} — ${who}`, [
        { kind: "p", text: `${who} requested a quote${q.projectName ? ` for ${q.projectName}` : ""}.` },
        { kind: "list", items: q.lines.map(lineText) },
        {
          kind: "rows",
          rows: [
            ["Why it needs a quote", q.reasons.join("; ") || "Customer asked for a quote"],
            ...(q.estimatedSubtotal !== null ? ([["Materials estimate (excl. delivery)", formatZAR(q.estimatedSubtotal)]] as [string, string][]) : []),
          ],
        },
        cta,
      ]);
    case "QUOTE_ACCEPTED":
    case "QUOTE_DECLINED": {
      const accepted = event === "QUOTE_ACCEPTED";
      return email(`Quote ${q.reference} ${accepted ? "accepted" : "declined"} — ${who}`, [
        { kind: "p", text: `${who} ${accepted ? "accepted" : "declined"} quote ${q.reference}${q.quotedTotal !== null ? ` (${formatZAR(q.quotedTotal)})` : ""}.${accepted ? " Arrange invoicing and delivery." : ""}` },
        cta,
      ]);
    }
    default:
      return null;
  }
}

export function staffCompanyEmail(event: NotificationEvent, c: CompanyData): EmailMessage | null {
  if (event !== "TRADE_APPLICATION_RECEIVED") return null;
  return email(`Trade account application — ${c.name}`, [
    { kind: "p", text: `${c.applicantName ?? c.applicantEmail ?? "A customer"} applied for a ${c.requestedTierLabel ?? "trade"} account for ${c.name}.` },
    { kind: "cta", label: "Review the application", href: `${siteUrl()}/admin/applications` },
  ]);
}

export function customerEnquiryEmail(event: NotificationEvent, e: EnquiryData): EmailMessage | null {
  if (event !== "ENQUIRY_RECEIVED") return null;
  return email(`We've received your request ${e.reference}`, [
    { kind: "p", text: greeting(e.contactName) },
    { kind: "p", text: `Thanks — we've logged your ${e.kindLabel.toLowerCase()} request "${e.subject}" as ${e.reference}. Our team will come back to you with availability and a written quote. Nothing is booked or charged until you accept that quote.` },
    ...(e.details.length ? [{ kind: "rows" as const, rows: e.details }] : []),
    { kind: "p", text: `You'll accept the quote and pay online, so if you don't have an account yet, create one with this email address: ${siteUrl()}/account/register` },
    { kind: "p", text: `Reply to this email quoting ${e.reference} if anything changes.` },
  ]);
}

export function staffEnquiryEmail(event: NotificationEvent, e: EnquiryData): EmailMessage | null {
  if (event !== "ENQUIRY_RECEIVED") return null;
  const who = e.companyName ?? e.contactName;
  return email(`New ${e.kindLabel.toLowerCase()} enquiry ${e.reference} — ${who}`, [
    { kind: "p", text: `${who} sent a ${e.kindLabel.toLowerCase()} enquiry: ${e.subject}.` },
    {
      kind: "rows",
      rows: [
        ["Contact", e.contactName],
        ["Email", e.contactEmail],
        ...(e.contactPhone ? ([["Phone", e.contactPhone]] as [string, string][]) : []),
        ...(e.province ? ([["Province", e.province]] as [string, string][]) : []),
        ...(e.siteAddress ? ([["Site", e.siteAddress]] as [string, string][]) : []),
        ...e.details,
      ],
    },
    ...(e.message ? [{ kind: "p" as const, text: `Message: ${e.message}` }] : []),
    { kind: "cta", label: "Open the enquiry", href: `${siteUrl()}/admin/enquiries` },
  ]);
}

// ---------------------------------------------------------------------------
// Cut & bend (bar bending schedules). Priced by staff with the merchant.
// ---------------------------------------------------------------------------

const kg = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`;

const scheduleRows = (s: ScheduleData): [string, string][] => [
  ["Schedule", s.reference],
  ...(s.projectName ? ([["Project", s.projectName]] as [string, string][]) : []),
  ["Rows entered", s.lineCount ? `${s.lineCount} (${kg(s.totalMassKg)} by SANS 920 nominal mass)` : "None — schedule file attached"],
  ...(s.fileName ? ([["File", s.fileName]] as [string, string][]) : []),
  ...(s.requiredBy ? ([["Required by", s.requiredBy]] as [string, string][]) : []),
];

export function customerScheduleEmail(event: NotificationEvent, s: ScheduleData): EmailMessage | null {
  switch (event) {
    case "BENDING_SCHEDULE_RECEIVED":
      return email(`We've received your bar bending schedule ${s.reference}`, [
        { kind: "p", text: greeting(s.contactName) },
        { kind: "p", text: `Thanks — we've logged your cut & bend schedule as ${s.reference}. We'll price the steel, cutting and bending with a merchant and send you a written quote. Nothing is made or charged until you accept it.` },
        { kind: "rows", rows: scheduleRows(s) },
        ...(s.bySize.length ? [{ kind: "h" as const, text: "Mass by size" }, { kind: "rows" as const, rows: s.bySize }] : []),
        s.hasAccount
          ? { kind: "cta" as const, label: "Open your schedule", href: `${siteUrl()}/account/cut-and-bend/${s.id}` }
          : { kind: "p" as const, text: `To accept the quote online, create an account with this email address before you send your next schedule: ${siteUrl()}/account/register — or simply reply to our quote email.` },
        { kind: "p", text: `Reply to this email quoting ${s.reference} if anything on the schedule changes.` },
      ]);
    case "BENDING_SCHEDULE_QUOTED":
      if (s.quotedAmount === null) return null;
      return email(`Your cut & bend quote ${s.reference}: ${formatZAR(s.quotedAmount)}`, [
        { kind: "p", text: greeting(s.contactName) },
        { kind: "p", text: `Here's our quote for schedule ${s.reference}${s.projectName ? ` (${s.projectName})` : ""}.` },
        {
          kind: "rows",
          rows: [
            ["Quoted total", formatZAR(s.quotedAmount)],
            ...(s.quoteValidUntil ? ([["Valid until", s.quoteValidUntil]] as [string, string][]) : []),
            ...(s.lineCount ? ([["Steel by nominal mass", kg(s.totalMassKg)]] as [string, string][]) : []),
          ],
        },
        ...(s.quoteNotes ? [{ kind: "p" as const, text: s.quoteNotes }] : []),
        s.hasAccount
          ? { kind: "cta" as const, label: "Accept or decline the quote", href: `${siteUrl()}/account/cut-and-bend/${s.id}` }
          : { kind: "p" as const, text: `To go ahead, reply to this email quoting ${s.reference} and we'll confirm payment and the delivery slot.` },
        { kind: "p", text: "Bars are cut and bent to your schedule once you accept, so please check the bar marks, sizes and lengths before you do." },
      ]);
    default:
      return null;
  }
}

export function staffScheduleEmail(event: NotificationEvent, s: ScheduleData): EmailMessage | null {
  const who = s.companyName ?? s.contactName;
  const link = { kind: "cta" as const, label: "Open the schedule", href: `${siteUrl()}/admin/cut-and-bend/${s.id}` };
  switch (event) {
    case "BENDING_SCHEDULE_RECEIVED":
      return email(`New cut & bend schedule ${s.reference} — ${who}`, [
        { kind: "p", text: `${who} sent a bar bending schedule to price.` },
        {
          kind: "rows",
          rows: [
            ...scheduleRows(s),
            ["Contact", s.contactName],
            ["Email", s.contactEmail],
            ...(s.contactPhone ? ([["Phone", s.contactPhone]] as [string, string][]) : []),
            ...(s.province ? ([["Province", s.province]] as [string, string][]) : []),
            ...(s.siteAddress ? ([["Site", s.siteAddress]] as [string, string][]) : []),
          ],
        },
        ...(s.bySize.length ? [{ kind: "h" as const, text: "Mass by size" }, { kind: "rows" as const, rows: s.bySize }] : []),
        ...(s.message ? [{ kind: "p" as const, text: `Message: ${s.message}` }] : []),
        link,
      ]);
    case "BENDING_SCHEDULE_ACCEPTED":
      return email(`Cut & bend quote accepted — ${s.reference} (${who})`, [
        { kind: "p", text: `${who} accepted the quote${s.quotedAmount !== null ? ` of ${formatZAR(s.quotedAmount)}` : ""} for ${s.reference}. Confirm payment and the delivery slot, then release the schedule to the merchant.` },
        link,
      ]);
    case "BENDING_SCHEDULE_DECLINED":
      return email(`Cut & bend quote declined — ${s.reference} (${who})`, [
        { kind: "p", text: `${who} declined the quote for ${s.reference}. Follow up if a revised quote would help.` },
        link,
      ]);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Bookings (plant hire and site services). Partners never see the customer's
// contact details, and customers never see the partner's — only names.
// ---------------------------------------------------------------------------

const bookingRows = (b: BookingData): [string, string][] => [
  ["Booking", b.reference],
  ["What", `${b.itemName} — ${b.quantityLabel}`],
  ["When", b.startDate === b.endDate ? b.startDate : `${b.startDate} to ${b.endDate}`],
  ["Where", `${b.siteAddress}, ${b.province}`],
];

export function customerBookingEmail(event: NotificationEvent, b: BookingData): EmailMessage | null {
  const link = { kind: "cta" as const, label: "Open your booking", href: `${siteUrl()}/account/bookings/${b.id}` };
  switch (event) {
    case "BOOKING_QUOTED":
      return email(`Your quote ${b.reference}: ${formatZAR(b.customerTotal)}`, [
        { kind: "p", text: greeting(b.customerName) },
        { kind: "p", text: `Here's our quote for ${b.itemName}. It's based on a written quote from a vetted partner near your site.` },
        { kind: "rows", rows: [...bookingRows(b), ["Total", formatZAR(b.customerTotal)], ...(b.quoteValidUntil ? ([["Valid until", b.quoteValidUntil]] as [string, string][]) : [])] },
        { kind: "p", text: "Accept it online and we'll send the payment details. Nothing is booked until it's paid." },
        link,
      ]);
    case "BOOKING_PAYMENT_CONFIRMED":
      return email(`Payment received for ${b.reference}`, [
        { kind: "p", text: greeting(b.customerName) },
        { kind: "p", text: `We've received your payment of ${formatZAR(b.customerTotal)}. We're confirming a partner for your dates now and will email you when one is assigned.` },
        { kind: "rows", rows: bookingRows(b) },
        link,
      ]);
    case "BOOKING_PARTNER_ASSIGNED":
      return email(`${b.partnerName ?? "A partner"} will do your job ${b.reference}`, [
        { kind: "p", text: greeting(b.customerName) },
        { kind: "p", text: `${b.partnerName ?? "Our partner"} has accepted your booking. When the crew arrives, open your booking and give them the arrival code shown there — it starts the job.` },
        { kind: "rows", rows: bookingRows(b) },
        { kind: "p", text: "Please keep all messages with the crew in your booking's chat, so we can help if anything goes wrong." },
        link,
      ]);
    case "BOOKING_UNFULFILLED":
      return email(`We couldn't confirm a partner for ${b.reference}`, [
        { kind: "p", text: greeting(b.customerName) },
        { kind: "p", text: "None of our partners could take this job on your dates. Our team will contact you to offer other dates or refund your payment in full." },
        { kind: "rows", rows: bookingRows(b) },
        link,
      ]);
    default:
      return null;
  }
}

export function staffBookingEmail(event: NotificationEvent, b: BookingData): EmailMessage | null {
  const cta = { kind: "cta" as const, label: "Open the booking", href: `${siteUrl()}/admin/bookings/${b.id}` };
  switch (event) {
    case "BOOKING_UNFULFILLED":
      return email(`No partner for ${b.reference} — refund or re-quote`, [
        { kind: "p", text: `Every eligible partner declined or let the offer expire for ${b.reference}. The customer has paid: arrange other dates, add a partner and re-dispatch, or refund.` },
        { kind: "rows", rows: bookingRows(b) },
        cta,
      ]);
    case "BOOKING_COMPLETED":
      return email(`${b.reference} signed off`, [
        { kind: "p", text: `The customer signed off ${b.reference}. The partner payout of ${formatZAR(b.partnerAmount)} becomes due after the 48-hour dispute window.` },
        cta,
      ]);
    case "BOOKING_DISPUTED":
      return email(`Dispute on ${b.reference}`, [
        { kind: "p", text: `A dispute was raised on ${b.reference}. The partner payout is on hold until you resolve it.` },
        ...(b.disputeReason ? [{ kind: "p" as const, text: `Reason: ${b.disputeReason}` }] : []),
        { kind: "rows", rows: bookingRows(b) },
        cta,
      ]);
    case "PAYOUT_DUE":
      return email(`Payout due: ${formatZAR(b.partnerAmount)} to ${b.partnerName ?? "partner"} (${b.reference})`, [
        { kind: "p", text: `The dispute window for ${b.reference} has closed with no open dispute. Pay ${formatZAR(b.partnerAmount)} to ${b.partnerName ?? "the partner"} by EFT and record the payment reference.` },
        { kind: "cta", label: "Record the payout", href: `${siteUrl()}/admin/bookings?view=payouts` },
      ]);
    default:
      return null;
  }
}

/** Partner emails are operational (offers, sign-off, disputes, payouts), so they aren't switchable in the admin settings. */
export function partnerBookingEmail(event: NotificationEvent, b: BookingData): EmailMessage | null {
  const portal = { kind: "cta" as const, label: "Open the partner portal", href: `${siteUrl()}/partners/portal` };
  switch (event) {
    case "BOOKING_OFFERED":
      return email(`Job offer: ${b.itemName}, ${b.province} — reply within 30 minutes`, [
        { kind: "p", text: `You have a paid job offer. Accept or decline it in the partner portal within 30 minutes, or it goes to the next partner.` },
        { kind: "rows", rows: [...bookingRows(b), ["Your payout", formatZAR(b.partnerAmount)]] },
        portal,
      ]);
    case "BOOKING_COMPLETED":
      return email(`${b.reference} signed off by the customer`, [
        { kind: "p", text: `The customer signed off ${b.reference}. Your payout of ${formatZAR(b.partnerAmount)} is released after the 48-hour dispute window.` },
        portal,
      ]);
    case "BOOKING_DISPUTED":
      return email(`Dispute raised on ${b.reference}`, [
        { kind: "p", text: `A dispute was raised on ${b.reference}, so the payout is on hold while our team looks into it. We'll be in touch through the portal.` },
        portal,
      ]);
    case "PAYOUT_DUE":
      return email(`Payout released for ${b.reference}`, [
        { kind: "p", text: `Your payout of ${formatZAR(b.partnerAmount)} for ${b.reference} is released and will be paid by EFT to your confirmed account.` },
        portal,
      ]);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// WhatsApp (customer only, opt-in, template messages)
// ---------------------------------------------------------------------------

/** Template names and body texts to register in Meta Business Manager ({{n}} = params[n-1]). */
export const WHATSAPP_TEMPLATES = {
  // Meta rejects a template body that starts or ends with a variable, so each ends in fixed text.
  aa_order_confirmed: "Your Aggregated Aggregates order {{1}} is confirmed — payment received. Track it at {{2}} and we'll message you when it's dispatched.",
  aa_order_dispatched: "Your Aggregated Aggregates order {{1}} is on its way with {{2}} (tracking reference {{3}}). Track it at {{4}} and please make sure the site is accessible for a tipper truck.",
  aa_order_delivered: "Your Aggregated Aggregates order {{1}} has been delivered. Compliance documents are on your order record at {{2}} — thank you for your order.",
  aa_order_cancelled: "Your Aggregated Aggregates order {{1}} has been cancelled. If you've already paid, our team will contact you about a refund.",
  aa_quote_priced: "Your Aggregated Aggregates quote {{1}} is ready: {{2}}. We've emailed you the details — review and accept it at {{3}} or reply to our email.",
} as const;

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES;

function whatsapp(templateName: WhatsAppTemplateName, params: string[]): WhatsAppMessage {
  const text = WHATSAPP_TEMPLATES[templateName].replace(/\{\{(\d+)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? "");
  return { templateName, params, text };
}

export function customerOrderWhatsApp(event: NotificationEvent, o: OrderData): WhatsAppMessage | null {
  const track = `${siteUrl()}/orders/${o.id}/tracking`;
  switch (event) {
    case "ORDER_CONFIRMED":
      return whatsapp("aa_order_confirmed", [o.orderNumber, track]);
    case "ORDER_DISPATCHED":
      return whatsapp("aa_order_dispatched", [o.orderNumber, o.shipment ? carrierName(o.shipment) : "our delivery partner", o.shipment?.trackingRef ?? "to follow", track]);
    case "ORDER_DELIVERED":
      return whatsapp("aa_order_delivered", [o.orderNumber, `${siteUrl()}/orders/${o.id}/confirmation`]);
    case "ORDER_CANCELLED":
      return whatsapp("aa_order_cancelled", [o.orderNumber]);
    default:
      return null;
  }
}

export function customerQuoteWhatsApp(event: NotificationEvent, q: QuoteData): WhatsAppMessage | null {
  if (event !== "QUOTE_PRICED" || q.quotedTotal === null) return null;
  return whatsapp("aa_quote_priced", [q.reference, formatZAR(q.quotedTotal), q.hasAccount ? `${siteUrl()}/account/dashboard` : `${siteUrl()}/contact`]);
}

/** Which audiences and channels each event can reach — the admin toggles only switch these on and off. */
export const EVENT_CHANNELS: Record<NotificationEvent, { customerEmail: boolean; customerWhatsApp: boolean; staffEmail: boolean }> = {
  ORDER_PLACED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  ORDER_CONFIRMED: { customerEmail: true, customerWhatsApp: true, staffEmail: false },
  ORDER_DISPATCHED: { customerEmail: true, customerWhatsApp: true, staffEmail: false },
  ORDER_DELIVERED: { customerEmail: true, customerWhatsApp: true, staffEmail: false },
  ORDER_CANCELLED: { customerEmail: true, customerWhatsApp: true, staffEmail: false },
  QUOTE_RECEIVED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  QUOTE_PRICED: { customerEmail: true, customerWhatsApp: true, staffEmail: false },
  QUOTE_ACCEPTED: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  QUOTE_DECLINED: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  TRADE_APPLICATION_RECEIVED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  TRADE_APPLICATION_APPROVED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  TRADE_APPLICATION_DECLINED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  ENQUIRY_RECEIVED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  BOOKING_QUOTED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  BOOKING_PAYMENT_CONFIRMED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  BOOKING_OFFERED: { customerEmail: false, customerWhatsApp: false, staffEmail: false }, // partner email only
  BOOKING_PARTNER_ASSIGNED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  BOOKING_UNFULFILLED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  BOOKING_COMPLETED: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  BOOKING_DISPUTED: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  PAYOUT_DUE: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  WEEKLY_INSIGHTS: { customerEmail: false, customerWhatsApp: false, staffEmail: true }, // admins only, never the staff inbox list
  BENDING_SCHEDULE_RECEIVED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  BENDING_SCHEDULE_QUOTED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  BENDING_SCHEDULE_ACCEPTED: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  BENDING_SCHEDULE_DECLINED: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
};

/** Events that also email the partner (always on — offers can't wait for a setting). */
export const PARTNER_EVENTS: NotificationEvent[] = ["BOOKING_OFFERED", "BOOKING_COMPLETED", "BOOKING_DISPUTED", "PAYOUT_DUE"];

export const EVENT_LABEL: Record<NotificationEvent, string> = {
  ORDER_PLACED: "Order placed",
  ORDER_CONFIRMED: "Order confirmed (payment received)",
  ORDER_DISPATCHED: "Order dispatched",
  ORDER_DELIVERED: "Order delivered",
  ORDER_CANCELLED: "Order cancelled",
  QUOTE_RECEIVED: "Quote request received",
  QUOTE_PRICED: "Quote priced",
  QUOTE_ACCEPTED: "Quote accepted",
  QUOTE_DECLINED: "Quote declined",
  TRADE_APPLICATION_RECEIVED: "Trade application received",
  TRADE_APPLICATION_APPROVED: "Trade application approved",
  TRADE_APPLICATION_DECLINED: "Trade application declined",
  ENQUIRY_RECEIVED: "Hire, service or partner enquiry received",
  BOOKING_QUOTED: "Booking quoted",
  BOOKING_PAYMENT_CONFIRMED: "Booking payment received",
  BOOKING_OFFERED: "Job offered to a partner (partner email)",
  BOOKING_PARTNER_ASSIGNED: "Partner assigned to a booking",
  BOOKING_UNFULFILLED: "No partner for a booking",
  BOOKING_COMPLETED: "Booking signed off",
  BOOKING_DISPUTED: "Booking disputed",
  PAYOUT_DUE: "Partner payout due",
  WEEKLY_INSIGHTS: "Weekly sales & profit summary (admins, Monday 07:00)",
  BENDING_SCHEDULE_RECEIVED: "Cut & bend schedule received",
  BENDING_SCHEDULE_QUOTED: "Cut & bend schedule quoted",
  BENDING_SCHEDULE_ACCEPTED: "Cut & bend quote accepted",
  BENDING_SCHEDULE_DECLINED: "Cut & bend quote declined",
};

/** A South African or international number in the digits-only form WhatsApp expects, or null. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  let n = digits.startsWith("+") ? digits.slice(1) : digits.startsWith("00") ? digits.slice(2) : digits;
  if (/^0\d{9}$/.test(n)) n = `27${n.slice(1)}`; // 082 123 4567 -> 27821234567
  return /^[1-9]\d{9,14}$/.test(n) ? n : null;
}
