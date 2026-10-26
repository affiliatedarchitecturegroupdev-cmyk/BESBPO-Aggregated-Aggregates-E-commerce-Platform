import type { NotificationEvent, UnitOfSale } from "@aggregates/database";
import { formatDateZA, formatTimeZA, formatZAR, SELLER, UNIT_LABEL, type Money } from "../common/format";
import { vatRegistered } from "../tax/tax";

export { formatZAR };

// AA 60/120 (orders/express.ts), repeated here so templates stay free of service imports.
const EXPRESS_PREP = 20;
const EXPRESS_PROMISE = 120;

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
  /** Distributed Delivery Premium (docs/delivery-premium.md), when one applies. */
  ddpFee?: Money | null;
  total: Money;
  deliveryAddress: string | null;
  deliveryProvince: string | null;
  deliveryDistanceKm: number | null;
  customerName: string | null;
  companyName: string | null;
  lines: { name: string; quantity: number; unitOfSale: UnitOfSale | null; lineTotal: Money | null }[];
  shipment: { carrier: string; externalPartnerName: string | null; trackingRef: string | null } | null;
  /** How it was paid, for the receipt (ORDER_CONFIRMED). */
  payment?: { paidAt: Date | null; method: string | null; reference: string | null } | null;
  /** Payments ledger (docs/payments.md): what's been paid so far, and the plan (FULL, DEPOSIT, LAYBY). */
  amountPaid?: Money;
  paymentPlan?: string;
  /** The payment a receipt is for (ORDER_CONFIRMED, PAYMENT_RECEIVED). */
  lastPayment?: { amount: Money; kind: string; paidAt: Date | null; method: string | null; reference: string | null } | null;
  /** A payment link staff sent (PAYMENT_LINK_SENT). */
  payLink?: { url: string; amount: Money; kind: string; expiresAt: Date; note: string | null } | null;
  /** The tax invoice, once issued (INVOICE_ISSUED). */
  /** vatNumberBilled is set on a tax invoice, null on a plain invoice (docs/vat.md). */
  invoice?: { invoiceNumber: string; amountDue: Money; vatNumberBilled?: string | null } | null;
  /** Trade credit (docs/trade-credit.md): the order is on the company's account, due by this date. */
  account?: { dueAt: Date; termsDays: number | null } | null;
  /** Phased deliveries (DROP_DISPATCHED, DELIVERY_SIGNED): the drop this message is about. */
  drop?: { sequence: number; of: number; scheduledFor: Date; carrier: string | null; trackingRef: string | null; lines: OrderData["lines"]; next: Date | null } | null;
  /** Proof of delivery (DELIVERY_SIGNED). */
  proof?: { receivedBy: string; capturedAt: Date; exceptions: string | null; dropId: string | null } | null;
  /** AA 60/120: the fee (0 once declined before payment), when sales accepted it and when it's due. */
  express?: { fee: Money; acceptedAt: Date | null; dueAt: Date | null; declinedAt: Date | null; note: string | null } | null;
  /** Company accounts (docs/company-accounts.md): the buyer's purchase-order number. */
  purchaseOrderNumber?: string | null;
  /** A buyer's order above their limit: waiting for, or decided by, the company's approver. */
  approval?: { status: "AWAITING" | "APPROVED" | "DECLINED"; reason: string | null; decidedBy: string | null; note: string | null } | null;
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
  /** Trade credit (CREDIT_APPLIED, CREDIT_DECIDED). */
  credit?: { status: string; limit: Money | null; termsDays: number | null; notes: string | null; requested: { requestedLimit?: number; requestedTermsDays?: number } | null };
};

