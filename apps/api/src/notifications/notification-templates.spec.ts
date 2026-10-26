import { NotificationEvent } from "@aggregates/database";
import {
  customerCompanyEmail,
  customerProjectEmail,
  staffProjectEmail,
  type ProjectData,
  quotationEmail,
  customerBookingEmail,
  customerEnquiryEmail,
  customerOrderEmail,
  customerOrderWhatsApp,
  customerQuoteEmail,
  customerQuoteWhatsApp,
  customerScheduleEmail,
  EVENT_CHANNELS,
  supplierOrderEmail,
  formatZAR,
  staffCompanyEmail,
  partnerBookingEmail,
  PARTNER_EVENTS,
  staffBookingEmail,
  staffEnquiryEmail,
  staffOrderEmail,
  staffQuoteEmail,
  staffScheduleEmail,
  whatsappNumber,
  WHATSAPP_TEMPLATES,
  type CompanyData,
  type BookingData,
  type EnquiryData,
  type OrderData,
  type QuoteData,
  type ScheduleData,
} from "./notification-templates";

const order: OrderData = {
  id: "ord_1",
  orderNumber: "AA-100",
  status: "PENDING",
  subtotal: "7333.12",
  deliveryFee: "1800.00",
  total: "9133.12",
  deliveryAddress: "12 Quarry Rd <b>Hilton</b>",
  deliveryProvince: "KwaZulu-Natal",
  deliveryDistanceKm: 67.3,
  customerName: "Thandi <script>alert(1)</script> Mokoena",
  companyName: null,
  lines: [{ name: "19mm Crushed Stone", quantity: 12, unitOfSale: "BULK_TON", lineTotal: "5000.00" }],
  shipment: { carrier: "BESFLEET", externalPartnerName: null, trackingRef: "BF-2044" },
};

const baseOrder = order;

/** Delivery 2 of 3 of a phased order, signed for with a shortage noted. */
const phasedOrder: OrderData = {
  ...order,
  status: "IN_TRANSIT",
  drop: { sequence: 2, of: 3, scheduledFor: new Date("2026-11-03T00:00:00Z"), carrier: "BESFLEET", trackingRef: "BF-9", lines: [{ name: "19mm Crushed Stone", quantity: 6, unitOfSale: "BULK_TON", lineTotal: null }], next: new Date("2026-11-10T00:00:00Z") },
  proof: { receivedBy: "J. Naidoo", capturedAt: new Date("2026-11-03T08:15:00Z"), exceptions: "One bag torn", dropId: "drop_2" },
};

const invoicedOrder: OrderData = { ...order, invoice: { invoiceNumber: "AAI-000042", amountDue: "9133.12" } };

/** An AA 60/120 order, accepted at 10:00 SAST — due at 12:20. */
const expressOrder: OrderData = {
  ...order,
  total: "10133.12",
  express: { fee: "1000.00", acceptedAt: new Date("2026-10-14T08:00:00Z"), dueAt: new Date("2026-10-14T10:20:00Z"), declinedAt: null, note: null },
};

const quote: QuoteData = {
  id: "q_1",
  reference: "Q-7K2M",
  contactName: "Sipho",
  companyName: "Coastal Civils",
  projectName: "N2 widening",
  deliveryAddress: "Ballito",
  estimatedSubtotal: "120000",
  quotedTotal: "134500.5",
  staffNotes: null,
  reasons: ["Volume/Civil Bulk order of 10m³ or more"],
  hasAccount: true,
  lines: [{ name: "G5 Subbase", quantity: 400, unitOfSale: "BULK_M3" }],
};

const project: ProjectData = {
  id: "p1",
  reference: "AAP-000007",
  packageLabel: "Complete roof",
  contactName: "Thandi Mokoena",
  contactEmail: "thandi@example.com",
  province: "KwaZulu-Natal",
  siteAddress: "12 Ridge Road, Hillcrest",
  summary: "Gable roof, 12 × 8 m, concrete roof tiles",
  total: 70197.37,
  proposalUrl: "https://aaggregates.store/projects/proposal/abc",
  validUntil: new Date("2026-11-30T10:00:00Z"),
  milestones: [{ label: "Deposit", amount: 28078.95, status: "PAID" }],
  paid: { label: "Deposit", amount: 28078.95, reference: "EFT 4471" },
};

