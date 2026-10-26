import { approvalReason, canApprove, canManage, canOrder, companyRoleOf, purchaseOrderNumber } from "./company-accounts";

describe("company accounts", () => {
  it("works out each member's role", () => {
    expect(companyRoleOf({ role: "CUSTOMER", companyId: null })).toBeNull();
    expect(companyRoleOf({ role: "COMPANY_ADMIN", companyId: "c", companyRole: "BUYER" })).toBe("ADMIN");
    expect(companyRoleOf({ role: "CUSTOMER", companyId: "c", companyRole: null })).toBe("BUYER");
    expect(companyRoleOf({ role: "CUSTOMER", companyId: "c", companyRole: "ACCOUNTS" })).toBe("ACCOUNTS");
    expect([canOrder("ACCOUNTS"), canOrder("BUYER"), canApprove("APPROVER"), canApprove("BUYER"), canManage("APPROVER"), canManage("ADMIN")]).toEqual([false, true, true, false, false, true]);
  });

  it("holds a buyer's order above their own limit or the company's threshold", () => {
    const buyer = { name: "Thandi Mokoena", companyRole: "BUYER" as const, spendLimit: "20000" };
    expect(approvalReason(buyer, { approvalThreshold: null }, 20_000)).toBeNull();
    expect(approvalReason(buyer, { approvalThreshold: null }, 20_000.01)).toBe("Above Thandi's R20,000.00 limit per order.");
    expect(approvalReason({ ...buyer, spendLimit: null }, { approvalThreshold: 50_000 }, 60_000)).toBe("Above the company's R50,000.00 approval threshold.");
    expect(approvalReason({ ...buyer, spendLimit: null }, { approvalThreshold: null }, 1_000_000)).toBeNull();
    // Approvers and admins approve, so their own orders go straight through.
    expect(approvalReason({ ...buyer, companyRole: "APPROVER" }, { approvalThreshold: 1 }, 60_000)).toBeNull();
  });

  it("tidies a purchase-order number", () => {
    expect(purchaseOrderNumber("  PO  4471 ")).toBe("PO 4471");
    expect(purchaseOrderNumber("")).toBeNull();
    expect(purchaseOrderNumber("x".repeat(80))).toHaveLength(60);
  });
});
