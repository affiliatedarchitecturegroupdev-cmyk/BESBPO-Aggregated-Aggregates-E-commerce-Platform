"use client";

import { useFormState } from "react-dom";
import { saveDdpPolicy } from "@/app/admin/delivery-premium/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";

export type DdpPolicy = { enabled: boolean; minProducts: number; twoOriginFee: number; threeOriginFee: number; extraOriginFee: number; heavyPerTon: number };

const FIELDS: { name: Exclude<keyof DdpPolicy, "enabled">; label: string; hint: string; step: string }[] = [
  { name: "minProducts", label: "Applies from (different products)", hint: "Orders with fewer products never pay it.", step: "1" },
  { name: "twoOriginFee", label: "2 supply points (R)", hint: "Tier 2 — dual origin.", step: "0.01" },
  { name: "threeOriginFee", label: "3 supply points (R)", hint: "Tier 3 — distributed.", step: "0.01" },
  { name: "extraOriginFee", label: "Each point beyond 3 (R)", hint: "Added per extra supply point.", step: "0.01" },
  { name: "heavyPerTon", label: "Heavy goods, per ton or part (R)", hint: "Aggregates, cement, bricks, steel, roofing and timber from the extra points.", step: "0.01" },
];

/** Admin: edit the premium's rates; staff see them read-only. */
export function DdpPolicyForm({ policy, canEdit }: { policy: DdpPolicy; canEdit: boolean }) {
  const [state, action] = useFormState(saveDdpPolicy, null);
  return (
    <form action={action} className="space-y-4 rounded-sm border border-basalt/10 bg-white p-4">
      <label className="flex items-center gap-2 font-body text-sm text-basalt">
        <input type="checkbox" name="enabled" defaultChecked={policy.enabled} disabled={!canEdit} className="h-4 w-4 accent-seam-blue" />
        Charge the distributed delivery premium
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.name} className="block font-body text-xs text-slate">
            {f.label}
            <input name={f.name} type="number" min={f.name === "minProducts" ? 2 : 0} step={f.step} required defaultValue={policy[f.name]} disabled={!canEdit} className={inputClass} />
            <span className="mt-1 block text-[11px]">{f.hint}</span>
          </label>
        ))}
      </div>
      {canEdit ? <SubmitButton>Save rates</SubmitButton> : <p className="font-body text-xs text-slate">Only admins can change the rates.</p>}
      <FormMessage state={state} />
    </form>
  );
}
