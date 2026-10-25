"use client";

import { useFormState } from "react-dom";
import { saveDeliveryRates } from "@/app/admin/delivery-rates/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";
import { FLATBED_BANDS, FLATBED_LINE_LABEL, FLATBED_LINES, type StaffDeliveryRates } from "@/lib/delivery-rates";

const SIZES = [
  { key: "M3_6", label: "Up to 6 m³" },
  { key: "M3_10", label: "Up to 10 m³" },
  { key: "M3_14_PLUS", label: "14 m³+ (interlink)" },
] as const;
const BANDS = [
  { key: "BAND_30_60", label: "30–60 km" },
  { key: "BAND_60_100", label: "60–100 km" },
] as const;

const FLATBED_HINT: Record<(typeof FLATBED_LINES)[number], string> = {
  steel: "Rebar, mesh, brickforce, structural steel — the merchant's flatbed or crane truck.",
  masonry: "Bricks, blocks, pavers, precast, pipes and roof tiles — the yard's flatbed or crane truck.",
  roofing: "Roof sheets, flashings, insulation, roof timber and connectors — the merchant's flatbed.",
  supplies: "Doors, windows, fencing, tanks, boards, tools, paint and the range — the merchant's own vehicle.",
};

/** Admin: edit the delivery rates and flatbed fees; staff see them read-only. */
export function DeliveryRatesForm({ rates, canEdit }: { rates: StaffDeliveryRates; canEdit: boolean }) {
  const [state, action] = useFormState(saveDeliveryRates, null);
  const money = (name: string, value: number | null | undefined, label: string, required = true) => (
    <label className="block font-body text-xs text-slate">
      {label}
      <input name={name} type="number" min={0} step="0.01" required={required} defaultValue={value ?? ""} disabled={!canEdit} className={inputClass} />
    </label>
  );
  return (
    <form action={action} className="space-y-6">
      <section className="space-y-3 rounded-sm border border-basalt/10 bg-white p-4">
        <h3 className="font-display text-lg font-bold text-basalt">Tipper loads — aggregates and sand</h3>
        <p className="font-body text-xs text-slate">Full loads within 30 km are included in the price; beyond 100 km is quoted. The distances are fixed.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] font-body text-xs">
            <thead>
              <tr className="text-left text-slate">
                <th className="py-1 pr-3">Distance</th>
                {SIZES.map((s) => (
                  <th key={s.key} className="py-1 pr-3">
                    {s.label} (R)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BANDS.map((b) => (
                <tr key={b.key}>
                  <td className="py-1 pr-3 text-basalt">{b.label}</td>
                  {SIZES.map((s) => (
                    <td key={s.key} className="py-1 pr-3">
                      <input
                        aria-label={`${b.label}, ${s.label}`}
                        name={`${b.key}.${s.key}`}
                        type="number"
                        min={0}
                        step="0.01"
                        required
                        defaultValue={rates.bandFees[b.key][s.key]}
                        disabled={!canEdit}
                        className={inputClass}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {money("smallLoadFee", rates.smallLoadFee, "Small load, below the full-load minimum, within 30 km (R)")}
          <label className="block font-body text-xs text-slate">
            Full-load minimum (m³)
            <input name="minBulkM3" type="number" min={0.5} step="0.5" required defaultValue={rates.minBulkM3} disabled={!canEdit} className={inputClass} />
          </label>
          <label className="block font-body text-xs text-slate">
            …or (tons)
            <input name="minBulkTons" type="number" min={0.5} step="0.5" required defaultValue={rates.minBulkTons} disabled={!canEdit} className={inputClass} />
          </label>
          {money("baggedFee", rates.baggedFee, "Bagged goods, within 30 km (R)")}
          <label className="block font-body text-xs text-slate">
            Bagged goods deliver free from (kg)
            <input name="baggedFreeFromKg" type="number" min={1} step="1" required defaultValue={rates.baggedFreeFromKg} disabled={!canEdit} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-sm border border-basalt/10 bg-white p-4">
        <h3 className="font-display text-lg font-bold text-basalt">Flatbed delivery — the supplier&apos;s own truck</h3>
        <p className="font-body text-xs text-slate">
          Until a line has fees, its orders show R0 delivery and the truck&apos;s charge is confirmed with the customer before dispatch. Once set, the fee is shown
          and charged at checkout. When an order needs several lines&apos; trucks, the highest fee applies and the delivery premium covers the other collections.
          With tipper goods in the order, the tipper fee applies instead.
        </p>
        {FLATBED_LINES.map((line) => {
          const rate = rates.flatbed[line];
          return (
            <fieldset key={line} className="rounded-sm border border-basalt/10 p-3">
              <legend className="px-1 font-body text-sm font-semibold text-basalt">{FLATBED_LINE_LABEL[line]}</legend>
              <p className="font-body text-[11px] text-slate">{FLATBED_HINT[line]}</p>
              <label className="mt-2 flex items-center gap-2 font-body text-sm text-basalt">
                <input type="checkbox" name={`${line}.enabled`} defaultChecked={!!rate} disabled={!canEdit} className="h-4 w-4 accent-seam-blue" />
                Charge a flatbed fee at checkout
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FLATBED_BANDS.map((band, i) => (
                  <label key={band} className="block font-body text-xs text-slate">
                    {band} (R)
                    <input name={`${line}.fee${i}`} type="number" min={0} step="0.01" defaultValue={rate?.fees[i] ?? ""} disabled={!canEdit} className={inputClass} />
                  </label>
                ))}
                <label className="block font-body text-xs text-slate">
                  Free from (R of this line, optional)
                  <input name={`${line}.freeFrom`} type="number" min={1} step="0.01" defaultValue={rate?.freeFrom ?? ""} disabled={!canEdit} className={inputClass} />
                </label>
              </div>
            </fieldset>
          );
        })}
      </section>

      {canEdit ? <SubmitButton>Save rates</SubmitButton> : <p className="font-body text-xs text-slate">Only admins can change the rates.</p>}
      <FormMessage state={state} />
    </form>
  );
}
