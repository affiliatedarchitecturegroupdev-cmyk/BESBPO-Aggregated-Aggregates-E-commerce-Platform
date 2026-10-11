"use client";

import Link from "next/link";
import { useState } from "react";
import { CUT_TO_LENGTH } from "@/data/roofing";
import { formatZAR } from "@/lib/pricing";

type Row = { length: string; qty: string };

const cell = "w-full rounded-sm border border-basalt/20 bg-white px-2 py-1.5 font-body text-sm";
const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * A cutting list for one roof sheet: lengths (1 m to 14 m) and how many of
 * each. Cut-to-length is always quoted, so this builds a quote request — the
 * total metres as the line (rounded up) and the exact cutting list in the
 * notes for the merchant. Where the sheet is benchmarked, the per-metre list
 * rate gives an estimate.
 */
export function CutToLengthForm({ sku, name, ratePerMetre, initial }: { sku: string; name: string; ratePerMetre: number | null; initial?: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial ?? [{ length: "", qty: "" }]);
  const parsed = rows.map((r) => ({ length: Number(r.length.replace(",", ".")), qty: Math.round(Number(r.qty)) }));
  const valid = parsed.filter((r) => r.length >= CUT_TO_LENGTH.min_m && r.length <= CUT_TO_LENGTH.max_m && r.qty > 0);
  const outOfRange = parsed.some((r) => r.length > 0 && (r.length < CUT_TO_LENGTH.min_m || r.length > CUT_TO_LENGTH.max_m));
  const metres = Math.round(valid.reduce((t, r) => t + r.length * r.qty, 0) * 100) / 100;
  const sheets = valid.reduce((t, r) => t + r.qty, 0);
  const list = valid.map((r) => `${r.qty} x ${num(r.length)} m`).join(", ");
  const href = `/quote?${new URLSearchParams({
    lines: `${sku}~METRE~${Math.ceil(metres)}`,
    notes: `Cut to length — ${name}: ${list} (${sheets} sheets, ${num(metres)} m).`.slice(0, 500),
  }).toString()}`;

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="rounded-sm border border-basalt/10 bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">Cut to length</p>
      <p className="mt-1 font-body text-sm text-slate">
        Any length from {CUT_TO_LENGTH.min_m} m to {CUT_TO_LENGTH.max_m} m, cut by the merchant. List the lengths you need — we send the cutting list with your quote.
      </p>
      <table className="mt-3 w-full">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase text-slate">
            <th className="pb-1 font-normal">Length (m)</th>
            <th className="pb-1 pl-2 font-normal">Sheets</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1">
                <input aria-label={`Length ${i + 1} in metres`} inputMode="decimal" value={r.length} onChange={(e) => update(i, { length: e.target.value })} placeholder="e.g. 4.35" className={cell} />
              </td>
              <td className="py-1 pl-2">
                <input aria-label={`Number of sheets at length ${i + 1}`} type="number" min={1} step={1} value={r.qty} onChange={(e) => update(i, { qty: e.target.value })} placeholder="Qty" className={cell} />
              </td>
              <td className="py-1 pl-2 text-right">
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="font-body text-xs text-slate hover:text-red-800" aria-label={`Remove length ${i + 1}`}>
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={() => setRows((rs) => [...rs, { length: "", qty: "" }])} className="mt-1 font-body text-xs font-semibold text-seam-blue hover:underline">
        + Add a length
      </button>
      {outOfRange && <p className="mt-2 font-body text-xs text-red-800">Lengths must be between {CUT_TO_LENGTH.min_m} m and {CUT_TO_LENGTH.max_m} m.</p>}
      {valid.length > 0 && (
        <p className="mt-3 font-body text-sm text-basalt">
          {sheets} sheet{sheets === 1 ? "" : "s"}, <strong>{num(metres)} m</strong>
          {ratePerMetre !== null && (
            <>
              {" "}
              · estimate <strong>{formatZAR(Math.round(metres * ratePerMetre * 100) / 100)}</strong>
              <span className="block text-xs text-slate">At the list rate of {formatZAR(ratePerMetre)}/m — the merchant confirms the price and lead time on your quote.</span>
            </>
          )}
        </p>
      )}
      <Link
        href={valid.length ? href : "#"}
        aria-disabled={valid.length === 0}
        className={`mt-4 inline-block rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt ${valid.length ? "" : "pointer-events-none opacity-40"}`}
      >
        Request a cut-to-length quote
      </Link>
    </div>
  );
}
