/**
 * The handling fee on correctly supplied materials returned by agreement
 * (content/legal/handling-fee-policy.md): 18% of the amount charged for the
 * returned materials, deducted from the refund.
 */
export const HANDLING_FEE_RATE = 0.18;

const cents = (n: number) => Math.round(n * 100) / 100;

export function handlingFee(chargedForReturnedMaterials: number) {
  const fee = cents(chargedForReturnedMaterials * HANDLING_FEE_RATE);
  return { fee, refund: cents(chargedForReturnedMaterials - fee) };
}
