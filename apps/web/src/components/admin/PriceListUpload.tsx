"use client";

import { useFormState } from "react-dom";
import { uploadPriceList } from "@/app/admin/supplier-prices/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";

/** Staff: upload a supplier's price list (docs/supplier-prices.md). Nothing goes live until each line is approved. */
export function PriceListUpload({ suppliers }: { suppliers: { id: string; name: string; province: string }[] }) {
  const [state, action] = useFormState(uploadPriceList, null);
  return (
    <form action={action} className="space-y-3 rounded-sm border border-basalt/10 bg-white p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block font-body text-xs text-slate">
          Supplier
          <select name="supplierLocationId" className={inputClass} defaultValue="">
            <option value="">Not in the list — type the name below</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.province})
              </option>
            ))}
          </select>
        </label>
        <label className="block font-body text-xs text-slate">
          Or the supplier&apos;s name
          <input name="supplierName" maxLength={120} placeholder="Coastal Timber (Pty) Ltd" className={inputClass} />
        </label>
        <label className="block font-body text-xs text-slate">
          Prices valid until (the product goes back to quote-only after this)
          <input name="validUntil" type="date" className={inputClass} />
        </label>
        <label className="block font-body text-xs text-slate">
          Price list (Excel .xlsx or .csv)
          <input name="file" type="file" required accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className={inputClass} />
        </label>
      </div>
      <label className="block font-body text-xs text-slate">
        Notes (optional — terms, delivery, minimum order)
        <input name="notes" maxLength={1000} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Upload and match</SubmitButton>
        <a href="/downloads/supplier-price-list-template.csv" className="font-body text-xs text-seam-blue hover:underline" download>
          Download the template (sku, supplier_code, description, unit, cost)
        </a>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
