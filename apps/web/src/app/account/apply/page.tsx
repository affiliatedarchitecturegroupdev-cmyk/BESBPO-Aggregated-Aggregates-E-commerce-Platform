import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, Field, inputClass, SubmitButton } from "@/components/account/Forms";
import { CUSTOMER_TIERS } from "@/data/catalogue";
import { requireSession } from "@/lib/session";
import { applyForTradeAccount } from "../actions";

export const metadata: Metadata = { title: "Apply for a Trade Account", robots: { index: false } };

export default async function ApplyPage() {
  const user = await requireSession("/account/apply");
  if (user.company) redirect("/account/dashboard");
  const tradeTiers = CUSTOMER_TIERS.filter((t) => t.name !== "RETAIL");
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-basalt">Apply for a trade account</h1>
      <p className="mt-1 font-body text-sm text-slate">
        Your company trades at list price while we review the application — usually within one business day. Once
        approved, your tier discount applies to every quote and order.
      </p>
      <div className="mt-8 rounded-sm border border-basalt/10 bg-white p-6">
        <ActionForm action={applyForTradeAccount} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Registered company name" name="companyName" required />
          </div>
          <Field label="Company registration number" name="registrationNumber" />
          <Field label="VAT number" name="vatNumber" />
          <Field label="Contact phone" name="contactPhone" type="tel" autoComplete="tel" />
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Tier requested *</span>
            <select name="requestedTier" required className={inputClass} defaultValue="CONTRACTOR_TRADE">
              {tradeTiers.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.label} — {Math.round(t.discount * 100)}% off
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="font-mono text-[10px] uppercase text-slate">Projects, volumes or standing supply needs</span>
            <textarea name="notes" rows={4} className={inputClass} />
          </label>
          <div className="sm:col-span-2">
            <SubmitButton>Submit application</SubmitButton>
          </div>
        </ActionForm>
      </div>
      <ul className="mt-6 space-y-1 font-body text-xs text-slate">
        {tradeTiers.map((t) => (
          <li key={t.name}>
            <strong className="text-basalt">{t.label}:</strong> {t.definition}
          </li>
        ))}
      </ul>
    </div>
  );
}
