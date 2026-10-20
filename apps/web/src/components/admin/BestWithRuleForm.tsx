"use client";

import { useFormState } from "react-dom";
import { saveBestWithRule } from "@/app/admin/best-with/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";

/** Staff: pin or hide one pairing by SKU (docs/best-with.md). */
export function BestWithRuleForm() {
  const [state, action] = useFormState(saveBestWithRule, null);
  return (
    <form action={action} className="grid gap-3 rounded-sm border border-basalt/10 bg-white p-4 md:grid-cols-[1fr_1fr_auto_1.4fr_auto] md:items-end">
      <label className="block font-body text-xs text-slate">
        On this product (SKU)
        <input name="productSku" required maxLength={80} placeholder="AA-SND-02" className={inputClass} />
      </label>
      <label className="block font-body text-xs text-slate">
        Suggest / hide (SKU)
        <input name="pairedSku" required maxLength={80} placeholder="AA-AGR-03" className={inputClass} />
      </label>
      <label className="block font-body text-xs text-slate">
        Rule
        <select name="action" className={inputClass} defaultValue="PIN">
          <option value="PIN">Pin (show first)</option>
          <option value="HIDE">Hide (never show)</option>
        </select>
      </label>
      <label className="block font-body text-xs text-slate">
        Why it goes with it (pins; customers see this)
        <input name="note" maxLength={120} placeholder="Lime makes the plaster workable" className={inputClass} />
      </label>
      <SubmitButton>Save rule</SubmitButton>
      <div className="md:col-span-5">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
