/** Company accounts (docs/company-accounts.md): what the API's `/company/team` returns, and the labels. */
export type CompanyRole = "ADMIN" | "BUYER" | "APPROVER" | "ACCOUNTS";

export const COMPANY_ROLE_LABEL: Record<CompanyRole, string> = { ADMIN: "Account admin", BUYER: "Buyer", APPROVER: "Approver", ACCOUNTS: "Accounts" };
export const COMPANY_ROLE_HINT: Record<CompanyRole, string> = {
  ADMIN: "Manages the team and settings, orders and approves.",
  BUYER: "Orders at the company's prices; orders above their limit wait for approval.",
  APPROVER: "Orders, and approves buyers' orders above their limits.",
  ACCOUNTS: "Sees orders, invoices and statements, and pays — doesn't order.",
};

export type Team = {
  company: { id: string; name: string; status: string; approvalThreshold: string | null; requirePurchaseOrder: boolean };
  me: { id: string; companyRole: CompanyRole; spendLimit: string | null };
  members: { id: string; name: string | null; email: string; companyRole: CompanyRole; spendLimit: string | null; joinedAt: string; isYou: boolean }[];
  invites: { id: string; email: string; role: CompanyRole; spendLimit: string | null; createdAt: string; expiresAt: string }[];
  awaiting: { id: string; orderNumber: string; total: string; createdAt: string; approvalReason: string | null; purchaseOrderNumber: string | null; user: { id: string; name: string | null; email: string } | null; canDecide: boolean }[];
};
