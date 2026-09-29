import { ManualEftAdapter } from "./manual-eft.adapter";

describe("Manual EFT / PO", () => {
  const saved = process.env.EFT_BANKING_DETAILS;
  afterEach(() => (saved === undefined ? delete process.env.EFT_BANKING_DETAILS : (process.env.EFT_BANKING_DETAILS = saved)));
  const request = { orderId: "o1", orderNumber: "AA-1", amount: 3333.12, methodKey: "EFT_PO", customerEmail: "b@example.com", returnUrl: "", notifyUrl: "" };

  it("gives the configured bank account with the order number as reference", async () => {
    process.env.EFT_BANKING_DETAILS = "Bank: Example Bank\nAccount number: 000";
    const { note } = await new ManualEftAdapter().initiate(request as never);
    expect(note).toContain("Pay R3,333.12 by EFT, or send a purchase order, quoting AA-1 as the reference.");
    expect(note).toContain("Our bank account: Bank: Example Bank · Account number: 000.");
  });

  it("never claims details it doesn't have", async () => {
    delete process.env.EFT_BANKING_DETAILS;
    const { note } = await new ManualEftAdapter().initiate(request as never);
    expect(note).toContain("banking details on request");
    expect(note).not.toContain("Our bank account");
  });
});
