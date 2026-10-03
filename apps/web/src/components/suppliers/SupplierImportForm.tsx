"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/account/Forms";
import { importSuppliers } from "@/app/account/actions";

/** Uploads the supplier database CSV and shows what changed, or every problem in the file. */
export function SupplierImportForm() {
  const [state, formAction] = useFormState(importSuppliers, null);
  const summary = state?.summary;
  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">
          {state.error}
        </p>
      )}
      {summary && summary.errors.length > 0 && (
        <div role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">
          <p className="font-semibold">Nothing was imported — fix these rows and upload the file again:</p>
          <ul className="mt-2 max-h-60 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs">
            {summary.errors.map((e, i) => (
              <li key={i}>
                {e.line > 0 ? `Line ${e.line}: ` : ""}
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary && summary.errors.length === 0 && (
        <p className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-3 font-body text-sm text-seam-blue">
          Imported: {summary.created} new, {summary.updated} updated, {summary.unchanged} not in this file (left as they
          are). {summary.missingCoordinates > 0 && `${summary.missingCoordinates} still need a map pin.`}
        </p>
      )}
      <label className="block">
        <span className="font-mono text-[10px] uppercase text-slate">Supplier database CSV *</span>
        <input name="file" type="file" required accept=".csv,text/csv" className="mt-1 block w-full font-body text-sm" />
      </label>
      <p className="font-body text-xs text-slate">New verified partners go live in every province; researched leads start inactive (an <code>active</code> column overrides this).</p>
      <SubmitButton>Import</SubmitButton>
    </form>
  );
}