const company: CompanyData = {
  id: "c_1",
  name: "Coastal Civils",
  applicantName: "Sipho Dlamini",
  applicantEmail: "sipho@example.com",
  tierLabel: "Contractor/Trade",
  requestedTierLabel: "Contractor/Trade",
  reviewNotes: null,
  credit: { status: "APPROVED", limit: "150000.00", termsDays: 30, notes: null, requested: { requestedLimit: 200000, requestedTermsDays: 30 } },
};

const enquiry: EnquiryData = {
  id: "e_1",
  reference: "ENQ-261008-A1B2C3",
  kindLabel: "Plant hire",
  subject: "20t excavator — wet hire",
  contactName: "Thandi Mokoena",
  contactEmail: "thandi@example.com",
  contactPhone: "082 123 4567",
  companyName: null,
  province: "Gauteng",
  siteAddress: "Midrand",
  message: "Trenching for 3 days",
  details: [["Basis", "Daily"], ["Quantity", "3"]],
};

const booking: BookingData = {
  id: "b_1",
  reference: "BK-261009-A1B2C3",
  itemName: "Excavator 20t",
  status: "QUOTED",
  customerName: "Thandi Mokoena",
  partnerName: "Highveld Plant",
  province: "Gauteng",
  siteAddress: "12 Main Rd, Midrand",
  startDate: "12 Oct 2026",
  endDate: "14 Oct 2026",
  quantityLabel: "3 days",
  customerTotal: 33600 as unknown as BookingData["customerTotal"],
  partnerAmount: 30000 as unknown as BookingData["partnerAmount"],
  quoteValidUntil: "20 Oct 2026",
  disputeReason: null,
};

const schedule: ScheduleData = {
  id: "s_1",
  reference: "BBS-261015-ABC123",
  contactName: "Sipho Dlamini",
  contactEmail: "sipho@example.com",
  contactPhone: null,
  companyName: "Dlamini Builders",
  projectName: "House 14 slab",
  province: "Gauteng",
  siteAddress: "14 Oak St, Benoni",
  requiredBy: "30 Oct 2026",
  message: null,
  lineCount: 3,
  totalMassKg: 412.6,
  bySize: [["Y16", "300.2 kg"], ["Y10", "112.4 kg"]],
  fileName: "slab-bbs.pdf",
  quotedAmount: 9850 as unknown as ScheduleData["quotedAmount"],
  quoteValidUntil: "25 Oct 2026",
  quoteNotes: "Includes cutting, bending, tagging and delivery to Benoni.",
  hasAccount: true,
};

