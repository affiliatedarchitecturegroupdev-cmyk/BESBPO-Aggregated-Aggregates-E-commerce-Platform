import { saveVacancy } from "@/app/admin/careers/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { DEPARTMENTS, EMPLOYMENT_LABELS, WORKPLACE_LABELS, type EmploymentType, type VacancyStatus, type WorkplaceType } from "@/lib/careers";

const label = "font-mono text-[10px] uppercase text-slate";

export type AdminVacancy = {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  workplace: WorkplaceType;
  summary: string;
  description: string;
  salary: string | null;
  closingDate: string | null;
  status: VacancyStatus;
  _count: { applications: number };
};

const TEMPLATE = `## About the role

What this person will do, and why it matters.

## What you'll do

- 
- 

## What you'll need

- 
- 

## Nice to have

- 

## What we offer

- `;

/** Write or edit a job advert. The description is Markdown. */
export function VacancyForm({ vacancy }: { vacancy?: AdminVacancy }) {
  return (
    <ActionForm action={saveVacancy} className="space-y-4 rounded-sm border border-basalt/10 bg-white p-5">
      {vacancy && <input type="hidden" name="id" value={vacancy.id} />}
      <datalist id="departments">
        {DEPARTMENTS.map((d) => (
          <option key={d.name} value={d.name} />
        ))}
      </datalist>
      <label className="block">
        <span className={label}>Job title *</span>
        <input name="title" required minLength={3} maxLength={120} defaultValue={vacancy?.title} className={inputClass} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Team / department *</span>
          <input name="department" list="departments" required minLength={2} maxLength={80} defaultValue={vacancy?.department} className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Location * (e.g. Durban, KwaZulu-Natal — or Any province)</span>
          <input name="location" required minLength={2} maxLength={120} defaultValue={vacancy?.location} className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Employment type *</span>
          <select name="employmentType" defaultValue={vacancy?.employmentType ?? "FULL_TIME"} className={inputClass}>
            {Object.entries(EMPLOYMENT_LABELS).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Workplace *</span>
          <select name="workplace" defaultValue={vacancy?.workplace ?? "ON_SITE"} className={inputClass}>
            {Object.entries(WORKPLACE_LABELS).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Salary (optional — blank shows &ldquo;Market related&rdquo;)</span>
          <input name="salary" maxLength={120} defaultValue={vacancy?.salary ?? ""} className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Closing date (optional)</span>
          <input name="closingDate" type="date" defaultValue={vacancy?.closingDate?.slice(0, 10) ?? ""} className={inputClass} />
        </label>
      </div>
      <label className="block">
        <span className={label}>Summary * (one or two sentences for the listing)</span>
        <textarea name="summary" required minLength={10} maxLength={400} rows={2} defaultValue={vacancy?.summary} className={inputClass} />
      </label>
      <label className="block">
        <span className={label}>Full advert * (Markdown: ## heading, - list, **bold**)</span>
        <textarea name="description" required minLength={20} rows={18} defaultValue={vacancy?.description ?? TEMPLATE} className={`${inputClass} font-mono text-xs`} />
      </label>
      <label className="block max-w-xs">
        <span className={label}>Status</span>
        <select name="status" defaultValue={vacancy?.status ?? "DRAFT"} className={inputClass}>
          <option value="DRAFT">Draft — not shown</option>
          <option value="OPEN">Open — live on /careers</option>
          <option value="CLOSED">Closed — taken down</option>
        </select>
      </label>
      <SubmitButton>{vacancy ? "Save" : "Create vacancy"}</SubmitButton>
    </ActionForm>
  );
}
