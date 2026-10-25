"use client";

import { useFormState } from "react-dom";
import { uploadOwnPriceList } from "@/app/suppliers/portal/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";

/** The supplier's price-list upload in the supplier portal (docs/supplier-prices.md). */
export function OwnPriceListForm() {
  const [state, action] = useFormState(uploadOwnPriceList, null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="space-y-3 rounded-sm border border-basalt/10 bg-white p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block font-body text-xs text-slate">
          Your price list (Excel .xlsx or .csv)
          <input name="file" type="file" required accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className={inputClass} />
        </label>
        <label className="block font-body text-xs text-slate">
          Prices hold until
          <input name="validUntil" type="date" required min={today} className={inputClass} />
        </label>
      </div>
      <label className="block font-body text-xs text-slate">
        Notes for our team (optional — terms, minimum orders, collection or delivery)
        <input name="notes" maxLength={1000} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Send your price list</SubmitButton>
        <a href="/downloads/supplier-price-list-template.csv" download className="font-body text-xs text-seam-blue hover:underline">
          Use our template (your code, description, unit, price) if it helps
        </a>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
