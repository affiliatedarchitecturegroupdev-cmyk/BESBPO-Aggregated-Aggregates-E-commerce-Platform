"use client";

import Link from "next/link";
import { useState } from "react";
import { submitSchedule } from "@/app/reinforcing-steel/cut-and-bend/actions";
import { ActionForm, Field, inputClass, SubmitButton } from "@/components/account/Forms";
import { blankRow, DIAMETERS, kg, MAX_ROWS, parseScheduleCsv, rowMassKg, totalsBySize, type BarType, type ScheduleRow } from "@/lib/bar-schedule";

const label = "font-mono text-[10px] uppercase text-slate";
const cell = "w-full rounded-sm border border-basalt/20 bg-white px-2 py-1.5 font-body text-sm";
const whole = (value: string) => Math.max(0, Math.round(Number(value) || 0));

/**
 * The cut & bend request: schedule rows (typed, or imported from our CSV
 * template) with live SANS 920 mass totals, and/or the schedule file itself.
 */
export function ScheduleForm({ name, email, signedIn, provinces }: { name?: string; email?: string; signedIn: boolean; provinces: readonly string[] }) {
  const [rows, setRows] = useState<ScheduleRow[]>([blankRow("A1")]);
  const [importNote, setImportNote] = useState<string | null>(null);
  const { bySize, totalMassKg } = totalsBySize(rows);
  const today = new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);

  const update = (i: number, patch: Partial<ScheduleRow>) =>
    setRows((rs) =>
      rs.map((r, j) => {
        if (j !== i) return r;
        const next = { ...r, ...patch };
        // Keep the size valid when switching between Y and R.
        if (!DIAMETERS[next.barType].includes(next.diameterMm)) next.diameterMm = DIAMETERS[next.barType].includes(12) ? 12 : DIAMETERS[next.barType][0];
        return next;
      }),
    );

  async function importCsv(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setImportNote("That CSV is larger than 2 MB — attach it as the schedule file below instead.");
      return;
    }
    const { rows: imported, errors } = parseScheduleCsv(await file.text());
    if (imported.length) setRows(imported);
    setImportNote(
      imported.length
        ? `Imported ${imported.length} row${imported.length === 1 ? "" : "s"}.${errors.length ? ` ${errors.length} line${errors.length === 1 ? "" : "s"} skipped: ${errors.slice(0, 3).join(" ")}` : ""}`
        : errors[0] ?? "No rows found.",
    );
  }

  // Rows that are still the untouched starter row aren't sent.
  const filled = rows.filter((r) => r.barMark.trim());

  return (
    <ActionForm action={submitSchedule} className="space-y-6">
      <input type="hidden" name="lines" value={JSON.stringify(filled)} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset className="min-w-0 rounded-sm border border-basalt/10 bg-white p-5">
        <legend className="px-1 font-display text-base font-semibold text-basalt">1. Your schedule</legend>
        <div className="flex flex-wrap items-center gap-3 font-body text-sm">
          <label className="cursor-pointer rounded-sm border border-seam-blue px-3 py-1.5 font-semibold text-seam-blue hover:bg-seam-blue/5">
            Import rows from CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void importCsv(e.target.files?.[0])} />
          </label>
          <a href="/downloads/bar-bending-schedule-template.csv" download className="text-seam-blue underline-offset-2 hover:underline">
            Download the CSV template
          </a>
          <span className="text-xs text-slate">Or type the rows below — or skip them and just attach your schedule file.</span>
        </div>
        {importNote && <p className="mt-3 rounded-sm bg-limestone/70 p-2 font-body text-xs text-basalt" role="status">{importNote}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse font-body text-sm">
            <thead>
              <tr className="border-b border-basalt/10 text-left text-[11px] text-slate">
                {["Bar mark", "Member", "Type", "Size (mm)", "Shape code", "No. of members", "Bars per member", "Cut length (mm)", "Mass", ""].map((h) => (
                  <th key={h} scope="col" className="px-1 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-basalt/5 align-top">
                  <td className="w-20 px-1 py-1.5"><input aria-label={`Row ${i + 1} bar mark`} value={r.barMark} maxLength={12} onChange={(e) => update(i, { barMark: e.target.value })} className={cell} /></td>
                  <td className="w-32 px-1 py-1.5"><input aria-label={`Row ${i + 1} member`} value={r.member} maxLength={60} onChange={(e) => update(i, { member: e.target.value })} className={cell} /></td>
                  <td className="w-16 px-1 py-1.5">
                    <select aria-label={`Row ${i + 1} bar type`} value={r.barType} onChange={(e) => update(i, { barType: e.target.value as BarType })} className={cell}>
                      <option value="Y">Y</option>
                      <option value="R">R</option>
                    </select>
                  </td>
                  <td className="w-20 px-1 py-1.5">
                    <select aria-label={`Row ${i + 1} size`} value={r.diameterMm} onChange={(e) => update(i, { diameterMm: Number(e.target.value) })} className={cell}>
                      {DIAMETERS[r.barType].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </td>
                  <td className="w-16 px-1 py-1.5"><input aria-label={`Row ${i + 1} shape code`} value={r.shapeCode} inputMode="numeric" maxLength={2} onChange={(e) => update(i, { shapeCode: e.target.value.replace(/\D/g, "").slice(0, 2) })} className={cell} /></td>
                  <td className="w-20 px-1 py-1.5"><input aria-label={`Row ${i + 1} number of members`} type="number" min={1} value={r.members} onChange={(e) => update(i, { members: whole(e.target.value) })} className={cell} /></td>
                  <td className="w-20 px-1 py-1.5"><input aria-label={`Row ${i + 1} bars per member`} type="number" min={1} value={r.barsPerMember} onChange={(e) => update(i, { barsPerMember: whole(e.target.value) })} className={cell} /></td>
                  <td className="w-24 px-1 py-1.5"><input aria-label={`Row ${i + 1} cut length in mm`} type="number" min={100} max={13000} step={5} value={r.lengthMm} onChange={(e) => update(i, { lengthMm: whole(e.target.value) })} className={cell} /></td>
                  <td className="w-24 whitespace-nowrap px-1 py-2.5 text-right tabular-nums text-basalt">{kg(rowMassKg(r))}</td>
                  <td className="w-8 px-1 py-1.5 text-right">
                    <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [blankRow("A1")]))} aria-label={`Remove row ${i + 1}`} className="rounded-sm px-2 py-1 text-slate hover:bg-limestone hover:text-basalt">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={rows.length >= MAX_ROWS}
            onClick={() => setRows((rs) => [...rs, { ...blankRow(""), ...(rs.length ? { barType: rs[rs.length - 1].barType, diameterMm: rs[rs.length - 1].diameterMm, member: rs[rs.length - 1].member } : {}) }])}
            className="rounded-sm border border-basalt/20 px-3 py-1.5 font-body text-sm text-basalt hover:border-seam-blue disabled:opacity-50"
          >
            + Add a row
          </button>
          <p className="font-body text-sm text-basalt" aria-live="polite">
            {filled.length} row{filled.length === 1 ? "" : "s"} · <strong>{kg(totalMassKg)}</strong> ({(totalMassKg / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 })} t) by SANS 920 nominal mass
          </p>
        </div>
        {bySize.length > 0 && totalMassKg > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 font-mono text-[11px] text-basalt">
            {bySize.map((t) => (
              <li key={t.size} className="rounded-sm bg-limestone px-2 py-1">
                {t.size}: {kg(t.massKg)} · {t.bars} bars
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 font-body text-xs text-slate">
          Cut length is the length of one bar before bending, as your engineer&apos;s schedule gives it. Shape codes are the two-digit SANS 282 codes (00 = straight).
          Bars longer than 13 m need a lap.
        </p>

        <label className="mt-5 block">
          <span className={label}>Attach your schedule or drawing (optional) — PDF, Excel, CSV or a photo, up to 10 MB</span>
          <input
            type="file"
            name="file"
            accept=".pdf,.xlsx,.csv,.png,.jpg,.jpeg,application/pdf,text/csv,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-1 block w-full font-body text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-limestone file:px-3 file:py-2 file:font-body file:text-sm file:text-basalt"
          />
        </label>
      </fieldset>

      <fieldset className="min-w-0 rounded-sm border border-basalt/10 bg-white p-5">
        <legend className="px-1 font-display text-base font-semibold text-basalt">2. The job and your details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" name="contactName" autoComplete="name" defaultValue={name} required />
          <Field label="Email" name="contactEmail" type="email" autoComplete="email" defaultValue={email} required />
          <Field label="Phone" name="contactPhone" type="tel" autoComplete="tel" />
          <Field label="Company (optional)" name="companyName" autoComplete="organization" />
          <Field label="Project or job name" name="projectName" />
          <label className="block">
            <span className={label}>Required on site by (optional)</span>
            <input type="date" name="requiredBy" min={today} className={inputClass} />
          </label>
          <label className="block">
            <span className={label}>Province</span>
            <select name="province" defaultValue="" className={inputClass}>
              <option value="">—</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <Field label="Site address" name="siteAddress" autoComplete="street-address" />
        </div>
        <label className="mt-4 block">
          <span className={label}>Anything else (optional) — bundling, tagging, delivery access, collection</span>
          <textarea name="message" rows={3} maxLength={4000} className={inputClass} />
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>Send my schedule for a quote</SubmitButton>
        <p className="font-body text-xs text-slate">
          {signedIn ? (
            <>You&apos;ll accept or decline the quote under <Link href="/account/cut-and-bend" className="text-seam-blue hover:underline">Account → Cut &amp; bend</Link>.</>
          ) : (
            <>
              <Link href="/account/login?next=/reinforcing-steel/cut-and-bend" className="text-seam-blue hover:underline">Sign in</Link> first to accept the quote online — or send it as a guest and reply to our email.
            </>
          )}
        </p>
      </div>
    </ActionForm>
  );
}
