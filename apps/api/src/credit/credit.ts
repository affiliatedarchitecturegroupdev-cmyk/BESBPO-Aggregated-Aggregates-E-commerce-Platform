/**
 * Trade credit (docs/trade-credit.md): pure rules, so they can be tested
 * without a database. A company on account can order up to its limit and
 * pays each order within its terms; an overdue order stops new orders on
 * account until it's paid.
 */

/** The payment terms staff can grant, in days from the order's confirmation. */
export const CREDIT_TERMS_DAYS = [7, 14, 30, 60] as const;
/** The largest limit staff can grant here; bigger facilities are agreed in writing outside the platform. */
export const MAX_CREDIT_LIMIT = 5_000_000;

const round = (n: number) => Math.round(n * 100) / 100;

export type CreditCompany = { creditStatus: string; creditLimit: unknown; paymentTermsDays: number | null };
export type AccountOrder = { total: unknown; amountPaid: unknown; accountDueAt: Date | null; status: string };

export type CreditPosition = {
  status: string;
  limit: number;
  termsDays: number | null;
  /** Owed on orders charged to the account, not yet paid. */
  used: number;
  overdue: number;
  overdueOrders: number;
  available: number;
};

export function creditPosition(company: CreditCompany, orders: AccountOrder[], now = new Date()): CreditPosition {
  const limit = company.creditStatus === "APPROVED" && company.creditLimit != null ? Number(company.creditLimit) : 0;
  let used = 0;
  let overdue = 0;
  let overdueOrders = 0;
  for (const o of orders) {
    if (o.status === "CANCELLED") continue;
    const owed = round(Number(o.total) - Number(o.amountPaid));
    if (owed <= 0.01) continue;
    used += owed;
    if (o.accountDueAt && o.accountDueAt < now) {
      overdue += owed;
      overdueOrders += 1;
    }
  }
  return {
    status: company.creditStatus,
    limit,
    termsDays: company.paymentTermsDays,
    used: round(used),
    overdue: round(overdue),
    overdueOrders,
    available: round(Math.max(0, limit - used)),
  };
}

/** Why an amount can't go on account, or null if it can. */
export function chargeRefusal(position: CreditPosition, amount: number): string | null {
  if (position.status !== "APPROVED") return "Your company doesn't have an approved trade account.";
  if (position.overdueOrders > 0) return `${position.overdueOrders === 1 ? "An order" : `${position.overdueOrders} orders`} on your account ${position.overdueOrders === 1 ? "is" : "are"} overdue (R${position.overdue.toFixed(2)}) — pay ${position.overdueOrders === 1 ? "it" : "them"} first, then you can order on account again.`;
  if (amount > position.available + 0.01) return `This order (R${amount.toFixed(2)}) is more than the R${position.available.toFixed(2)} available on your account — pay another way, or pay an account order first.`;
  return null;
}

/** When an order charged to the account must be paid. */
export function accountDueDate(from: Date, termsDays: number): Date {
  return new Date(from.getTime() + termsDays * 86_400_000);
}
