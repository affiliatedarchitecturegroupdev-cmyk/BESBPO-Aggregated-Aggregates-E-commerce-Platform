import { Prisma } from "@aggregates/database";
import { forViewer, withoutCosts } from "./costs";

describe("cost stripping", () => {
  const order = {
    id: "o1",
    total: new Prisma.Decimal("100.50"),
    createdAt: new Date("2026-10-08T00:00:00Z"),
    lineItems: [{ id: "l1", unitPrice: new Prisma.Decimal("10"), unitCost: new Prisma.Decimal("7"), costSource: "SNAPSHOT", pricingFamily: "AGGREGATE", listUnitPrice: new Prisma.Decimal("11") }],
    shipment: { carrier: "BESFLEET", deliveryCost: new Prisma.Decimal("500"), deliveryCostSource: "ACTUAL", deliveryCostNote: "x" },
  };

  it("removes cost keys at any depth and keeps everything else intact", () => {
    const out = withoutCosts(order);
    expect(out.lineItems[0]).not.toHaveProperty("unitCost");
    expect(out.lineItems[0]).not.toHaveProperty("costSource");
    expect(out.lineItems[0]).not.toHaveProperty("pricingFamily");
    expect(out.shipment).not.toHaveProperty("deliveryCost");
    expect(out.shipment).toEqual({ carrier: "BESFLEET" });
    expect(String(out.total)).toBe("100.5");
    expect(out.createdAt).toBeInstanceOf(Date);
    expect(String(out.lineItems[0].listUnitPrice)).toBe("11");
  });

  it("shows costs to admins only", () => {
    expect(forViewer(order, { role: "ADMIN" }).lineItems[0]).toHaveProperty("unitCost");
    for (const role of ["STAFF", "CUSTOMER", "COMPANY_ADMIN", "PARTNER"] as const) {
      expect(forViewer(order, { role }).lineItems[0]).not.toHaveProperty("unitCost");
    }
    expect(forViewer(order, null).lineItems[0]).not.toHaveProperty("unitCost");
  });
});
