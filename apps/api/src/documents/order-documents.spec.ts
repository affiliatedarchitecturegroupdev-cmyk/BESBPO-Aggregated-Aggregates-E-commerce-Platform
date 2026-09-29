import { deliveryNoteSpec, orderConfirmationSpec, taxInvoiceSpec, vatBreakdown, type InvoiceDocData, type OrderDocData } from "./order-documents";
import { renderPdf } from "./pdf-renderer";

const order: OrderDocData = {
  orderNumber: "AA-100",
  status: "PENDING",
  createdAt: new Date("2026-09-29T08:00:00Z"),
  subtotal: "7333.12",
  deliveryFee: "1800.00",
  total: "9133.12",
  deliveryAddress: "8 Harbour Rd, Ballito",
  deliveryProvince: "KwaZulu-Natal",
  deliveryDistanceKm: 67.3,
  contactPhone: "082 123 4567",
  notes: "Gate code 1234",
  customer: { name: "Thandi Mokoena", email: "thandi@example.com" },
  company: { name: "Coastal Civils", vatNumber: "4123456789" },
  lines: [
    { name: "19mm Crushed Stone", sku: "AA-CRS-04", quantity: 12, unitOfSale: "BULK_TON", unitPrice: "450.00", lineTotal: "5400.00" },
    { name: "Cement 42.5N", sku: "AA-CEM-01", quantity: 20, unitOfSale: "BAG_50KG", unitPrice: "96.656", lineTotal: "1933.12" },
  ],
  shipment: { carrier: "EXTERNAL_PARTNER", externalPartnerName: "Tugela Tippers", trackingRef: "TT-9", dispatchedAt: new Date("2026-09-30T06:00:00Z"), deliveredAt: null },
};

const invoice: InvoiceDocData = {
  invoiceNumber: "AAI-000001",
  createdAt: new Date("2026-09-29T09:00:00Z"),
  status: "PAID",
  paidAt: new Date("2026-09-29T09:00:00Z"),
  vatNumberBilled: "4000000000",
  billedToName: "Coastal Civils",
  billedToAddress: "8 Harbour Rd, Ballito, KwaZulu-Natal",
  billedToVatNumber: "4123456789",
  amountExVat: "7941.84",
  vatAmount: "1191.28",
  vatRatePercent: "15",
  amountDue: "9133.12",
};

describe("order documents", () => {
  it("works out the VAT inside a VAT-inclusive total, to the cent", () => {
    const b = vatBreakdown("9133.12");
    expect(b.vat.toFixed(2)).toBe("1191.28");
    expect(b.exVat.toFixed(2)).toBe("7941.84");
    expect(b.exVat.plus(b.vat).toFixed(2)).toBe("9133.12");
    expect(vatBreakdown("115").vat.toFixed(2)).toBe("15.00");
    expect(vatBreakdown("0.01").vat.toFixed(2)).toBe("0.00");
  });

  it("marks the order confirmation as not a tax invoice and explains how to pay", () => {
    const spec = orderConfirmationSpec(order);
    expect(spec.subtitle).toBe("This is not a tax invoice");
    expect(spec.table.rows[0]).toEqual(["19mm Crushed Stone", "12 ton", "R450.00", "R5,400.00"]);
    expect(spec.table.rows[1][1]).toBe("20 × 50kg bag");
    expect(spec.totals!.at(-1)).toEqual({ label: "Total", value: "R9,133.12", strong: true });
    expect(spec.notes!.join(" ")).toContain("EFT quoting AA-100");
    // Banking details only ever come from configuration — never invented.
    const withBank = orderConfirmationSpec(order, "Bank: Example Bank\nAccount: 123");
    expect(withBank.notes).toEqual(expect.arrayContaining(["Bank: Example Bank", "Account: 123"]));
    expect(orderConfirmationSpec({ ...order, status: "CONFIRMED" }).notes!.join(" ")).not.toContain("EFT");
  });

  it("gives the site a delivery note without prices, with signature lines", () => {
    const spec = deliveryNoteSpec(order);
    expect(spec.meta).toEqual(expect.arrayContaining([["Carrier", "Tugela Tippers"], ["Tracking reference", "TT-9"]]));
    expect(spec.table.rows).toEqual([
      ["19mm Crushed Stone", "AA-CRS-04", "12 ton"],
      ["Cement 42.5N", "AA-CEM-01", "20 × 50kg bag"],
    ]);
    expect(JSON.stringify(spec)).not.toContain("R5,400.00");
    expect(spec.parties.find((p) => p.heading === "Site access")!.lines).toEqual(["Gate code 1234"]);
    expect(spec.signatures).toContain("Signature");
  });

  it("prints a tax invoice with the Group VAT number, both parties and the VAT split", () => {
    const spec = taxInvoiceSpec(invoice, order);
    expect(spec.title).toBe("Tax invoice");
    expect(spec.sellerLines).toContain("VAT registration 4000000000 (Besbpo Group)");
    expect(spec.parties[0].lines).toEqual(["Coastal Civils", "8 Harbour Rd, Ballito, KwaZulu-Natal", "VAT 4123456789"]);
    expect(spec.totals).toEqual([
      { label: "Total excl. VAT", value: "R7,941.84" },
      { label: "VAT at 15%", value: "R1,191.28" },
      { label: "Total incl. VAT", value: "R9,133.12", strong: true },
    ]);
    expect(spec.table.rows.at(-1)).toEqual(["Delivery (67.3km)", "1", "R1,800.00", "R1,800.00"]);
    expect(taxInvoiceSpec({ ...invoice, status: "VOID" }, order).subtitle).toContain("VOID");
  });

  it("renders each document to a PDF", async () => {
    for (const spec of [orderConfirmationSpec(order), deliveryNoteSpec(order), taxInvoiceSpec(invoice, order)]) {
      const pdf = await renderPdf(spec);
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(1500);
    }
    // A long order flows onto more pages without failing.
    const many = { ...order, lines: Array.from({ length: 60 }, (_, i) => ({ ...order.lines[0], name: `Line ${i + 1}` })) };
    const pdf = await renderPdf(orderConfirmationSpec(many));
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });
});
