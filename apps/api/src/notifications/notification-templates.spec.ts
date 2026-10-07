import { NotificationEvent } from "@aggregates/database";
import {
  customerCompanyEmail,
  customerEnquiryEmail,
  customerOrderEmail,
  customerOrderWhatsApp,
  customerQuoteEmail,
  customerQuoteWhatsApp,
  EVENT_CHANNELS,
  formatZAR,
  staffCompanyEmail,
  staffEnquiryEmail,
  staffOrderEmail,
  staffQuoteEmail,
  whatsappNumber,
  WHATSAPP_TEMPLATES,
  type CompanyData,
  type EnquiryData,
  type OrderData,
  type QuoteData,
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

const company: CompanyData = {
  id: "c_1",
  name: "Coastal Civils",
  applicantName: "Sipho Dlamini",
  applicantEmail: "sipho@example.com",
  tierLabel: "Contractor/Trade",
  requestedTierLabel: "Contractor/Trade",
  reviewNotes: null,
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

describe("notification templates", () => {
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

  it("has a message for every channel an event is allowed to use", () => {
    for (const event of Object.values(NotificationEvent)) {
      const channels = EVENT_CHANNELS[event];
      const customerEmail = customerOrderEmail(event, order) ?? customerQuoteEmail(event, quote) ?? customerCompanyEmail(event, company) ?? customerEnquiryEmail(event, enquiry);
      const customerWhatsApp = customerOrderWhatsApp(event, order) ?? customerQuoteWhatsApp(event, quote);
      const staffEmail = staffOrderEmail(event, order) ?? staffQuoteEmail(event, quote) ?? staffCompanyEmail(event, company) ?? staffEnquiryEmail(event, enquiry);
      expect([event, customerEmail !== null]).toEqual([event, channels.customerEmail]);
      expect([event, customerWhatsApp !== null]).toEqual([event, channels.customerWhatsApp]);
      expect([event, staffEmail !== null]).toEqual([event, channels.staffEmail]);
    }
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
});
