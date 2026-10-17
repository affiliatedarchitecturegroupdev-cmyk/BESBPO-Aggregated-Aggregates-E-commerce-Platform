"use client";

import { useState } from "react";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { PAYMENT_KIND_LABEL, type OrderPayments } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";

/**
 * How an order is paid (docs/payments.md): in full or by deposit on a new
 * order, the balance after a deposit, or progress on a lay-by plan. Amounts
 * come from the API; the tiles only start a payment the API works out again.
 */
export function OrderPaymentPanel({ payments }: { payments: OrderPayments }) {
  const { choices, deposit } = payments;
  const [plan, setPlan] = useState<"FULL" | "DEPOSIT">("FULL");
  const paid = payments.payments.filter((p) => p.status === "PAID");
  const layby = payments.layby.active;

  return (
    <div className="space-y-6">
      {(paid.length > 0 || layby) && (
        <div className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
          <h2 className="font-semibold text-basalt">Payments</h2>
          {paid.length > 0 && (
            <ul className="mt-2 divide-y divide-basalt/5">
              {paid.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 py-1.5">
                  <span>
                    {PAYMENT_KIND_LABEL[p.kind]}
                    {p.paidAt && <span className="text-slate"> · {new Date(p.paidAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  </span>
                  <span>{formatZAR(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {layby && layby.status === "INITIATED" && (
            <p className="mt-2 text-slate">
              Lay-by with LayUp: {formatZAR(layby.paidSoFar)} of {formatZAR(payments.total)} paid so far. We deliver once your plan is paid off — keep paying through
              LayUp, and this page updates as your payments come in.
            </p>
          )}
          <dl className="mt-3 space-y-1 border-t border-basalt/10 pt-3">
            <div className="flex justify-between">
              <dt className="text-slate">Paid so far</dt>
              <dd>{formatZAR(payments.amountPaid)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>{payments.balance > 0 ? "Balance due before delivery" : "Balance"}</dt>
              <dd>{payments.balance > 0 ? formatZAR(payments.balance) : "Paid in full"}</dd>
            </div>
          </dl>
        </div>
      )}

      {choices.full && (
        <div>
          {choices.deposit && deposit.available && (
            <fieldset className="mb-5 grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 font-body text-sm font-semibold text-basalt">How would you like to pay?</legend>
              <label className={`cursor-pointer rounded-sm border bg-white p-4 font-body text-sm ${plan === "FULL" ? "border-seam-blue" : "border-basalt/10"}`}>
                <input type="radio" name="plan" value="FULL" checked={plan === "FULL"} onChange={() => setPlan("FULL")} className="mr-2" />
                <span className="font-semibold">Pay in full</span>
                <span className="mt-1 block text-slate">{formatZAR(payments.total)} now.</span>
              </label>
              <label className={`cursor-pointer rounded-sm border bg-white p-4 font-body text-sm ${plan === "DEPOSIT" ? "border-seam-blue" : "border-basalt/10"}`}>
                <input type="radio" name="plan" value="DEPOSIT" checked={plan === "DEPOSIT"} onChange={() => setPlan("DEPOSIT")} className="mr-2" />
                <span className="font-semibold">Pay a {deposit.percent}% deposit</span>
                <span className="mt-1 block text-slate">
                  {formatZAR(deposit.amount)} now to secure your order and its prices; {formatZAR(deposit.balance)} before delivery.
                </span>
              </label>
            </fieldset>
          )}
          {plan === "DEPOSIT" && choices.deposit ? (
            <PaymentMethodSelector key="deposit" orderId={payments.orderId} eligible={choices.deposit} plan="DEPOSIT" />
          ) : (
            <PaymentMethodSelector key="full" orderId={payments.orderId} eligible={choices.full} plan="FULL" />
          )}
          {!deposit.available && payments.total >= 1000 && <p className="mt-4 font-body text-xs text-slate">Paying a deposit: {deposit.reason}</p>}
        </div>
      )}

      {choices.balance && (
        <div>
          <h2 className="mb-3 font-body text-sm font-semibold text-basalt">Pay the balance — {formatZAR(payments.balance)}</h2>
          <PaymentMethodSelector key="balance" orderId={payments.orderId} eligible={choices.balance} plan="BALANCE" />
        </div>
      )}
    </div>
  );
}
