"use client";

import { useRef, useState } from "react";
import { inputClass } from "@/components/account/Forms";
import { HANDLING_FEE_RATE, handlingFee } from "@/lib/handling-fee";
import { formatZAR } from "@/lib/pricing";

/**
 * For a return of correctly supplied materials (Handling Fee Policy): enter
 * what the returned items were charged, and it fills the refund amount and
 * reason with the 18% fee deducted. Not for wrong, short or defective
 * deliveries, which are refunded in full.
 */
export function HandlingFeeHelper({ maxRefund }: { maxRefund: number }) {
  const [charged, setCharged] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const value = Number(charged);
  const valid = charged.trim() !== "" && Number.isFinite(value) && value > 0;
  const { fee, refund } = handlingFee(valid ? value : 0);

  function apply() {
    const form = ref.current?.closest("form");
    if (!form || !valid) return;
    const amount = form.elements.namedItem("amount") as HTMLInputElement | null;
    const reason = form.elements.namedItem("reason") as HTMLInputElement | null;
    if (amount) amount.value = Math.min(refund, maxRefund).toFixed(2);
    if (reason && !reason.value) reason.value = `Return by agreement — ${formatZAR(value)} of materials less ${Math.round(HANDLING_FEE_RATE * 100)}% handling fee (${formatZAR(fee)})`;
  }

  return (
    <div ref={ref} className="rounded-sm border border-dashed border-basalt/20 bg-white p-2 sm:col-span-full">
      <p className="font-semibold text-basalt">Return of correctly supplied materials? ({Math.round(HANDLING_FEE_RATE * 100)}% handling fee)</p>
      <div className="mt-1 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase text-slate">Charged for the returned items (R)</span>
          <input type="number" step="0.01" min="0" value={charged} onChange={(e) => setCharged(e.target.value)} className={`${inputClass} w-40`} />
        </label>
        {valid && (
          <span className="pb-2 text-basalt">
            Fee {formatZAR(fee)} · refund {formatZAR(refund)}
            {refund > maxRefund ? ` (capped at ${formatZAR(maxRefund)})` : ""}
          </span>
        )}
        <button type="button" onClick={apply} disabled={!valid} className="mb-1 rounded-sm border border-seam-blue px-2.5 py-1 font-semibold text-seam-blue hover:bg-seam-blue hover:text-limestone disabled:opacity-40">
          Use this refund
        </button>
      </div>
      <p className="mt-1 text-slate">Wrong, short or defective deliveries are refunded in full — don&apos;t use this for those.</p>
    </div>
  );
}
