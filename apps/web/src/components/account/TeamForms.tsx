"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { inviteMember, saveCompanySettings } from "@/app/account/team/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";
import { COMPANY_ROLE_HINT, COMPANY_ROLE_LABEL, type CompanyRole } from "@/lib/company-accounts";

const ROLES: CompanyRole[] = ["BUYER", "APPROVER", "ACCOUNTS", "ADMIN"];

/** Company admin: invite a colleague by email, as a buyer (with an optional limit per order), approver, accounts person or admin. */
export function InviteForm() {
  const [state, action] = useFormState(inviteMember, null);
  const [role, setRole] = useState<CompanyRole>("BUYER");
  return (
    <form action={action} className="space-y-3 rounded-sm border border-basalt/10 bg-white p-4">
      <h3 className="font-display text-base font-bold text-basalt">Invite someone</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block font-body text-xs text-slate">
          Their email address
          <input name="email" type="email" required maxLength={200} className={inputClass} placeholder="buyer@yourcompany.co.za" />
        </label>
        <label className="block font-body text-xs text-slate">
          Role
          <select name="companyRole" value={role} onChange={(e) => setRole(e.target.value as CompanyRole)} className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {COMPANY_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px]">{COMPANY_ROLE_HINT[role]}</span>
        </label>
        {role === "BUYER" && (
          <label className="block font-body text-xs text-slate">
            Limit per order (R, optional)
            <input name="spendLimit" type="number" min={1} step="0.01" className={inputClass} placeholder="No limit of their own" />
            <span className="mt-1 block text-[11px]">Orders above it wait for an approver.</span>
          </label>
        )}
      </div>
      <SubmitButton>Send the invitation</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

/** Company admin: the approval threshold for every buyer, and whether every order needs a PO number. */
export function CompanySettingsForm({ approvalThreshold, requirePurchaseOrder }: { approvalThreshold: string | null; requirePurchaseOrder: boolean }) {
  const [state, action] = useFormState(saveCompanySettings, null);
  return (
    <form action={action} className="space-y-3 rounded-sm border border-basalt/10 bg-white p-4">
      <h3 className="font-display text-base font-bold text-basalt">Ordering rules</h3>
      <label className="block max-w-sm font-body text-xs text-slate">
        Any buyer&apos;s order above this waits for approval (R, optional)
        <input name="approvalThreshold" type="number" min={1} step="0.01" defaultValue={approvalThreshold ?? ""} className={inputClass} placeholder="No company-wide threshold" />
      </label>
      <label className="flex items-center gap-2 font-body text-sm text-basalt">
        <input type="checkbox" name="requirePurchaseOrder" defaultChecked={requirePurchaseOrder} className="h-4 w-4 accent-seam-blue" />
        Every order needs our purchase-order number
      </label>
      <SubmitButton>Save</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
