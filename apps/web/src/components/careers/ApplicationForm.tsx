import Link from "next/link";
import { applyForJob } from "@/app/careers/actions";
import { ActionForm, Field, inputClass, SubmitButton } from "@/components/account/Forms";
import { PROVINCES } from "@/lib/careers";

const label = "font-mono text-[10px] uppercase text-slate";

/** Apply for a vacancy (vacancyId) or join the talent pool (no vacancyId). */
export function ApplicationForm({ vacancyId, roleTitle }: { vacancyId?: string; roleTitle?: string }) {
  return (
    <ActionForm action={applyForJob} className="space-y-4">
      {vacancyId && <input type="hidden" name="vacancyId" value={vacancyId} />}
      {/* Honeypot — hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="fullName" autoComplete="name" required />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" required />
        <label className="block">
          <span className={label}>Province you live in</span>
          <select name="province" defaultValue="" className={inputClass}>
            <option value="">—</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <Field label="Town or city" name="town" autoComplete="address-level2" />
        <Field label="LinkedIn profile (optional)" name="linkedinUrl" type="url" />
      </div>
      <label className="block">
        <span className={label}>{roleTitle ? `Why you'd be great as ${roleTitle} (optional)` : "What kind of role are you looking for? (optional)"}</span>
        <textarea name="coverNote" rows={4} maxLength={3000} className={inputClass} />
      </label>
      <label className="block">
        <span className={label}>CV * — PDF or Word (.docx), up to 5 MB</span>
        <input
          type="file"
          name="cv"
          required
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="mt-1 block w-full font-body text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-limestone file:px-3 file:py-2 file:font-body file:text-sm file:text-basalt"
        />
      </label>
      <label className="flex items-start gap-2 font-body text-xs text-slate">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          I agree that Besbpo Group (Pty) Ltd may use my application and CV to consider me for{" "}
          {roleTitle ? "this and similar roles" : "suitable roles"}, and keep them for up to 12 months, as set out in the{" "}
          <Link href="/legal/privacy-policy" className="text-seam-blue hover:underline">Privacy Policy</Link>. I can ask for them to be deleted at any time.
        </span>
      </label>
      <SubmitButton>{roleTitle ? "Send my application" : "Join the talent pool"}</SubmitButton>
    </ActionForm>
  );
}
