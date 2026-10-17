/**
 * Deposits (docs/payments.md): a customer can secure a large order with a
 * deposit and pay the balance before dispatch. The owner set the band at
 * 15–50%; within it the percentage follows the order's size, the customer's
 * tier, and whether anything is made to order (cut to length), which can't be
 * resold if the order falls through. Admins can change the numbers on
 * Admin → Payments; these are the defaults.
 */
export type DepositStep = { fromTotal: number; percent: number };

export type DepositPolicy = {
  /** Orders below this pay in full. */
  minOrderTotal: number;
  /** Retail customers, by order total (highest matching step wins). */
  retail: DepositStep[];
  /** Approved Contractor/Trade and Volume/Civil Bulk accounts. */
  trade: DepositStep[];
  /** Any made-to-order line (cut-to-length) — non-refundable work, so a bigger deposit. */
  madeToOrderPercent: number;
  /** The owner's band: no deposit outside it. */
  floorPercent: number;
  ceilingPercent: number;
};

export const DEFAULT_DEPOSIT_POLICY: DepositPolicy = {
  minOrderTotal: 10_000,
  retail: [
    { fromTotal: 0, percent: 30 },
    { fromTotal: 100_000, percent: 25 },
  ],
  trade: [
    { fromTotal: 0, percent: 25 },
    { fromTotal: 100_000, percent: 20 },
    { fromTotal: 250_000, percent: 15 },
  ],
  madeToOrderPercent: 50,
  floorPercent: 15,
  ceilingPercent: 50,
};

export type DepositInput = {
  total: number;
  amountPaid: number;
  status: string;
  customerTier: string | null;
  paymentPlan: string;
  /** AA 60/120 is paid in full, there and then. */
  isExpress: boolean;
  hasMadeToOrder: boolean;
};

export type DepositTerms =
  | { available: true; percent: number; amount: number; balance: number }
  | { available: false; reason: string };

const cents = (n: number) => Math.round(n * 100) / 100;

/** Merges an admin-saved policy over the defaults, keeping every number inside the 15–50% band. */
export function normalisePolicy(saved: Partial<DepositPolicy> | null | undefined): DepositPolicy {
  const p = { ...DEFAULT_DEPOSIT_POLICY, ...(saved ?? {}) };
  const floor = Math.max(15, Math.min(50, Number(p.floorPercent) || 15));
  const ceiling = Math.max(floor, Math.min(50, Number(p.ceilingPercent) || 50));
  const clampSteps = (steps: DepositStep[] | undefined, fallback: DepositStep[]) =>
    (Array.isArray(steps) && steps.length ? steps : fallback)
      .map((s) => ({ fromTotal: Math.max(0, Number(s.fromTotal) || 0), percent: Math.max(floor, Math.min(ceiling, Number(s.percent) || floor)) }))
      .sort((a, b) => a.fromTotal - b.fromTotal);
  return {
    minOrderTotal: Math.max(0, Number(p.minOrderTotal) || 0),
    retail: clampSteps(p.retail, DEFAULT_DEPOSIT_POLICY.retail),
    trade: clampSteps(p.trade, DEFAULT_DEPOSIT_POLICY.trade),
    madeToOrderPercent: Math.max(floor, Math.min(ceiling, Number(p.madeToOrderPercent) || ceiling)),
    floorPercent: floor,
    ceilingPercent: ceiling,
  };
}

export function depositTerms(input: DepositInput, policy: DepositPolicy = DEFAULT_DEPOSIT_POLICY): DepositTerms {
  if (input.status !== "PENDING") return { available: false, reason: "The order is already confirmed." };
  if (input.amountPaid > 0) return { available: false, reason: "A payment has already been made on this order." };
  if (input.paymentPlan === "LAYBY") return { available: false, reason: "This order is on lay-by." };
  if (input.isExpress) return { available: false, reason: "AA 60/120 orders are paid in full." };
  if (input.total < policy.minOrderTotal) {
    return { available: false, reason: `Deposits are for orders of R${policy.minOrderTotal.toLocaleString("en-ZA")} or more.` };
  }
  const steps = input.customerTier && input.customerTier !== "RETAIL" ? policy.trade : policy.retail;
  const byValue = [...steps].reverse().find((s) => input.total >= s.fromTotal)?.percent ?? policy.ceilingPercent;
  const percent = Math.max(policy.floorPercent, Math.min(policy.ceilingPercent, input.hasMadeToOrder ? Math.max(byValue, policy.madeToOrderPercent) : byValue));
  const amount = cents((input.total * percent) / 100);
  return { available: true, percent, amount, balance: cents(input.total - amount) };
}
