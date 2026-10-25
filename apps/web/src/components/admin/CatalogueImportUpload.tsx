"use client";

import { useFormState } from "react-dom";
import { previewImport } from "@/app/admin/catalogue-import/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";

/** Staff: upload a file of new products (docs/catalogue-import.md). Every row is checked first; nothing is added until confirmed. */
export function CatalogueImportUpload({ suppliers }: { suppliers: { id: string; name: string; province: string }[] }) {
  const [state, action] = useFormState(previewImport, null);
  return (
    <form action={action} className="space-y-3 rounded-sm border border-basalt/10 bg-white p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block font-body text-xs text-slate">
          Product list (Excel .xlsx or .csv)
          <input name="file" type="file" required accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className={inputClass} />
        </label>
        <label className="block font-body text-xs text-slate">
          Supplier (optional — learns its codes and sends costs for approval)
          <select name="supplierLocationId" className={inputClass} defaultValue="">
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.province})
              </option>
            ))}
          </select>
        </label>
        <label className="block font-body text-xs text-slate">
          Costs valid until (optional)
          <input name="validUntil" type="date" className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Check the file</SubmitButton>
        <a href="/downloads/catalogue-import-template.csv" className="font-body text-xs text-seam-blue hover:underline" download>
          Download the template (name, category, unit, sku, brand, standard, size, description, supplier_code, cost)
        </a>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
