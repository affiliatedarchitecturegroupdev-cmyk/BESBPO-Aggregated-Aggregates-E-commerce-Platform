"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { sendEnquiry } from "@/app/enquiries/actions";
import { FormMessage, inputClass } from "@/components/account/Forms";

export type EnquiryKind = "PLANT_HIRE" | "SITE_SERVICE" | "BUSINESS_LINE" | "JOB_PACK" | "ESTIMATE" | "PARTNER_APPLICATION";

/** A form-specific question. Its answer is sent in the enquiry's details under `name`. */
export type DetailField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  options?: readonly string[] | readonly { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  min?: number;
  wide?: boolean;
};

const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"];
const label = "font-mono text-[10px] uppercase text-slate";

function Detail({ field }: { field: DetailField }) {
  const name = `d:${field.name}`;
  const title = `${field.label}${field.required ? " *" : ""}`;
  const span = field.wide || field.type === "textarea" ? "sm:col-span-2" : "";
  if (field.type === "select") {
    return (
      <label className={`block ${span}`}>
        <span className={label}>{title}</span>
        <select name={name} required={field.required} defaultValue={field.defaultValue ?? ""} className={inputClass}>
          {!field.defaultValue && <option value="">—</option>}
          {(field.options ?? []).map((o) => {
            const option = typeof o === "string" ? { value: o, label: o } : o;
            return (
              <option key={option.value} value={option.label}>
                {option.label}
              </option>
            );
          })}
        </select>
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <label className={`block ${span}`}>
        <span className={label}>{title}</span>
        <textarea name={name} rows={3} maxLength={500} required={field.required} placeholder={field.placeholder} defaultValue={field.defaultValue} className={inputClass} />
      </label>
    );
  }
  return (
    <label className={`block ${span}`}>
      <span className={label}>{title}</span>
      <input
        name={name}
        type={field.type ?? "text"}
        inputMode={field.type === "number" ? "decimal" : undefined}
        min={field.min}
        step={field.type === "number" ? "any" : undefined}
        maxLength={field.type === "text" || !field.type ? 500 : undefined}
        required={field.required}
        placeholder={field.placeholder}
        defaultValue={field.defaultValue}
        className={inputClass}
      />
    </label>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-50">
      {pending ? "Sending…" : children}
    </button>
  );
}

/**
 * The request form behind every quote-only line (plant hire, services, job
 * packs, the estimator, the further lines and partner applications). It
 * logs an enquiry for sales — nothing is booked or charged from here.
 */
export function EnquiryForm({
  kind,
  subject,
  sku,
  fields = [],
  hidden = {},
  askSite = true,
  askCompany = true,
  messageLabel = "Anything else we should know? (optional)",
  submitLabel = "Request a quote",
}: {
  kind: EnquiryKind;
  subject: string;
  sku?: string;
  fields?: DetailField[];
  /** fixed answers sent with the details (e.g. the estimator's results) */
  hidden?: Record<string, string>;
  askSite?: boolean;
  askCompany?: boolean;
  messageLabel?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState(sendEnquiry, null);
  if (state?.success) return <FormMessage state={state} />;
  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="subject" value={subject} />
      {sku && <input type="hidden" name="sku" value={sku} />}
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={`d:${key}`} value={value} />
      ))}
      {/* Honeypot — hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {fields.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <Detail key={f.name} field={f} />
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Province *</span>
          <select name="province" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose a province
            </option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {askSite && (
          <label className="block">
            <span className={label}>Site town or address</span>
            <input name="siteAddress" maxLength={300} autoComplete="street-address" className={inputClass} />
          </label>
        )}
        <label className="block">
          <span className={label}>Your name *</span>
          <input name="contactName" required minLength={2} maxLength={120} autoComplete="name" className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Email *</span>
          <input name="contactEmail" type="email" required maxLength={200} autoComplete="email" className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Phone</span>
          <input name="contactPhone" type="tel" maxLength={20} autoComplete="tel" className={inputClass} />
        </label>
        {askCompany && (
          <label className="block">
            <span className={label}>Company (optional)</span>
            <input name="companyName" maxLength={160} autoComplete="organization" className={inputClass} />
          </label>
        )}
      </div>
      <label className="block">
        <span className={label}>{messageLabel}</span>
        <textarea name="message" rows={3} maxLength={4000} className={inputClass} />
      </label>
      <label className="flex items-start gap-2 font-body text-xs text-slate">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {kind === "PARTNER_APPLICATION"
            ? "Besbpo Group (Pty) Ltd may use these details to assess my application and contact me about onboarding, as set out in the "
            : "Besbpo Group (Pty) Ltd may use these details to reply to this request, and share the job details (not my contact details, unless I agree) with the partners who would do the work, as set out in the "}
          <Link href="/legal/privacy-policy" className="text-seam-blue hover:underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <Submit>{submitLabel}</Submit>
    </form>
  );
}
