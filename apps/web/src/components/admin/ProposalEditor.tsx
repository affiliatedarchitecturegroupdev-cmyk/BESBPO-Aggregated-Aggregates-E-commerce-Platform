"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProposal, type ProposalInput } from "@/app/admin/projects/actions";
import { formatZAR } from "@/lib/pricing";
import { LINE_KIND_LABEL, type LineKind, type StaffProject } from "@/lib/projects";

type Line = ProposalInput["lines"][number] & { key: number };
const cell = "w-full rounded-sm border border-basalt/20 px-2 py-1 font-body text-xs";
const KINDS = Object.keys(LINE_KIND_LABEL) as LineKind[];
const cents = (n: number) => Math.round(n * 100) / 100;

/** A starting point from the take-off: one line per item, prices for staff to fill in from the catalogue and partners' quotes. */
function suggested(p: StaffProject): Line[] {
  let key = 0;
  return [
    { key: key++, kind: "DESIGN", description: "Roof design, truss layout and engineer's sign-off", quantity: 1, unit: "", unitPrice: 0, unitCost: null, partnerName: "" },
    { key: key++, kind: "FABRICATION", description: "Engineered timber roof trusses, delivered", quantity: p.takeoff.trusses, unit: "trusses", unitPrice: 0, unitCost: null, partnerName: "" },
    ...p.takeoff.lines
      .filter((l) => l.key !== "trusses")
      .map((l): Line => ({ key: key++, kind: "MATERIALS", description: l.label, quantity: l.quantity, unit: l.unit, unitPrice: 0, unitCost: null, partnerName: "" })),
    { key: key++, kind: "INSTALLATION", description: "Erect trusses and cover the roof", quantity: 1, unit: "", unitPrice: 0, unitCost: null, partnerName: "" },
  ];
}

