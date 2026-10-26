/**
 * Company accounts with several users (ROADMAP 6.1, docs/company-accounts.md): who in a company can do what, and
 * when a buyer's order waits for an approver. Pure, so it is unit-tested without a database.
 */
import { CompanyRole, UserRole } from "@aggregates/database";
import { formatZAR, type Money } from "../common/format";

export const COMPANY_ROLE_LABEL: Record<CompanyRole, string> = {
  ADMIN: "Account admin",
  BUYER: "Buyer",
  APPROVER: "Approver",
  ACCOUNTS: "Accounts",
};

/** A company member's role. Company admins are COMPANY_ADMIN users; anyone in a company without a role orders as a buyer. */
export function companyRoleOf(user: { role: UserRole; companyId: string | null; companyRole?: CompanyRole | null }): CompanyRole | null {
  if (!user.companyId) return null;
  if (user.role === UserRole.COMPANY_ADMIN) return CompanyRole.ADMIN;
  return user.companyRole ?? CompanyRole.BUYER;
}

/** Accounts people see orders, invoices and statements and pay — they don't place orders. */
export const canOrder = (role: CompanyRole | null) => role !== CompanyRole.ACCOUNTS;
export const canApprove = (role: CompanyRole | null) => role === CompanyRole.ADMIN || role === CompanyRole.APPROVER;
export const canManage = (role: CompanyRole | null) => role === CompanyRole.ADMIN;

/**
 * Why a buyer's order needs approval, or null when it doesn't. Only buyers' orders wait: admins and approvers
 * approve, so their own orders go straight through. A buyer's own limit and the company's threshold both apply.
 */
export function approvalReason(
  member: { name: string | null; companyRole: CompanyRole | null; spendLimit: Money | null },
  company: { approvalThreshold: Money | null },
  total: number,
): string | null {
  if (member.companyRole !== CompanyRole.BUYER) return null;
  const who = member.name?.trim().split(/\s+/)[0] || "the buyer";
  const own = member.spendLimit === null ? null : Number(member.spendLimit);
  const threshold = company.approvalThreshold === null ? null : Number(company.approvalThreshold);
  if (own !== null && total > own) return `Above ${who}'s ${formatZAR(own)} limit per order.`;
  if (threshold !== null && total > threshold) return `Above the company's ${formatZAR(threshold)} approval threshold.`;
  return null;
}

/** A purchase-order number as typed: trimmed, at most 60 characters; empty is none. */
export function purchaseOrderNumber(value: string | null | undefined): string | null {
  const v = value?.replace(/\s+/g, " ").trim();
  return v ? v.slice(0, 60) : null;
}
