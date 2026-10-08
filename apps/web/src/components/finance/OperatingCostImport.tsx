"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { importOperatingCosts, type ImportState } from "@/app/admin/finance/actions";
import { inputClass } from "@/components/account/Forms";

const CATEGORY: Record<string, string> = {
  SALARIES: "Salaries & wages",
  RENT: "Rent & premises",
  MARKETING: "Marketing & advertising",
  SOFTWARE: "Software & hosting",
  VEHICLES: "Vehicles & fuel",
  PROFESSIONAL_FEES: "Professional fees",
  BANK_CHARGES: "Bank & card charges",
  INSURANCE: "Insurance",
  OTHER: "Other",
};
const R = (n: number) => `R${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });

function Buttons({ canImport, rows, setApply }: { canImport: boolean; rows: number; setApply: (v: string) => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" onClick={() => setApply("")} disabled={pending} className="rounded-sm border border-basalt/20 px-4 py-2 font-body text-sm font-semibold text-basalt hover:bg-limestone disabled:opacity-50">
        {pending ? "Working…" : "Preview"}
      </button>
      {canImport && (
        <button type="submit" onClick={() => setApply("1")} disabled={pending} className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-50">
          Import {rows} row{rows === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}

/**
 * Operating costs from the accounting system: upload the CSV export, check the
 * preview (months, totals, the category each row mapped to, any errors), then
 * import. Re-importing a month replaces that month's imported rows only.
 */
export function OperatingCostImport() {
  const [state, action] = useFormState<ImportState, FormData>(importOperatingCosts, null);
  const applyRef = useRef<HTMLInputElement>(null);
  const p = state?.preview;
  const canImport = Boolean(p && !p.applied && p.errors.length === 0 && p.rows.length > 0);

  return (
    <details className="mt-3 rounded-sm border border-basalt/10 bg-white p-3 font-body text-sm" open={Boolean(state)}>
      <summary className="cursor-pointer font-semibold text-basalt">Import from your accounting system (CSV)</summary>
      <p className="mt-2 max-w-3xl text-xs text-slate">
        Export operating expenses from Xero, Sage, QuickBooks or a spreadsheet as CSV with a month or date, a description and the amount excluding VAT (a category
        or account column helps). Leave out cost of sales and delivery costs — those are recorded per order. Re-importing a month replaces the rows imported for that
        month before; costs added by hand stay. <a href="/downloads/operating-costs-template.csv" className="text-seam-blue underline" download>Download a template</a>.
      </p>
      <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block min-w-[16rem]">
          <span className="font-mono text-[10px] uppercase text-slate">CSV file</span>
          <input name="file" type="file" accept=".csv,text/csv" required className={inputClass} />
        </label>
        <input ref={applyRef} type="hidden" name="apply" defaultValue="" />
        <Buttons canImport={canImport} rows={p?.rows.length ?? 0} setApply={(v) => applyRef.current && (applyRef.current.value = v)} />
      </form>
      {state?.error && (
        <p role="alert" className="mt-3 rounded-sm border border-red-700/30 bg-red-50 p-3 text-red-800">
          {state.error}
        </p>
      )}
      {p && (
        <div className="mt-3 space-y-3">
          {p.applied ? (
            <p className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-3 text-seam-blue">
              Imported {p.rows.length} rows from {state?.fileName}
              {p.replaces ? `, replacing ${p.replaces} previously imported` : ""}. The P&amp;L and Insights now include them.
            </p>
          ) : (
            <p className="text-xs text-slate">
              Preview of {state?.fileName} — nothing is saved yet.
              {p.replaces > 0 && ` Importing replaces ${p.replaces} row(s) imported earlier for these months.`}
              {p.manualInMonths > 0 && ` ${p.manualInMonths} cost(s) added by hand in these months stay — check they aren't also in this file.`}
            </p>
          )}
          <ul className="flex flex-wrap gap-2 text-xs">
            {p.months.map((m) => (
              <li key={m.month} className="rounded-sm bg-limestone px-2 py-1">
                {monthLabel(m.month)}: {m.rows} rows · {R(m.total)}
              </li>
            ))}
          </ul>
          {p.errors.length > 0 && (
            <div role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 text-xs text-red-800">
              <p className="font-semibold">Fix these rows in the file, then preview again:</p>
              <ul className="mt-1 list-disc pl-5">
                {p.errors.slice(0, 20).map((e) => (
                  <li key={e.line}>
                    Line {e.line}: {e.message}
                  </li>
                ))}
              </ul>
              {p.errors.length > 20 && <p className="mt-1">…and {p.errors.length - 20} more.</p>}
            </div>
          )}
          {p.rows.length > 0 && (
            <div className="max-h-96 overflow-auto">
              <table className="w-full min-w-max border-collapse text-xs">
                <thead>
                  <tr className="border-b border-basalt/10 text-left text-slate">
                    <th className="px-2 py-1 font-medium">Line</th>
                    <th className="px-2 py-1 font-medium">Month</th>
                    <th className="px-2 py-1 font-medium">Category</th>
                    <th className="px-2 py-1 font-medium">Description</th>
                    <th className="px-2 py-1 font-medium">Reference</th>
                    <th className="px-2 py-1 text-right font-medium">Amount ex VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {p.rows.map((r) => (
                    <tr key={r.line} className="border-b border-basalt/5">
                      <td className="px-2 py-1 text-slate">{r.line}</td>
                      <td className="px-2 py-1">{r.month}</td>
                      <td className="px-2 py-1">
                        {CATEGORY[r.category] ?? r.category}
                        {!r.categoryMatched && <span className="ml-1 text-ochre-gold">(no match — check)</span>}
                      </td>
                      <td className="px-2 py-1">{r.description}</td>
                      <td className="px-2 py-1 text-slate">{r.reference ?? ""}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{R(r.amountExVat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </details>
  );
}