/** Staff: the proposal's lines (partner and cost staff-only), stage payments, message and validity. */
export function ProposalEditor({ project, editable }: { project: StaffProject; editable: boolean }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>(() =>
    project.lines.length
      ? project.lines.map((l, i) => ({ key: i, kind: l.kind, description: l.description, quantity: Number(l.quantity), unit: l.unit ?? "", unitPrice: Number(l.unitPrice), unitCost: l.unitCost === null ? null : Number(l.unitCost), partnerName: l.partnerName ?? "" }))
      : suggested(project),
  );
  const [milestones, setMilestones] = useState(() => (project.milestones.length ? project.milestones.map((m) => ({ label: m.label, percent: Number(m.percent) })) : project.defaultMilestones));
  const [message, setMessage] = useState(project.proposalMessage ?? "");
  const [validDays, setValidDays] = useState(30);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const total = cents(lines.reduce((s, l) => s + cents(l.quantity * l.unitPrice), 0));
  const costed = lines.filter((l) => l.unitCost !== null);
  const cost = cents(costed.reduce((s, l) => s + cents(l.quantity * (l.unitCost ?? 0)), 0));
  const sell = cents(costed.reduce((s, l) => s + cents(l.quantity * l.unitPrice), 0));
  const percent = cents(milestones.reduce((s, m) => s + m.percent, 0));
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  const save = () => {
    setStatus(null);
    startSaving(async () => {
      const result = await saveProposal(project.id, { lines: lines.map(({ key: _key, ...l }) => l), milestones, message, validDays });
      setStatus(result.ok ? { ok: true, text: project.status === "PROPOSED" ? "Saved. The link you sent no longer works — send the new proposal." : "Saved." } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-sm border border-basalt/10 bg-white">
        <table className="w-full min-w-[980px] font-body text-xs">
          <thead>
            <tr className="text-left text-slate">
              <th className="p-2">Kind</th>
              <th className="p-2">Description (client sees)</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Unit</th>
              <th className="p-2">Price (R)</th>
              <th className="p-2">Our cost (R, staff only)</th>
              <th className="p-2">Partner (staff only)</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} className="border-t border-basalt/5">
                <td className="p-1">
                  <select disabled={!editable} value={l.kind} onChange={(e) => update(l.key, { kind: e.target.value as LineKind })} className={cell} aria-label="Kind">
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {LINE_KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <input disabled={!editable} value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} className={cell} aria-label="Description" />
                </td>
                <td className="w-20 p-1">
                  <input disabled={!editable} type="number" min={0} step="any" value={l.quantity} onChange={(e) => update(l.key, { quantity: num(e.target.value) })} className={cell} aria-label="Quantity" />
                </td>
                <td className="w-20 p-1">
                  <input disabled={!editable} value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value })} className={cell} aria-label="Unit" />
                </td>
                <td className="w-28 p-1">
                  <input disabled={!editable} type="number" min={0} step="0.01" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: num(e.target.value) })} className={cell} aria-label="Price" />
                </td>
                <td className="w-28 p-1">
                  <input
                    disabled={!editable}
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.unitCost ?? ""}
                    onChange={(e) => update(l.key, { unitCost: e.target.value === "" ? null : Number(e.target.value) })}
                    className={cell}
                    aria-label="Our cost"
                  />
                </td>
                <td className="w-36 p-1">
                  <input disabled={!editable} value={l.partnerName} onChange={(e) => update(l.key, { partnerName: e.target.value })} className={cell} aria-label="Partner" />
                </td>
                <td className="whitespace-nowrap p-2 text-right font-semibold">{formatZAR(cents(l.quantity * l.unitPrice))}</td>
                <td className="p-1">
                  {editable && (
                    <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-red-800 hover:underline" aria-label="Remove line">
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 font-body text-sm">
        {editable && (
          <button
            type="button"
            onClick={() => setLines((ls) => [...ls, { key: Math.max(0, ...ls.map((l) => l.key)) + 1, kind: "OTHER", description: "", quantity: 1, unit: "", unitPrice: 0, unitCost: null, partnerName: "" }])}
            className="text-seam-blue hover:underline"
          >
            + Add a line
          </button>
        )}
        <p>
          Total <strong>{formatZAR(total)}</strong>
          {costed.length > 0 && (
            <span className="text-slate">
              {" "}
              · margin on costed lines {formatZAR(cents(sell - cost))}
              {sell > 0 ? ` (${cents(((sell - cost) / sell) * 100)}%)` : ""}
            </span>
          )}
        </p>
      </div>

      <div className="rounded-sm border border-basalt/10 bg-white p-4">
        <h3 className="font-display text-base font-bold text-basalt">Stage payments ({percent}%)</h3>
        <ul className="mt-2 space-y-2">
          {milestones.map((m, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 font-body text-xs">
              <span className="w-5 text-slate">{i + 1}.</span>
              <input disabled={!editable} value={m.label} onChange={(e) => setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={`${cell} max-w-md flex-1`} aria-label={`Stage ${i + 1}`} />
              <input disabled={!editable} type="number" min={0} max={100} step="0.01" value={m.percent} onChange={(e) => setMilestones((ms) => ms.map((x, j) => (j === i ? { ...x, percent: num(e.target.value) } : x)))} className={`${cell} w-20`} aria-label={`Stage ${i + 1} percent`} />
              <span>% · {formatZAR(cents((total * m.percent) / 100))}</span>
              {editable && milestones.length > 1 && (
                <button type="button" onClick={() => setMilestones((ms) => ms.filter((_, j) => j !== i))} className="text-red-800 hover:underline">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {editable && (
          <button type="button" onClick={() => setMilestones((ms) => [...ms, { label: "", percent: 0 }])} className="mt-2 font-body text-xs text-seam-blue hover:underline">
            + Add a stage
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="block font-body text-xs text-slate">
          Message to the client (optional)
          <textarea disabled={!editable} rows={3} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} className={`${cell} mt-1 text-sm`} />
        </label>
        <label className="block font-body text-xs text-slate">
          Valid for (days)
          <input disabled={!editable} type="number" min={1} max={90} value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className={`${cell} mt-1 w-24 text-sm`} />
        </label>
      </div>
      {editable && (
        <button type="button" onClick={save} disabled={saving} className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-60">
          {saving ? "Saving…" : "Save the proposal"}
        </button>
      )}
      {status && (
        <p role={status.ok ? "status" : "alert"} className={`font-body text-sm ${status.ok ? "text-seam-blue" : "text-red-800"}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
