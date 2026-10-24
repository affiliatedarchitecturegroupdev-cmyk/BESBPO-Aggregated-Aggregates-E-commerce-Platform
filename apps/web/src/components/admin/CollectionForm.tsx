"use client";

import { useFormState } from "react-dom";
import { saveCollection } from "@/app/admin/collections/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";

export type CollectionValues = {
  id?: string;
  title?: string;
  slug?: string;
  subtitle?: string | null;
  description?: string | null;
  skus?: string[];
  rule?: { query?: string; department?: string; category?: string; availability?: string; maxPrice?: number } | null;
  placements?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" }) : "");

/** Staff: one collection — what's in it (picked SKUs and/or a rule), where it shows and when (docs/merchandising.md). */
export function CollectionForm({ values = {}, departments, categories }: { values?: CollectionValues; departments: { slug: string; name: string }[]; categories: { slug: string; name: string }[] }) {
  const [state, action] = useFormState(saveCollection, null);
  const rule = values.rule ?? {};
  const placed = new Set(values.placements ?? []);
  return (
    <form action={action} className="space-y-4 rounded-sm border border-basalt/10 bg-white p-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block font-body text-xs text-slate">
          Title
          <input name="title" required minLength={2} maxLength={80} defaultValue={values.title} placeholder="Carport build" className={inputClass} />
        </label>
        <label className="block font-body text-xs text-slate">
          Link name (leave blank to make one from the title)
          <input name="slug" maxLength={60} defaultValue={values.slug} placeholder="carport-build" className={inputClass} />
        </label>
        <label className="block font-body text-xs text-slate md:col-span-2">
          One line under the title
          <input name="subtitle" maxLength={160} defaultValue={values.subtitle ?? ""} placeholder="Poles, beams, roofing and fixings for a single or double carport" className={inputClass} />
        </label>
        <label className="block font-body text-xs text-slate md:col-span-2">
          Longer copy for the collection&apos;s own page (optional)
          <textarea name="description" rows={3} maxLength={2000} defaultValue={values.description ?? ""} className={inputClass} />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-display text-sm font-bold text-basalt">What&apos;s in it</legend>
        <label className="block font-body text-xs text-slate">
          Hand-picked products — SKUs, one per line or separated by commas (shown first, in this order)
          <textarea name="skus" rows={3} defaultValue={(values.skus ?? []).join("\n")} placeholder={"AA-TMB-KIT-POLE-CARPORT-KIT-SINGLE-3X6-M\nAA-ROF-IBR-047-GALV"} className={`${inputClass} font-mono`} />
        </label>
        <p className="font-body text-xs text-slate">…and/or every product matching a rule:</p>
        <div className="grid gap-3 md:grid-cols-5">
          <label className="block font-body text-xs text-slate md:col-span-2">
            Search words
            <input name="query" maxLength={100} defaultValue={rule.query ?? ""} placeholder="sealant" className={inputClass} />
          </label>
          <label className="block font-body text-xs text-slate">
            Department
            <select name="ruleDepartment" defaultValue={rule.department ?? ""} className={inputClass}>
              <option value="">Any</option>
              {departments.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="block font-body text-xs text-slate">
            Category
            <select name="ruleCategory" defaultValue={rule.category ?? ""} className={inputClass}>
              <option value="">Any</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="block font-body text-xs text-slate">
            Availability
            <select name="availability" defaultValue={rule.availability ?? ""} className={inputClass}>
              <option value="">Any</option>
              <option value="online">Buy online only</option>
              <option value="quote">Quote only</option>
            </select>
          </label>
          <label className="block font-body text-xs text-slate">
            Price up to (R, buy-online only)
            <input name="maxPrice" type="number" min={1} max={1000000} step="1" defaultValue={rule.maxPrice ?? ""} placeholder="500" className={inputClass} />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-display text-sm font-bold text-basalt">Where and when</legend>
        <label className="flex items-center gap-2 font-body text-sm text-basalt">
          <input type="checkbox" name="homepage" defaultChecked={placed.has("HOMEPAGE")} className="accent-seam-blue" /> On the homepage
        </label>
        <details className="font-body text-sm">
          <summary className="cursor-pointer text-seam-blue">On department pages ({[...placed].filter((p) => p.startsWith("DEPARTMENT:")).length} chosen)</summary>
          <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <label key={d.slug} className="flex items-center gap-2 text-xs text-basalt">
                <input type="checkbox" name="department" value={d.slug} defaultChecked={placed.has(`DEPARTMENT:${d.slug}`)} className="accent-seam-blue" /> {d.name}
              </label>
            ))}
          </div>
        </details>
        <p className="font-body text-xs text-slate">Every live collection also has its own page at /collections/&lt;link name&gt;.</p>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block font-body text-xs text-slate">
            Starts (optional)
            <input name="startsAt" type="date" defaultValue={day(values.startsAt)} className={inputClass} />
          </label>
          <label className="block font-body text-xs text-slate">
            Ends (optional, inclusive)
            <input name="endsAt" type="date" defaultValue={day(values.endsAt)} className={inputClass} />
          </label>
          <label className="block font-body text-xs text-slate">
            Order (lower shows first)
            <input name="sortOrder" type="number" min={0} max={999} defaultValue={values.sortOrder ?? 0} className={inputClass} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 font-body text-sm text-basalt">
            <input type="checkbox" name="isActive" defaultChecked={values.isActive ?? true} className="accent-seam-blue" /> Switched on
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{values.id ? "Save collection" : "Create collection"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