describe("notification templates", () => {
  it("emails cut & bend schedules and quotes, linking accounts to accept online", () => {
    const received = customerScheduleEmail("BENDING_SCHEDULE_RECEIVED", schedule)!;
    expect(received.subject).toBe("We've received your bar bending schedule BBS-261015-ABC123");
    expect(received.text).toContain("Rows entered: 3 (412.6 kg by SANS 920 nominal mass)");
    expect(received.text).toContain("Y16: 300.2 kg");
    const quoted = customerScheduleEmail("BENDING_SCHEDULE_QUOTED", schedule)!;
    expect(quoted.subject).toBe("Your cut & bend quote BBS-261015-ABC123: R9,850.00");
    expect(quoted.text).toContain("/account/cut-and-bend/s_1");
    const guest = customerScheduleEmail("BENDING_SCHEDULE_QUOTED", { ...schedule, hasAccount: false })!;
    expect(guest.text).toContain("reply to this email quoting BBS-261015-ABC123");
    expect(guest.text).not.toContain("/account/cut-and-bend/");
    expect(staffScheduleEmail("BENDING_SCHEDULE_ACCEPTED", schedule)!.subject).toBe("Cut & bend quote accepted — BBS-261015-ABC123 (Dlamini Builders)");
  });

  it("formats money like the storefront", () => {
    expect(formatZAR("9133.12")).toBe("R9,133.12");
    expect(formatZAR(0)).toBe("R0.00");
  });

  it("summarises an order and links to payment", () => {
    const email = customerOrderEmail("ORDER_PLACED", order)!;
    expect(email.subject).toBe("Order AA-100 received — choose how to pay");
    expect(email.text).toContain("12 ton — 19mm Crushed Stone");
    expect(email.text).toContain("Total: R9,133.12");
    expect(email.text).toContain("/orders/ord_1/confirmation");
    expect(email.text).toMatch(/^Hi Thandi,/);
  });

  it("escapes everything customer-supplied in the HTML body", () => {
    const html = customerOrderEmail("ORDER_PLACED", { ...order, customerName: "<script>x</script>" })!.html;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<b>Hilton</b>");
    expect(html).toContain("&lt;b&gt;Hilton&lt;/b&gt;");
  });

  it("names the carrier and tracking reference on dispatch", () => {
    expect(customerOrderEmail("ORDER_DISPATCHED", order)!.text).toContain("with Besfleet. Tracking reference: BF-2044.");
    const partner = { ...order, shipment: { carrier: "EXTERNAL_PARTNER", externalPartnerName: "Tugela Tippers", trackingRef: null } };
    expect(customerOrderEmail("ORDER_DISPATCHED", partner)!.text).toContain("with Tugela Tippers.");
  });

  it("fills WhatsApp template parameters in order", () => {
    const message = customerOrderWhatsApp("ORDER_DISPATCHED", order)!;
    expect(message.templateName).toBe("aa_order_dispatched");
    expect(message.params).toEqual(["AA-100", "Besfleet", "BF-2044", expect.stringContaining("/orders/ord_1/tracking")]);
    expect(message.text).toContain("order AA-100 is on its way with Besfleet (tracking reference BF-2044).");
    expect(message.text).not.toMatch(/\{\{\d+\}\}/);
    // Every template's placeholders are numbered from 1 with no gaps, and (Meta's rule) the body neither starts nor ends with one.
    for (const text of Object.values(WHATSAPP_TEMPLATES)) {
      expect(text).not.toMatch(/^\s*\{\{|\}\}[\s.!]*$/);
      const numbers = [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
      expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    }
  });

  const paymentOrder = {
    ...order,
    status: "CONFIRMED",
    amountPaid: "2739.94",
    lastPayment: { amount: "2739.94", kind: "DEPOSIT", paidAt: new Date("2026-10-15T09:00:00Z"), method: "Stitch", reference: "pir_1" },
    payLink: { url: "https://aaggregates.store/pay/tok", amount: "6393.18", kind: "BALANCE", expiresAt: new Date("2026-10-22T09:00:00Z"), note: null },
  };

  it("receipts a deposit with the balance due, a balance payment, and a payment link", () => {
    const deposit = customerOrderEmail("ORDER_CONFIRMED", paymentOrder)!;
    expect(deposit.text).toMatch(/Deposit paid: R2,739\.94/);
    expect(deposit.text).toMatch(/Balance due before delivery: R6,393\.18/);
    expect(deposit.text).toMatch(/received your deposit/);
    const part = customerOrderEmail("PAYMENT_RECEIVED", paymentOrder)!;
    expect(part.text).toMatch(/R6,393\.18 is still to be paid/);
    const full = customerOrderEmail("PAYMENT_RECEIVED", { ...paymentOrder, amountPaid: "9133.12", lastPayment: { ...paymentOrder.lastPayment, amount: "6393.18", kind: "BALANCE" } })!;
    expect(full.text).toMatch(/now paid in full/);
    expect(full.text).toMatch(/Balance: Paid in full/);
    expect(staffOrderEmail("PAYMENT_RECEIVED", { ...paymentOrder, amountPaid: "9133.12" })!.subject).toMatch(/\(paid in full\)$/);
    const link = customerOrderEmail("PAYMENT_LINK_SENT", paymentOrder)!;
    expect(link.subject).toBe("Pay for order AA-100 — R6,393.18");
    expect(link.text).toContain("https://aaggregates.store/pay/tok");
    expect(link.text).toMatch(/balance of R6,393\.18/);
  });

  it("confirms an order on account with its due date, not a receipt", () => {
    const email = customerOrderEmail("ORDER_CONFIRMED", { ...order, status: "CONFIRMED", companyName: "Coastal Civils", account: { dueAt: new Date("2026-11-16T10:00:00Z"), termsDays: 30 } })!;
    expect(email.subject).toBe("Order AA-100 confirmed on your trade account");
    expect(email.text).toContain("Amount on account: R9,133.12");
    expect(email.text).toContain("Terms: 30 days");
    expect(email.text).not.toMatch(/receipt/i);
  });

  it("tells the customer which drop is coming and what was signed for", () => {
    const dispatched = customerOrderEmail("DROP_DISPATCHED", phasedOrder)!;
    expect(dispatched.subject).toBe("Order AA-100: delivery 2 of 3 is on its way");
    expect(dispatched.text).toContain("6 ton — 19mm Crushed Stone");
    expect(dispatched.text).toMatch(/next delivery is planned for/);
    const signed = customerOrderEmail("DELIVERY_SIGNED", phasedOrder)!;
    expect(signed.text).toContain("Signed by: J. Naidoo");
    expect(signed.text).toContain("Noted on delivery: One bag torn");
    expect(staffOrderEmail("DELIVERY_SIGNED", phasedOrder)!.subject).toBe("Delivery EXCEPTION — drop 2 of 3 on AA-100");
  });

  it("sends the supplier what to load without the customer's details or prices", () => {
    const email = supplierOrderEmail(order, "Hilton Quarry");
    expect(email.subject).toBe("Order to load: AA-100");
    expect(email.text).toContain("12 ton — 19mm Crushed Stone");
    expect(email.text).not.toContain("Thandi");
    expect(email.text).not.toContain("R9,133.12");
    expect(email.text).not.toContain("Quarry Rd");
  });

  it("announces trade credit decisions", () => {
    expect(customerCompanyEmail("CREDIT_DECIDED", company)!.text).toContain("Credit limit: R150,000.00");
    expect(customerCompanyEmail("CREDIT_DECIDED", { ...company, credit: { ...company.credit!, status: "DECLINED" } })!.subject).toBe("Your trade credit application — Coastal Civils");
    expect(staffCompanyEmail("CREDIT_APPLIED", company)!.text).toContain("R200,000.00 on 30-day terms");
  });

  const quotation = {
    quoteNumber: "AAQ-000042",
    contactName: "Lerato Dube",
    total: "2396.00",
    validUntil: new Date("2026-11-04T10:00:00Z"),
    lines: [{ name: "19mm Crushed Stone", quantity: 6, unitOfSale: "BULK_TON" as const }],
    url: "https://aaggregates.store/quotation/abc",
    preparedBy: "Sipho",
    message: "Delivery Tuesday mornings.",
  };

  it("emails a sales quotation with the link to accept and pay", () => {
    const email = quotationEmail(quotation);
    expect(email.subject).toBe("Quotation AAQ-000042 from Aggregated Aggregates — R2,396.00");
    expect(email.text).toContain("attached as a PDF");
    expect(email.text).toContain("https://aaggregates.store/quotation/abc");
    expect(email.text).toContain("Valid until: 4 November 2026");
    expect(email.text).toContain("ask for Sipho");
  });

  it("has a message for every channel an event is allowed to use", () => {
    for (const event of Object.values(NotificationEvent)) {
      const channels = EVENT_CHANNELS[event];
      const order = event.startsWith("EXPRESS_") ? expressOrder : event === "INVOICE_ISSUED" ? invoicedOrder : event.startsWith("PAYMENT_") ? paymentOrder : event === "DROP_DISPATCHED" || event === "DELIVERY_SIGNED" ? phasedOrder : baseOrder;
      const customerEmail = customerOrderEmail(event, order) ?? customerQuoteEmail(event, quote) ?? customerCompanyEmail(event, company) ?? customerEnquiryEmail(event, enquiry) ?? customerBookingEmail(event, booking) ?? customerScheduleEmail(event, schedule) ?? customerProjectEmail(event, project) ?? (event === "QUOTATION_SENT" ? quotationEmail(quotation) : null);
      const customerWhatsApp = customerOrderWhatsApp(event, order) ?? customerQuoteWhatsApp(event, quote);
      const staffEmail = staffOrderEmail(event, order) ?? staffQuoteEmail(event, quote) ?? staffCompanyEmail(event, company) ?? staffEnquiryEmail(event, enquiry) ?? staffBookingEmail(event, booking) ?? staffScheduleEmail(event, schedule) ?? staffProjectEmail(event, project);
      expect([event, customerEmail !== null]).toEqual([event, channels.customerEmail]);
      expect([event, customerWhatsApp !== null]).toEqual([event, channels.customerWhatsApp]);
      // The weekly insights email is built from report data (insights/digest.ts), not from one record.
      // These are built from report or health data (insights/digest.ts, gateway-health.service.ts), not from one record.
      // The supplier's answer (SUPPLIER_ORDER) and the uptime monitor (SERVICE_DOWN) are staff alerts too.
      // So is a supplier's price list (PRICE_LIST_UPLOADED, supplier-prices.service.ts).
      if (!["WEEKLY_INSIGHTS", "GATEWAY_DEGRADED", "SUPPLIER_ORDER", "SERVICE_DOWN", "PRICE_LIST_UPLOADED"].includes(event)) expect([event, staffEmail !== null]).toEqual([event, channels.staffEmail]);
    }
  });

  it("emails partners exactly the booking events marked for them, without customer contact details", () => {
    for (const event of Object.values(NotificationEvent)) {
      expect([event, partnerBookingEmail(event, booking) !== null]).toEqual([event, PARTNER_EVENTS.includes(event)]);
    }
    const offer = partnerBookingEmail("BOOKING_OFFERED", booking)!;
    expect(offer.subject).toBe("Job offer: Excavator 20t, Gauteng — reply within 30 minutes");
    expect(offer.text).toContain("Your payout: R30,000.00");
    expect(offer.text).not.toContain("Thandi");
    expect(offer.text).not.toContain("33,600");
    const quoted = customerBookingEmail("BOOKING_QUOTED", booking)!;
    expect(quoted.subject).toBe("Your quote BK-261009-A1B2C3: R33,600.00");
    expect(quoted.text).toContain("/account/bookings/b_1");
    expect(quoted.text).not.toContain("30,000");
  });

  it("acknowledges an enquiry without promising a booking or price", () => {
    const customer = customerEnquiryEmail("ENQUIRY_RECEIVED", enquiry)!;
    expect(customer.subject).toBe("We've received your request ENQ-261008-A1B2C3");
    expect(customer.text).toContain("Nothing is booked or charged until you accept");
    expect(customer.text).not.toMatch(/R\d/);
    const staff = staffEnquiryEmail("ENQUIRY_RECEIVED", enquiry)!;
    expect(staff.subject).toBe("New plant hire enquiry ENQ-261008-A1B2C3 — Thandi Mokoena");
    expect(staff.text).toContain("/admin/enquiries");
    expect(staff.text).toContain("Basis: Daily");
  });

  it("answers a BAE design brief with a fee proposal, not a supply quote", () => {
    const customer = customerEnquiryEmail("ENQUIRY_RECEIVED", { ...enquiry, kindLabel: "Design brief", design: true, subject: "House plans and council submission" })!;
    expect(customer.subject).toBe("We've received your design brief ENQ-261008-A1B2C3");
    expect(customer.text).toContain("fee proposal and terms of engagement");
    expect(customer.text).not.toContain("pay online");
    expect(customer.text).not.toMatch(/R\d/);
  });

  it("gives staff the quote-only reason and a link to the admin", () => {
    const email = staffQuoteEmail("QUOTE_RECEIVED", quote)!;
    expect(email.subject).toBe("New quote request Q-7K2M — Coastal Civils");
    expect(email.text).toContain("Why it needs a quote: Volume/Civil Bulk order of 10m³ or more");
    expect(email.text).toContain("/admin/quotes");
    expect(customerQuoteEmail("QUOTE_PRICED", quote)!.subject).toBe("Your quote Q-7K2M is ready: R134,500.50");
    expect(customerQuoteEmail("QUOTE_PRICED", quote)!.text).toContain("/account/dashboard");
    // A guest can't accept online, so they're told to reply instead of being sent to a dashboard they can't use.
    const guest = customerQuoteEmail("QUOTE_PRICED", { ...quote, hasAccount: false })!.text;
    expect(guest).not.toContain("/account/dashboard");
    expect(guest).toContain("reply to this email quoting Q-7K2M");
  });

  it("normalises South African and international WhatsApp numbers", () => {
    expect(whatsappNumber("082 123 4567")).toBe("27821234567");
    expect(whatsappNumber("+27 82 123 4567")).toBe("27821234567");
    expect(whatsappNumber("0027821234567")).toBe("27821234567");
    expect(whatsappNumber("+44 7700 900123")).toBe("447700900123");
    expect(whatsappNumber("12345")).toBeNull();
    expect(whatsappNumber("")).toBeNull();
    expect(whatsappNumber(null)).toBeNull();
  });

  it("tells the buyer when AA 60/120 is due, and staff to confirm a supplier once it's paid", () => {
    const placed = customerOrderEmail("ORDER_PLACED", expressOrder)!;
    expect(placed.text).toMatch(/AA 60\/120 order/);
    expect(placed.text).toMatch(/AA 60\/120 express: R1,000\.00/);
    const accepted = customerOrderEmail("EXPRESS_ACCEPTED", expressOrder)!;
    expect(accepted.subject).toBe("AA 60/120: order AA-100 is due by 12:20");
    expect(accepted.text).toMatch(/more than an hour late/);
    const paid = staffOrderEmail("EXPRESS_PAID", expressOrder)!;
    expect(paid.subject).toMatch(/^AA 60\/120 PAID/);
    const declined = customerOrderEmail("EXPRESS_DECLINED", { ...expressOrder, express: { ...expressOrder.express!, declinedAt: new Date(), note: "No truck free." } })!;
    expect(declined.text).toMatch(/No truck free\..*refunding/s);
    const unpaid = customerOrderEmail("EXPRESS_DECLINED", { ...expressOrder, express: { ...expressOrder.express!, fee: "0.00", declinedAt: new Date() } })!;
    expect(unpaid.text).toMatch(/taken off/);
    expect(customerOrderEmail("EXPRESS_ACCEPTED", order)).toBeNull();
  });

  it("sends a payment receipt on confirmation, and a link when the tax invoice is issued", () => {
    const receipt = customerOrderEmail("ORDER_CONFIRMED", { ...order, status: "CONFIRMED", payment: { paidAt: new Date("2026-10-15T09:00:00Z"), method: "Card (Visa / Mastercard / Amex)", reference: "pf_12345" } })!;
    expect(receipt.subject).toBe("Payment receipt — order AA-100 confirmed");
    expect(receipt.text).toMatch(/Amount paid: R9,133\.12\nPaid on: 15 October 2026\nPayment method: Card \(Visa \/ Mastercard \/ Amex\)\nPayment reference: pf_12345/);
    const invoice = customerOrderEmail("INVOICE_ISSUED", invoicedOrder)!;
    // A plain invoice before VAT registration; a tax invoice once the Group's VAT number is on it (docs/vat.md).
    expect(invoice.subject).toBe("Invoice AAI-000042 — order AA-100");
    expect(invoice.text).not.toMatch(/VAT|tax invoice/i);
    const taxInvoice = customerOrderEmail("INVOICE_ISSUED", { ...invoicedOrder, invoice: { ...invoicedOrder.invoice!, vatNumberBilled: "4000000000" } })!;
    expect(taxInvoice.subject).toBe("Tax invoice AAI-000042 — order AA-100");
    expect(invoice.text).toContain("https://aaggregates.store/orders/ord_1/confirmation");
  });

  it("uses the branded layout: logo, preview text, company footer, escaped content", () => {
    const placed = customerOrderEmail("ORDER_PLACED", order)!;
    expect(placed.html).toContain("AGGREGATED<br>AGGREGATES");
    expect(placed.html).toMatch(/display:none[^>]*>Thanks for your order/);
    expect(placed.html).toContain("Besbpo Group (Pty) Ltd (Reg. 2026/490480/07)");
    expect(placed.html).toContain("/legal/privacy-policy");
    expect(placed.html).not.toContain("<b>Hilton</b>");
    expect(placed.text).toContain("087 265 2505");
  });
});
