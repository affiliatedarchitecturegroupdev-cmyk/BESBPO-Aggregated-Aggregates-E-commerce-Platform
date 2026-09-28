"use client";

import { useState, useTransition } from "react";
import { PAYMENT_METHODS } from "@/data/payment-methods";
import { payForOrder } from "@/app/account/actions";

export type EligibleMethods = { recommended: { methodKey: string }[]; available: { methodKey: string }[] };

const BY_KEY = new Map(PAYMENT_METHODS.map((m) => [m.key, m]));

/**
 * Payment tiles for one order. Which tiles appear comes from the API
 * (GET /payment-methods/eligible at the buyer's own tier) and the choice is
 * re-checked server-side when paying — this component only renders.
 */
export function PaymentMethodSelector({ orderId, eligible }: { orderId: string; eligible: EligibleMethods }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const pay = (methodKey: string) => {
    setChosen(methodKey);
    setResult(null);
    start(async () => {
      const response = await payForOrder(orderId, methodKey);
      if (response.ok && response.redirectUrl) {
        window.location.assign(response.redirectUrl);
        return;
      }
      setResult(response);
    });
  };

  const group = (title: string, keys: { methodKey: string }[]) =>
    keys.length > 0 && (
      <div>
        <h3 className="font-mono text-xs uppercase tracking-widest text-seam-blue">{title}</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {keys.map(({ methodKey }) => {
            const method = BY_KEY.get(methodKey);
            if (!method) return null;
            return (
              <button
                key={methodKey}
                type="button"
                disabled={pending}
                aria-pressed={chosen === methodKey}
                onClick={() => pay(methodKey)}
                className={`flex flex-col items-start gap-1 rounded-sm border bg-white p-3 text-left disabled:opacity-60 ${
                  chosen === methodKey ? "border-seam-blue" : "border-basalt/10 hover:border-seam-blue"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- provider logo (see PAYMENT_ASSETS.md) */}
                <img src={`/payment-logos/${method.logoAssetPath}`} alt="" className="h-6" />
                <span className="font-body text-sm font-semibold text-basalt">{method.displayName}</span>
                {method.instalments && <span className="font-body text-[11px] text-slate">{method.instalments}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {group("Recommended for this order", eligible.recommended)}
      {group(eligible.recommended.length > 0 ? "Also available" : "Payment", eligible.available)}
      {pending && <p className="font-body text-sm text-slate">Contacting the payment provider…</p>}
      {result && (
        <p
          role="status"
          className={`rounded-sm border p-3 font-body text-sm ${
            result.ok ? "border-seam-blue/30 bg-seam-blue/5 text-seam-blue" : "border-ochre-gold/50 bg-ochre-gold/10 text-basalt"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
