"use client";

import { useState } from "react";
import { clearDeliveryPlan, saveDeliveryPlan } from "@/app/deliveries/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { UNIT_LABEL } from "@/lib/account-types";
import { saTomorrow, type Deliveries } from "@/lib/phase4";

type Row = { scheduledFor: string; quantities: Record<string, string>; notes: string };

const addDays = (day: string, n: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Split an order into dated drops (docs/deliveries.md). Every line must be
 * delivered exactly once across the drops; the running "left to place"
 * figure shows what's still to go. The API checks it all again.
 */
export function DeliveryPlanEditor({ deliveries }: { deliveries: Deliveries }) {
  const { lines } = deliveries;
  const tomorrow = saTomorrow();
  const initial: Row[] = deliveries.drops.length
    ? deliveries.drops.filter((d) => d.status !== "CANCELLED").map((d) => ({ scheduledFor: d.scheduledFor, notes: d.notes ?? "", quantities: Object.fromEntries(d.lines.map((l) => [l.lineItemId, String(l.quantity)])) }))
    : [0, 1].map((i) => ({
        scheduledFor: addDays(tomorrow, i * 7),
        notes: "",
        // A starting point: half now, the rest a week later (whole units stay whole).
        quantities: Object.fromEntries(lines.map((l) => {
          const first = Number.isInteger(l.quantity) ? Math.ceil(l.quantity / 2) : Math.round((l.quantity / 2) * 1000) / 1000;
          return [l.id, String(i === 0 ? first : Math.round((l.quantity - first) * 1000) / 1000)];
        })),
      }));
  const [rows, setRows] = useState<Row[]>(initial);
  const left = (lineId: string, quantity: number) => Math.round((quantity - rows.reduce((n, r) => n + (Number(r.quantities[lineId]) || 0), 0)) * 1000) / 1000;
  const update = (i: number, patch: Partial<Row>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const plan = rows.map((r) => ({
    scheduledFor: r.scheduledFor,
    notes: r.notes || undefined,
    lines: Object.entries(r.quantities).flatMap(([lineItemId, q]) => (Number(q) > 0 ? [{ lineItemId, quantity: Number(q) }] : [])),
  }));
  const balanced = lines.every((l) => left(l.id, l.quantity) === 0);

  return (
    <div className="space-y-4">
      <ActionForm action={saveDeliveryPlan}>
        <input type="hidden" name="orderId" value={deliveries.orderId} />
        <input type="hidden" name="plan" value={JSON.stringify(plan)} />
        <div className="space-y-3">
          {rows.map((row, i) => (
            <fieldset key={i} className="rounded-sm border border-basalt/10 p-3">
              <legend className="px-1 font-mono text-[10px] uppercase text-slate">Drop {i + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Date</span>
                  <input type="date" min={tomorrow} value={row.scheduledFor} onChange={(e) => update(i, { scheduledFor: e.target.value })} className={inputClass} required />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {lines.map((l) => (
                    <label key={l.id} className="block">
                      <span className="font-body text-xs text-basalt">{l.name}</span>
                      <span className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={Number.isInteger(l.quantity) ? 1 : 0.001}
                          value={row.quantities[l.id] ?? ""}
                          onChange={(e) => update(i, { quantities: { ...row.quantities, [l.id]: e.target.value } })}
                          className={inputClass}
                          aria-label={`${l.name}, drop ${i + 1}`}
                        />
                        <span className="mt-1 whitespace-nowrap font-mono text-[11px] text-slate">{UNIT_LABEL[l.unitOfSale as keyof typeof UNIT_LABEL] ?? ""}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="mt-2 block">
                <span className="font-mono text-[10px] uppercase text-slate">Note for this drop (optional)</span>
                <input value={row.notes} maxLength={500} onChange={(e) => update(i, { notes: e.target.value })} className={inputClass} placeholder="e.g. ground-floor slab pour" />
              </label>
              {rows.length > 2 && (
                <button type="button" onClick={() => setRows(rows.filter((_, k) => k !== i))} className="mt-2 font-body text-xs text-red-700 hover:underline">
                  Remove this drop
                </button>
              )}
            </fieldset>
          ))}
        </div>
        <ul className="font-body text-xs">
          {lines.map((l) => {
            const n = left(l.id, l.quantity);
            return (
              <li key={l.id} className={n === 0 ? "text-emerald-700" : "text-ochre-gold"}>
                {l.name}: {n === 0 ? "all placed" : n > 0 ? `${n} left to place` : `${-n} too many`} (of {l.quantity})
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          {rows.length < 12 && (
            <button
              type="button"
              onClick={() => setRows([...rows, { scheduledFor: addDays(rows[rows.length - 1]?.scheduledFor || tomorrow, 7), notes: "", quantities: {} }])}
              className="rounded-sm border border-basalt/20 px-4 py-2 font-body text-sm text-basalt hover:bg-limestone"
            >
              Add a drop
            </button>
          )}
          {balanced ? <SubmitButton>Save delivery plan</SubmitButton> : <span className="font-body text-xs text-slate">Place every unit to save.</span>}
        </div>
      </ActionForm>
      {deliveries.isPhased && (
        <ActionForm action={clearDeliveryPlan}>
          <input type="hidden" name="orderId" value={deliveries.orderId} />
          <SubmitButton variant="subtle">Go back to a single delivery</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