export type EnquiryData = {
  id: string;
  reference: string;
  kindLabel: string;
  /** A BAE design brief: answered with a fee proposal, not a supply quote. */
  design?: boolean;
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
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaggregates.store").replace(/\/+$/, "");
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

const DEFAULT_FOOTER = "You're receiving this because of an order, quote or account on aaggregates.store.";

// Brand colours (apps/web/tailwind.config.ts).
const BRAND = { basalt: "#1C1B1A", limestone: "#F2EFE9", slate: "#6B6560", blue: "#2C4A5E", ochre: "#C08A34", rule: "#E3DFD6", markBlue: "#3E6A85" };
const FONT = "Arial,Helvetica,sans-serif";

/**
 * The logo mark — the five-layer pyramid — drawn with table cells rather than
 * an image, so it shows even when the mail client blocks images.
 */
function logoMark(): string {
  const bars = [
    [10, BRAND.ochre],
    [15, BRAND.markBlue],
    [20, BRAND.markBlue],
    [25, BRAND.markBlue],
    [30, BRAND.markBlue],
  ] as const;
  const rows = bars
    .map(
      ([w, c]) =>
        `<tr><td align="center" style="padding:0 0 2px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="${w}" height="4" bgcolor="${c}" style="width:${w}px;height:4px;font-size:0;line-height:0;background:${c}">&nbsp;</td></tr></table></td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="width:40px;background:${BRAND.basalt};border:1px solid #3a3836;border-radius:6px"><tr><td style="padding:7px 4px 5px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table></td></tr></table>`;
}

function blockHtml(b: Block): string {
  if (b.kind === "h") return `<h2 style="margin:24px 0 8px;font-family:${FONT};font-size:16px;line-height:1.3;color:${BRAND.basalt}">${escapeHtml(b.text)}</h2>`;
  if (b.kind === "p") return `<p style="margin:0 0 16px">${escapeHtml(b.text)}</p>`;
  if (b.kind === "list") return `<ul style="margin:0 0 16px;padding-left:20px">${b.items.map((i) => `<li style="margin:0 0 4px">${escapeHtml(i)}</li>`).join("")}</ul>`;
  if (b.kind === "rows") {
    const rows = b.rows
      .map(([k, v]) => {
        const strong = /^(Total|Amount paid)$/i.test(k);
        const cell = `padding:6px 0;${strong ? `border-top:1px solid ${BRAND.rule};font-weight:700;color:${BRAND.basalt}` : ""}`;
        return `<tr><td style="${cell};padding-right:12px;color:${strong ? BRAND.basalt : BRAND.slate}">${escapeHtml(k)}</td><td style="${cell};text-align:right">${escapeHtml(v)}</td></tr>`;
      })
      .join("");
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin:0 0 16px">${rows}</table>`;
  }
  // A "bulletproof" button: a coloured table cell, so it renders as a button in Outlook too.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0"><tr><td bgcolor="${BRAND.blue}" style="background:${BRAND.blue};border-radius:2px"><a href="${escapeHtml(b.href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:700;color:${BRAND.limestone};text-decoration:none">${escapeHtml(b.label)}</a></td></tr></table>`;
}

/**
 * One branded layout for every email — header with the logo, a white card,
 * and the company footer — so the text and HTML bodies always say the same
 * thing. The first paragraph doubles as the inbox preview text.
 */
export function email(subject: string, blocks: Block[], footer = DEFAULT_FOOTER): EmailMessage {
  const site = siteUrl();
  const company = `${SELLER.tradingName} — a division of ${SELLER.legalName} (Reg. ${SELLER.registrationNumber}) · ${SELLER.addressLines.join(", ")} · ${SELLER.phone} · ${SELLER.email}`;
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
    company,
  ].join("\n\n");

  const preview = blocks.find((b): b is Extract<Block, { kind: "p" }> => b.kind === "p" && !/^Hi\b/.test(b.text))?.text ?? "";
  const links = [
    [site.replace(/^https?:\/\//, ""), site],
    ["Privacy Policy", `${site}/legal/privacy-policy`],
    ["Contact us", `${site}/contact`],
  ]
    .map(([label, href]) => `<a href="${escapeHtml(href)}" style="color:${BRAND.slate};text-decoration:underline">${escapeHtml(label)}</a>`)
    .join(" &nbsp;·&nbsp; ");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.limestone};font-family:${FONT};color:${BRAND.basalt};font-size:15px;line-height:1.55">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.limestone}">${escapeHtml(preview.slice(0, 140))}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${BRAND.limestone}" style="background:${BRAND.limestone}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;width:100%">
<tr><td bgcolor="${BRAND.basalt}" style="background:${BRAND.basalt};padding:18px 24px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="padding-right:12px">${logoMark()}</td><td valign="middle" style="font-family:${FONT};font-size:15px;font-weight:700;line-height:1.1;letter-spacing:.04em;color:${BRAND.limestone}"><a href="${escapeHtml(site)}" style="color:${BRAND.limestone};text-decoration:none">AGGREGATED<br>AGGREGATES</a></td></tr></table>
</td></tr>
<tr><td height="4" bgcolor="${BRAND.ochre}" style="height:4px;font-size:0;line-height:0;background:${BRAND.ochre}">&nbsp;</td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${BRAND.rule};border-top:0;padding:28px 24px 12px;font-family:${FONT};font-size:15px;line-height:1.55;color:${BRAND.basalt}">${blocks.map(blockHtml).join("")}</td></tr>
<tr><td style="padding:16px 8px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${BRAND.slate}">
<p style="margin:0 0 8px">${escapeHtml(footer)}</p>
<p style="margin:0 0 8px">${escapeHtml(company)}</p>
<p style="margin:0">${links}</p>
</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

function orderSummary(o: OrderData): Block[] {
  const rows: [string, string][] = [
    ["Materials", formatZAR(o.subtotal)],
    ["Delivery", Number(o.deliveryFee.toString()) === 0 ? "Included" : formatZAR(o.deliveryFee)],
    ...(o.ddpFee != null && Number(o.ddpFee.toString()) > 0 ? ([["Distributed delivery premium", formatZAR(o.ddpFee)]] as [string, string][]) : []),
    ...(o.express && Number(o.express.fee.toString()) > 0 ? ([["AA 60/120 express", formatZAR(o.express.fee)]] as [string, string][]) : []),
    ["Total", formatZAR(o.total)],
    ...(o.purchaseOrderNumber ? ([["Your PO number", o.purchaseOrderNumber]] as [string, string][]) : []),
  ];
  const where = o.deliveryAddress ? [{ kind: "p" as const, text: `Delivering to ${o.deliveryAddress}${o.deliveryProvince ? `, ${o.deliveryProvince}` : ""}.` }] : [];
  return [{ kind: "list", items: o.lines.map(lineText) }, { kind: "rows", rows }, ...where];
}

/** How each kind of payment is described to the customer. */
export const PAYMENT_KIND_LABEL: Record<string, string> = { FULL: "full amount", DEPOSIT: "deposit", BALANCE: "balance", INSTALMENT: "instalment" };

const balanceOf = (o: OrderData) => Math.max(0, Math.round((Number(o.total.toString()) - Number((o.amountPaid ?? o.total).toString())) * 100) / 100);

function paymentRows(p: { paidAt: Date | null; method: string | null; reference: string | null } | null | undefined): [string, string][] {
  return [
    ...(p?.paidAt ? ([["Paid on", formatDateZA(p.paidAt)]] as [string, string][]) : []),
    ...(p?.method ? ([["Payment method", p.method]] as [string, string][]) : []),
    ...(p?.reference ? ([["Payment reference", p.reference]] as [string, string][]) : []),
  ];
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
      if (o.approval?.status === "AWAITING") {
        return email(`Order ${o.orderNumber} received — waiting for your company's approval`, [
          hi,
          { kind: "p", text: `Thanks for your order. ${o.approval.reason ?? "It needs approval."} We've asked ${o.companyName ?? "your company"}'s approvers to approve it; once they do, we'll email you and it can be paid and confirmed with our partner supplier.` },
          ...orderSummary(o),
          track,
        ]);
      }
      return email(`Order ${o.orderNumber} received — choose how to pay`, [
        hi,
        {
          kind: "p",
          text: o.express
            ? `Thanks for your AA 60/120 order. Pay now by card or PayFast: once payment is in, our sales team confirms a supplier, then there's ${EXPRESS_PREP} minutes' loading prep and the ${EXPRESS_PROMISE}-minute delivery clock starts. We'll email you the time it's due.`
            : `Thanks for your order. Here's what you ordered — it's confirmed with our partner supplier once payment is received.`,
        },
        ...orderSummary(o),
        { kind: "cta", label: "Pay for your order", href: `${site}/orders/${o.id}/confirmation` },
      ]);
    case "ORDER_APPROVAL_REQUESTED":
      return email(`Approve order ${o.orderNumber} — ${formatZAR(o.total)}`, [
        { kind: "p", text: "Hi," },
        { kind: "p", text: `${o.customerName ?? "A buyer"} placed order ${o.orderNumber} on ${o.companyName ?? "your company"}'s trade account. ${o.approval?.reason ?? "It needs approval."} It can't be paid or confirmed until it's approved.` },
        ...orderSummary(o),
        { kind: "cta", label: "Approve or decline", href: `${site}/account/team#approvals` },
      ]);
    case "ORDER_APPROVAL_DECIDED":
      return o.approval?.status === "APPROVED"
        ? email(`Order ${o.orderNumber} approved — choose how to pay`, [
            hi,
            { kind: "p", text: `${o.approval.decidedBy ?? "Your company's approver"} approved order ${o.orderNumber}.${o.approval.note ? ` Their note: "${o.approval.note}"` : ""} It's confirmed with our partner supplier once payment is received, or charged to your company's trade account.` },
            ...orderSummary(o),
            { kind: "cta", label: "Pay for your order", href: `${site}/orders/${o.id}/confirmation` },
          ])
        : email(`Order ${o.orderNumber} wasn't approved`, [
            hi,
            { kind: "p", text: `${o.approval?.decidedBy ?? "Your company's approver"} declined order ${o.orderNumber}, so it has been cancelled.${o.approval?.note ? ` Their note: "${o.approval.note}"` : ""} Nothing has been charged.` },
            ...orderSummary(o),
          ]);
    case "ORDER_CONFIRMED": {
      if (o.account) {
        // On account: nothing paid yet — a confirmation with the due date, not a receipt.
        return email(`Order ${o.orderNumber} confirmed on your trade account`, [
          hi,
          { kind: "p", text: `Order ${o.orderNumber} is confirmed and charged to ${o.companyName ?? "your company"}'s trade account. The partner supplier nearest your site is preparing your load, and we'll let you know when it's dispatched.` },
          { kind: "rows", rows: [["Order", o.orderNumber], ["Amount on account", formatZAR(o.total)], ["Payment due by", formatDateZA(o.account.dueAt)], ...(o.account.termsDays ? ([["Terms", `${o.account.termsDays} days`]] as [string, string][]) : [])] },
          { kind: "h", text: "Your order" },
          ...orderSummary(o),
          { kind: "p", text: "Pay by EFT using the order number as the reference, or from your order page. Your invoice follows by email once our team issues it." },
          { kind: "cta", label: "View the order", href: `${site}/orders/${o.id}/confirmation` },
        ]);
      }
      // The payment receipt: what was paid, when and how, then the order. A deposit confirms the order too.
      const p = o.lastPayment ?? (o.payment ? { ...o.payment, amount: o.total, kind: "FULL" } : null);
      const balance = balanceOf(o);
      const receipt: [string, string][] = [
        [p?.kind === "DEPOSIT" ? "Deposit paid" : "Amount paid", formatZAR(p?.amount ?? o.total)],
        ...paymentRows(p),
        ["Order", o.orderNumber],
        ...(balance > 0.01 ? ([["Balance due before delivery", formatZAR(balance)]] as [string, string][]) : []),
      ];
      return email(`Payment receipt — order ${o.orderNumber} confirmed`, [
        hi,
        {
          kind: "p",
          text:
            balance > 0.01
              ? `Thank you — we've received your deposit and order ${o.orderNumber} is confirmed. The balance of ${formatZAR(balance)} is due before your load is dispatched; pay it any time from your order page, and we'll remind you before delivery.`
              : `Thank you — we've received your payment and order ${o.orderNumber} is confirmed. The partner supplier nearest your site is preparing your load, and we'll let you know when it's dispatched.`,
        },
        { kind: "h", text: "Payment receipt" },
        { kind: "rows", rows: receipt },
        { kind: "h", text: "Your order" },
        ...orderSummary(o),
        { kind: "p", text: "This is your payment receipt; your order confirmation is attached as a PDF. Your invoice follows by email once our team issues it, and both are always on your order page." },
        balance > 0.01 ? { kind: "cta", label: "Pay the balance", href: `${site}/orders/${o.id}/confirmation` } : track,
      ]);
    }
    case "PAYMENT_RECEIVED": {
      // A later payment on an order that's already confirmed: the balance after a deposit, or a payment link.
      const p = o.lastPayment;
      if (!p) return null;
      const balance = balanceOf(o);
      return email(`Payment receipt — ${formatZAR(p.amount)} for order ${o.orderNumber}`, [
        hi,
        {
          kind: "p",
          text:
            balance > 0.01
              ? `Thank you — we've received ${formatZAR(p.amount)} for order ${o.orderNumber}. ${formatZAR(balance)} is still to be paid before delivery.`
              : `Thank you — we've received ${formatZAR(p.amount)} and order ${o.orderNumber} is now paid in full. We'll let you know when it's dispatched.`,
        },
        { kind: "h", text: "Payment receipt" },
        {
          kind: "rows",
          rows: [
            ["Amount paid", formatZAR(p.amount)],
            ...paymentRows(p),
            ["Order", o.orderNumber],
            ["Order total", formatZAR(o.total)],
            ["Paid so far", formatZAR(o.amountPaid ?? p.amount)],
            ["Balance", balance > 0.01 ? formatZAR(balance) : "Paid in full"],
          ],
        },
        { kind: "p", text: "Your updated order confirmation is attached as a PDF." },
        balance > 0.01 ? { kind: "cta", label: "Pay the balance", href: `${site}/orders/${o.id}/confirmation` } : track,
      ]);
    }
    case "PAYMENT_LINK_SENT": {
      const link = o.payLink;
      if (!link) return null;
      const what = PAYMENT_KIND_LABEL[link.kind] ?? "payment";
      return email(`Pay for order ${o.orderNumber} — ${formatZAR(link.amount)}`, [
        hi,
        { kind: "p", text: `Here's a secure link to pay the ${what} of ${formatZAR(link.amount)} for order ${o.orderNumber}. You don't need to sign in, and you can choose how to pay on the page.` },
        ...(link.note ? [{ kind: "p" as const, text: link.note }] : []),
        { kind: "rows", rows: [["Order", o.orderNumber], ["To pay now", formatZAR(link.amount)], ["Order total", formatZAR(o.total)], ["Link valid until", formatDateZA(link.expiresAt)]] },
        { kind: "cta", label: `Pay ${formatZAR(link.amount)}`, href: link.url },
        { kind: "p", text: "The page also has a proforma invoice to download if your accounts team needs one to pay. Didn't expect this email? Reply and our team will help." },
      ]);
    }
    case "INVOICE_ISSUED":
      if (!o.invoice) return null;
      return email(`${o.invoice.vatNumberBilled ? "Tax invoice" : "Invoice"} ${o.invoice.invoiceNumber} — order ${o.orderNumber}`, [
        hi,
        { kind: "p", text: `Your ${o.invoice.vatNumberBilled ? "tax invoice" : "invoice"} ${o.invoice.invoiceNumber} for order ${o.orderNumber} is attached as a PDF.` },
        { kind: "rows", rows: [["Invoice", o.invoice.invoiceNumber], ["Order", o.orderNumber], ["Total", formatZAR(o.invoice.amountDue)]] },
        { kind: "cta", label: "View the order", href: `${site}/orders/${o.id}/confirmation` },
        { kind: "p", text: "Keep it for your records — it's also on your order page whenever you need it." },
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
    case "DROP_DISPATCHED": {
      const d = o.drop;
      if (!d) return null;
      const carrier = d.carrier === "BESFLEET" ? "Besfleet" : d.carrier ? "our delivery partner" : null;
      return email(`Order ${o.orderNumber}: delivery ${d.sequence} of ${d.of} is on its way`, [
        hi,
        { kind: "p", text: `Delivery ${d.sequence} of ${d.of} for order ${o.orderNumber} has left${carrier ? ` with ${carrier}` : ""}.${d.trackingRef ? ` Tracking reference: ${d.trackingRef}.` : ""}` },
        { kind: "list", items: d.lines.map(lineText) },
        ...(o.deliveryAddress ? [{ kind: "p" as const, text: `Delivering to ${o.deliveryAddress}${o.deliveryProvince ? `, ${o.deliveryProvince}` : ""}. Please have someone on site to receive and sign for it.` }] : []),
        ...(d.next ? [{ kind: "p" as const, text: `Your next delivery is planned for ${formatDateZA(d.next)}.` }] : []),
        track,
      ]);
    }
    case "DELIVERY_SIGNED": {
      const p = o.proof;
      if (!p) return null;
      const which = o.drop ? `Delivery ${o.drop.sequence} of ${o.drop.of} for order ${o.orderNumber}` : `Order ${o.orderNumber}`;
      return email(`${which} signed for`, [
        hi,
        { kind: "p", text: `${which} was received and signed for on site.` },
        { kind: "rows", rows: [["Signed by", p.receivedBy], ["When", `${formatDateZA(p.capturedAt)} ${formatTimeZA(p.capturedAt)}`], ...(p.exceptions ? ([["Noted on delivery", p.exceptions]] as [string, string][]) : [])] },
        { kind: "p", text: p.exceptions ? "Our team will be in touch about what was noted on delivery." : "The signature and delivery photo are on your order page." },
        { kind: "cta", label: "View the proof of delivery", href: `${site}/orders/${o.id}/tracking` },
      ]);
    }
    case "ORDER_DELIVERED":
      return email(`Order ${o.orderNumber} delivered`, [
        hi,
        { kind: "p", text: `Your order ${o.orderNumber} has been delivered. Compliance documents for the materials are on your order record.` },
        { kind: "cta", label: "View your order", href: `${site}/orders/${o.id}/confirmation` },
        { kind: "p", text: "Something not right with the delivery? Reply to this email and our team will help." },
      ]);
    case "EXPRESS_ACCEPTED":
      if (!o.express?.dueAt) return null;
      return email(`AA 60/120: order ${o.orderNumber} is due by ${formatTimeZA(o.express.dueAt)}`, [
        hi,
        {
          kind: "p",
          text: `Your AA 60/120 delivery is confirmed. The supplier is loading now (${EXPRESS_PREP} minutes' prep), and your order is due on site by ${formatTimeZA(o.express.dueAt)} — within ${EXPRESS_PROMISE} minutes of the clock starting.`,
        },
        ...(o.express.note ? [{ kind: "p" as const, text: o.express.note }] : []),
        ...(o.deliveryAddress ? [{ kind: "p" as const, text: `Delivering to ${o.deliveryAddress}${o.deliveryProvince ? `, ${o.deliveryProvince}` : ""}. Please have someone on site to receive it.` }] : []),
        { kind: "p", text: `If we're more than an hour late, we refund the ${formatZAR(o.express.fee)} express fee.` },
        track,
      ]);
    case "EXPRESS_DECLINED": {
      if (!o.express) return null;
      const paid = Number(o.express.fee.toString()) > 0;
      return email(`Order ${o.orderNumber}: standard delivery instead of AA 60/120`, [
        hi,
        { kind: "p", text: `We're sorry — we can't deliver order ${o.orderNumber} on AA 60/120 this time.${o.express.note ? ` ${o.express.note}` : ""}` },
        {
          kind: "p",
          text: paid
            ? `Your order goes ahead with standard delivery, and we're refunding the ${formatZAR(o.express.fee)} express fee in full to the card or account you paid from. Our team will confirm the delivery date with you.`
            : `Your order goes ahead with standard delivery, and the express fee has been taken off — the amount to pay is now ${formatZAR(o.total)}.`,
        },
        paid ? track : { kind: "cta", label: "Pay for your order", href: `${site}/orders/${o.id}/confirmation` },
      ]);
    }
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

/** A sales quotation (docs/sales-quotes.md), emailed from the admin panel with its PDF attached. */
export type QuotationEmailData = {
  quoteNumber: string;
  contactName: string | null;
  total: Money;
  validUntil: Date | null;
  lines: { name: string; quantity: number; unitOfSale: UnitOfSale }[];
  url: string;
  preparedBy: string | null;
  message: string | null;
};

export function quotationEmail(q: QuotationEmailData): EmailMessage {
  const site = siteUrl();
  return email(`Quotation ${q.quoteNumber} from ${SELLER.tradingName} — ${formatZAR(q.total)}`, [
    { kind: "p", text: greeting(q.contactName) },
    { kind: "p", text: `Thank you for your enquiry. Your quotation ${q.quoteNumber} is attached as a PDF.` },
    ...(q.message ? [{ kind: "p" as const, text: q.message }] : []),
    { kind: "list", items: q.lines.map(lineText) },
    { kind: "rows", rows: [["Quotation", q.quoteNumber], [vatRegistered() ? "Total (VAT inclusive, delivered)" : "Total amount payable (delivered)", formatZAR(q.total)], ...(q.validUntil ? ([["Valid until", formatDateZA(q.validUntil)]] as [string, string][]) : [])] },
    { kind: "cta", label: "View, accept and pay", href: q.url },
    { kind: "p", text: `You can accept it and pay online with the button above — no account needed. Prefer to talk first? Reply to this email or call ${SELLER.phone}${q.preparedBy ? ` and ask for ${q.preparedBy}` : ""}.` },
    { kind: "p", text: `Browse everything else we deliver at ${site}.` },
  ]);
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
    case "CREDIT_APPLIED": {
      const r = c.credit?.requested;
      return email(`Trade credit application received — ${c.name}`, [
        hi,
        { kind: "p", text: `Thanks — we've received ${c.name}'s application for trade credit${r?.requestedLimit ? ` of ${formatZAR(r.requestedLimit)}` : ""}${r?.requestedTermsDays ? ` on ${r.requestedTermsDays}-day terms` : ""}. Our team reviews applications within three business days and may contact your trade references. Until then, orders are paid as usual.` },
        { kind: "cta", label: "Your trade account", href: `${site}/account/credit` },
      ]);
    }
    case "CREDIT_DECIDED": {
      const cr = c.credit;
      if (!cr) return null;
      if (cr.status === "APPROVED") {
        return email(`Trade credit approved — ${c.name}`, [
          hi,
          { kind: "p", text: `${c.name} can now order on account. At checkout, choose "Trade account (pay on terms)": the order is confirmed and delivered, and each order is due within your terms.` },
          { kind: "rows", rows: [["Credit limit", cr.limit !== null ? formatZAR(cr.limit) : "—"], ["Payment terms", cr.termsDays ? `${cr.termsDays} days from confirmation` : "—"]] },
          ...(cr.notes ? [{ kind: "p" as const, text: cr.notes }] : []),
          { kind: "p", text: "If an order on account becomes overdue, new orders can't go on account until it's paid." },
          { kind: "cta", label: "Your trade account", href: `${site}/account/credit` },
        ]);
      }
      if (cr.status === "SUSPENDED") {
        return email(`Trade credit suspended — ${c.name}`, [
          hi,
          { kind: "p", text: `New orders for ${c.name} can't go on account for now. Orders already on account are still due on their terms, and you can keep ordering and paying as usual.` },
          ...(cr.notes ? [{ kind: "p" as const, text: `Note from our team: ${cr.notes}` }] : []),
          { kind: "p", text: "Questions? Reply to this email and our team will help." },
        ]);
      }
      if (cr.status !== "DECLINED") return null;
      return email(`Your trade credit application — ${c.name}`, [
        hi,
        { kind: "p", text: `We weren't able to offer ${c.name} trade credit at this stage. Your trade pricing is unchanged, and you can keep ordering and paying as usual — including by deposit on larger orders.` },
        ...(cr.notes ? [{ kind: "p" as const, text: `Note from our team: ${cr.notes}` }] : []),
      ]);
    }
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
  const who = o.companyName ?? o.customerName ?? "A customer";
  if (event === "EXPRESS_PAID") {
    return email(`AA 60/120 PAID — ${o.orderNumber}: confirm a supplier now`, [
      { kind: "p", text: `${who} has paid for AA 60/120 order ${o.orderNumber}. Call or email the nearest partner supplier to confirm they can load it, then accept it in admin — that starts the ${EXPRESS_PREP}-minute prep and the ${EXPRESS_PROMISE}-minute clock. If no supplier can, decline it: it goes by standard delivery and the express fee is refunded.` },
      ...orderSummary(o),
      ...(o.deliveryDistanceKm !== null ? [{ kind: "p" as const, text: `Nearest supplier distance: ${o.deliveryDistanceKm}km.` }] : []),
      { kind: "cta", label: "Accept or decline in admin", href: `${siteUrl()}/admin/orders?express=1` },
    ]);
  }
  if (event === "PAYMENT_RECEIVED" && o.lastPayment) {
    const balance = balanceOf(o);
    return email(`Payment ${formatZAR(o.lastPayment.amount)} received — ${o.orderNumber}${balance > 0.01 ? "" : " (paid in full)"}`, [
      {
        kind: "p",
        text: `${who} paid ${formatZAR(o.lastPayment.amount)} on order ${o.orderNumber}${o.lastPayment.method ? ` by ${o.lastPayment.method}` : ""}. ${balance > 0.01 ? `${formatZAR(balance)} is still outstanding — it must be paid before dispatch.` : "It's paid in full and can be dispatched."}`,
      },
      { kind: "cta", label: "Open in admin", href: `${siteUrl()}/admin/orders` },
    ]);
  }
  if (event === "DELIVERY_SIGNED" && o.proof) {
    const which = o.drop ? `drop ${o.drop.sequence} of ${o.drop.of} on ${o.orderNumber}` : o.orderNumber;
    return email(`${o.proof.exceptions ? "Delivery EXCEPTION — " : "Signed for — "}${which}`, [
      { kind: "p", text: `${o.proof.receivedBy} signed for ${which} (${who}) at ${formatTimeZA(o.proof.capturedAt)}.${o.proof.exceptions ? ` They noted: ${o.proof.exceptions}` : ""}` },
      { kind: "cta", label: "Open the deliveries", href: `${siteUrl()}/admin/orders/${o.id}/deliveries` },
    ]);
  }
  if (event !== "ORDER_PLACED") return null;
  return email(`${o.express ? "AA 60/120 express — " : ""}New order ${o.orderNumber} — ${formatZAR(o.total)}`, [
    { kind: "p", text: `${who} placed ${o.express ? "AA 60/120 express " : ""}order ${o.orderNumber}. It's awaiting payment${o.express ? " by card or PayFast — you'll get another email when it's paid" : ""}.` },
    ...orderSummary(o),
    ...(o.deliveryDistanceKm !== null ? [{ kind: "p" as const, text: `Delivery distance: ${o.deliveryDistanceKm}km (confirm road distance at dispatch).` }] : []),
    { kind: "cta", label: "Open in admin", href: `${siteUrl()}/admin/orders` },
  ]);
}

/** Staff: a payment gateway is failing (or was paused), so its methods are using their fallback. */
export function gatewayDegradedEmail(g: { gateway: string; reason: string; startedAt: Date; until: Date | null; fallbacks: string[] }): EmailMessage {
  return email(`Payments: ${g.gateway} is failing — customers are being sent to the fallback`, [
    { kind: "p", text: `${g.gateway} ${g.until ? "has failed repeatedly" : "was paused"} (${g.reason}). Since ${formatTimeZA(g.startedAt)}, new payments for its methods go to their fallback gateway${g.until ? ` until ${formatTimeZA(g.until)}, when ${g.gateway} is tried again` : " until an admin resumes it"}.` },
    ...(g.fallbacks.length ? [{ kind: "list" as const, items: g.fallbacks }] : [{ kind: "p" as const, text: "None of its methods has a fallback set, so they can't be paid online until it recovers. Set fallbacks on Admin → Payments." }]),
    { kind: "cta", label: "Payments health in admin", href: `${siteUrl()}/admin/payments` },
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

/** The supplier portal: an order assigned to the supplier to load. No customer contact details or prices. */
export function supplierOrderEmail(o: OrderData, supplierName: string): EmailMessage {
  const site = siteUrl();
  return email(`Order to load: ${o.orderNumber}`, [
    { kind: "p", text: `Hi ${supplierName} team,` },
    { kind: "p", text: `Aggregated Aggregates has an order for you to load: ${o.orderNumber}${o.deliveryProvince ? `, delivering in ${o.deliveryProvince}` : ""}. Please confirm in the supplier portal whether you can load it, and from when.` },
    { kind: "list", items: o.lines.map(lineText) },
    { kind: "cta", label: "Open the supplier portal", href: `${site}/suppliers/portal/orders/${o.id}` },
    { kind: "p", text: "Questions about the order go to our team — reply to this email." },
  ], "You're receiving this as a partner supplier of Aggregated Aggregates (aaggregates.store).");
}

/** Staff: the uptime monitor found a dependency failing, or recovered. */
export function serviceDownEmail(s: { down: string[]; recovered: string[]; detail: [string, string][]; at: Date }): EmailMessage {
  const subject = s.down.length ? `Site check FAILING: ${s.down.join(", ")}` : `Site check recovered: ${s.recovered.join(", ")}`;
  return email(subject, [
    { kind: "p", text: s.down.length ? `At ${formatTimeZA(s.at)} the API's health check found ${s.down.join(", ")} not working. Customers may not be able to order or pay until it's fixed.` : `At ${formatTimeZA(s.at)} ${s.recovered.join(", ")} ${s.recovered.length === 1 ? "is" : "are"} working again.` },
    { kind: "rows", rows: s.detail },
    { kind: "p", text: "Check the service's logs and status on Render (and Supabase for storage). This email repeats only when something changes." },
  ]);
}

/** Staff: a supplier uploaded its price list in the supplier portal (docs/supplier-prices.md). Costs aren't in the email. */
export function priceListUploadedEmail(l: { supplierName: string; rows: number; waiting: number; unmatched: number; validUntil: Date | null; listId: string }): EmailMessage {
  return email(`Price list from ${l.supplierName} — ${l.waiting} price${l.waiting === 1 ? "" : "s"} to approve`, [
    {
      kind: "p",
      text: `${l.supplierName} uploaded a price list in the supplier portal: ${l.rows} row${l.rows === 1 ? "" : "s"}, ${l.waiting} matched and waiting for approval, ${l.unmatched} that need a product. Nothing changes on the store until you approve it.`,
    },
    { kind: "rows", rows: [["Supplier", l.supplierName], ["Prices valid until", l.validUntil ? formatDateZA(l.validUntil) : "Not given"]] },
    { kind: "cta", label: "Review the price list", href: `${siteUrl()}/admin/supplier-prices/${l.listId}` },
  ]);
}

export function staffCompanyEmail(event: NotificationEvent, c: CompanyData): EmailMessage | null {
  if (event === "CREDIT_APPLIED") {
    const r = c.credit?.requested;
    return email(`Trade credit application — ${c.name}`, [
      { kind: "p", text: `${c.applicantName ?? c.applicantEmail ?? "A company admin"} applied for trade credit for ${c.name}${r?.requestedLimit ? `: ${formatZAR(r.requestedLimit)}` : ""}${r?.requestedTermsDays ? ` on ${r.requestedTermsDays}-day terms` : ""}. Check the trade references before approving a limit.` },
      { kind: "cta", label: "Review the application", href: `${siteUrl()}/admin/credit` },
    ]);
  }
  if (event !== "TRADE_APPLICATION_RECEIVED") return null;
  return email(`Trade account application — ${c.name}`, [
    { kind: "p", text: `${c.applicantName ?? c.applicantEmail ?? "A customer"} applied for a ${c.requestedTierLabel ?? "trade"} account for ${c.name}.` },
    { kind: "cta", label: "Review the application", href: `${siteUrl()}/admin/applications` },
  ]);
}

export function customerEnquiryEmail(event: NotificationEvent, e: EnquiryData): EmailMessage | null {
  if (event !== "ENQUIRY_RECEIVED") return null;
  if (e.design) {
    return email(`We've received your design brief ${e.reference}`, [
      { kind: "p", text: greeting(e.contactName) },
      {
        kind: "p",
        text: `Thanks — we've logged your brief "${e.subject}" as ${e.reference}. Bellwether Architecture & Engineering will review it and send you a fee proposal and terms of engagement. Nothing is charged until you accept the proposal.`,
      },
      ...(e.details.length ? [{ kind: "rows" as const, rows: e.details }] : []),
      { kind: "p", text: `Reply to this email quoting ${e.reference} with any drawings, title deed or site photos you have, or if anything changes.` },
    ]);
  }
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
  QUOTATION_SENT: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
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
  INVOICE_ISSUED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  // System emails: always sent, never switched off, and their links are never stored (account-emails.ts).
  PASSWORD_RESET: { customerEmail: false, customerWhatsApp: false, staffEmail: false },
  EMAIL_VERIFICATION: { customerEmail: false, customerWhatsApp: false, staffEmail: false },
  NEWSLETTER_CONFIRMATION: { customerEmail: false, customerWhatsApp: false, staffEmail: false },
  EXPRESS_PAID: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  EXPRESS_ACCEPTED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  EXPRESS_DECLINED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  PAYMENT_RECEIVED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  PAYMENT_LINK_SENT: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  GATEWAY_DEGRADED: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  DROP_DISPATCHED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  DELIVERY_SIGNED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  CREDIT_APPLIED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  CREDIT_DECIDED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  SUPPLIER_ORDER: { customerEmail: false, customerWhatsApp: false, staffEmail: true }, // the supplier's email is always sent; staff hear its answer
  SERVICE_DOWN: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  PRICE_LIST_UPLOADED: { customerEmail: false, customerWhatsApp: false, staffEmail: true },
  COMPANY_INVITE: { customerEmail: false, customerWhatsApp: false, staffEmail: false },
  ORDER_APPROVAL_REQUESTED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  ORDER_APPROVAL_DECIDED: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  PROJECT_RECEIVED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  PROJECT_PROPOSAL_SENT: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
  PROJECT_ACCEPTED: { customerEmail: true, customerWhatsApp: false, staffEmail: true },
  PROJECT_MILESTONE_PAID: { customerEmail: true, customerWhatsApp: false, staffEmail: false },
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
  QUOTATION_SENT: "Quotation sent (sales)",
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
  INVOICE_ISSUED: "Invoice issued",
  PASSWORD_RESET: "Password reset link (always sent)",
  EMAIL_VERIFICATION: "Email address verification (always sent)",
  NEWSLETTER_CONFIRMATION: "Newsletter sign-up confirmation (always sent)",
  EXPRESS_PAID: "AA 60/120 order paid — confirm a supplier",
  EXPRESS_ACCEPTED: "AA 60/120 accepted (due time)",
  EXPRESS_DECLINED: "AA 60/120 declined (standard delivery, fee refunded)",
  PAYMENT_RECEIVED: "Payment received on a confirmed order (balance, payment link)",
  PAYMENT_LINK_SENT: "Payment link sent to a customer",
  GATEWAY_DEGRADED: "Payment gateway failing — fallback in use",
  DROP_DISPATCHED: "Phased order: a delivery is on its way",
  DELIVERY_SIGNED: "Proof of delivery signed (staff: flagged if anything was noted)",
  CREDIT_APPLIED: "Trade credit application received",
  CREDIT_DECIDED: "Trade credit approved, declined or suspended",
  SUPPLIER_ORDER: "Order sent to a supplier (supplier email); staff hear its answer",
  SERVICE_DOWN: "Site check failing or recovered (uptime monitor)",
  PRICE_LIST_UPLOADED: "A supplier uploaded a price list in the supplier portal",
  COMPANY_INVITE: "Invitation to join a company account (always sent)",
  ORDER_APPROVAL_REQUESTED: "A buyer's order needs the company's approval (to its approvers)",
  ORDER_APPROVAL_DECIDED: "A company approver approved or declined an order (to the buyer)",
  PROJECT_RECEIVED: "A design-and-build brief was received (complete roofs)",
  PROJECT_PROPOSAL_SENT: "A design-and-build proposal was sent to the client",
  PROJECT_ACCEPTED: "The client accepted a design-and-build proposal",
  PROJECT_MILESTONE_PAID: "A project stage payment was recorded (receipt to the client)",
};

/** A South African or international number in the digits-only form WhatsApp expects, or null. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  let n = digits.startsWith("+") ? digits.slice(1) : digits.startsWith("00") ? digits.slice(2) : digits;
  if (/^0\d{9}$/.test(n)) n = `27${n.slice(1)}`; // 082 123 4567 -> 27821234567
  return /^[1-9]\d{9,14}$/.test(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Design-and-build projects (docs/projects.md)
// ---------------------------------------------------------------------------

export type ProjectData = {
  id: string;
  reference: string;
  packageLabel: string;
  contactName: string | null;
  contactEmail: string;
  province: string;
  siteAddress: string | null;
  /** One line about the brief, e.g. "Gable roof, 12 × 8 m, concrete tiles". */
  summary: string;
  total: Money | null;
  /** PROJECT_PROPOSAL_SENT: the client's link (never stored). */
  proposalUrl?: string | null;
  validUntil?: Date | null;
  milestones?: { label: string; amount: Money; status: string }[];
  /** PROJECT_MILESTONE_PAID: the payment just recorded. */
  paid?: { label: string; amount: Money; reference: string | null } | null;
};

export function customerProjectEmail(event: NotificationEvent, p: ProjectData): EmailMessage | null {
  const site = siteUrl();
  const hi = { kind: "p" as const, text: greeting(p.contactName) };
  const schedule = (p.milestones ?? []).map((m) => `${m.label}: ${formatZAR(m.amount)}${m.status === "PAID" ? " (paid)" : ""}`);
  switch (event) {
    case "PROJECT_RECEIVED":
      return email(`${p.packageLabel} ${p.reference} — we've received your brief`, [
        hi,
        { kind: "p", text: `Thanks — we've received your brief for ${p.summary.charAt(0).toLowerCase()}${p.summary.slice(1)} in ${p.province}. Our design team looks at it and comes back to you, usually within two working days, with any questions and the next steps.` },
        { kind: "p", text: "The quantities you saw are indicative. Your proposal is priced from the engineer's design and our partners' quotes for fabrication and installation, with a schedule of stage payments." },
        { kind: "rows", rows: [["Reference", p.reference]] },
      ]);
    case "PROJECT_PROPOSAL_SENT":
      if (!p.proposalUrl || p.total === null) return null;
      return email(`Your ${p.packageLabel.toLowerCase()} proposal ${p.reference} — ${formatZAR(p.total)}`, [
        hi,
        { kind: "p", text: `Here's our proposal for ${p.summary.charAt(0).toLowerCase()}${p.summary.slice(1)}: design, materials, fabrication and installation as one package.` },
        { kind: "rows", rows: [["Reference", p.reference], ["Total", formatZAR(p.total)], ...(p.validUntil ? ([["Valid until", formatDateZA(p.validUntil)]] as [string, string][]) : [])] },
        ...(schedule.length ? [{ kind: "p" as const, text: "Payments by stage:" }, { kind: "list" as const, items: schedule }] : []),
        { kind: "cta", label: "View and accept the proposal", href: p.proposalUrl },
      ]);
    case "PROJECT_ACCEPTED":
      return email(`${p.packageLabel} ${p.reference} — thank you for accepting`, [
        hi,
        { kind: "p", text: `Thank you for accepting proposal ${p.reference}. The first stage payment is now due; we start the design and order what your project needs once it's in. Pay by EFT using ${p.reference} as the reference — we'll confirm each payment by email.` },
        ...(schedule.length ? [{ kind: "list" as const, items: schedule }] : []),
        { kind: "cta", label: "View your project", href: `${site}/account/projects` },
      ]);
    case "PROJECT_MILESTONE_PAID":
      if (!p.paid) return null;
      return email(`Payment received — ${p.reference}`, [
        hi,
        { kind: "p", text: `We've received ${formatZAR(p.paid.amount)} for "${p.paid.label}" on project ${p.reference}. Thank you.` },
        ...(p.paid.reference ? [{ kind: "rows" as const, rows: [["Payment reference", p.paid.reference]] as [string, string][] }] : []),
        ...(schedule.length ? [{ kind: "list" as const, items: schedule }] : []),
      ]);
    default:
      return null;
  }
}

export function staffProjectEmail(event: NotificationEvent, p: ProjectData): EmailMessage | null {
  const admin = `${siteUrl()}/admin/projects/${p.id}`;
  switch (event) {
    case "PROJECT_RECEIVED":
      return email(`New ${p.packageLabel.toLowerCase()} brief ${p.reference} — ${p.province}`, [
        { kind: "p", text: `${p.contactName ?? p.contactEmail} sent a brief: ${p.summary}.${p.siteAddress ? ` Site: ${p.siteAddress}, ${p.province}.` : ` Province: ${p.province}.`}` },
        { kind: "cta", label: "Open the project", href: admin },
      ]);
    case "PROJECT_ACCEPTED":
      return email(`ACCEPTED — ${p.reference}${p.total !== null ? ` (${formatZAR(p.total)})` : ""}`, [
        { kind: "p", text: `${p.contactName ?? p.contactEmail} accepted the proposal for ${p.summary.charAt(0).toLowerCase()}${p.summary.slice(1)}. The first stage payment is due — record it when it comes in, then start the design and order from the partners.` },
        { kind: "cta", label: "Open the project", href: admin },
      ]);
    default:
      return null;
  }
}
