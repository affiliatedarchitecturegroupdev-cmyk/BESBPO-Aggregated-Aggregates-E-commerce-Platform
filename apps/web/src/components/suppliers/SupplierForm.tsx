import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { CATEGORIES } from "@/data/categories";
import { PROVINCES, SUPPLIER_TIER_LABEL, type Supplier } from "@/lib/suppliers";
import { saveSupplier } from "@/app/account/actions";

const labelClass = "font-mono text-[10px] uppercase text-slate";

/** Add or edit a supplier. The name, address and contacts are staff-only; the public sees the town and distance. */
export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  return (
    <ActionForm action={saveSupplier} className="space-y-4 rounded-sm border border-basalt/10 bg-white p-5">
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr]">
        <label className="block">
          <span className={labelClass}>Supplier ID</span>
          <input name="externalId" defaultValue={supplier?.externalId ?? ""} placeholder="SUP-088" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Name *</span>
          <input name="name" required minLength={2} defaultValue={supplier?.name} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Tier *</span>
          <select name="tier" defaultValue={supplier?.tier ?? "TIER_1"} className={inputClass}>
            {Object.entries(SUPPLIER_TIER_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={labelClass}>Address</span>
        <input name="address" defaultValue={supplier?.address ?? ""} className={inputClass} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Town (shown publicly) *</span>
          <input name="city" required minLength={2} defaultValue={supplier?.city} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Province *</span>
          <select name="province" defaultValue={supplier?.province ?? "KwaZulu-Natal"} className={inputClass}>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="rounded-sm border border-basalt/10 p-3">
        <legend className={`${labelClass} px-1`}>Map pin (delivery distances are measured from here)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Latitude</span>
            <input name="latitude" type="number" step="any" min={-35.5} max={-22} defaultValue={supplier?.latitude ?? ""} placeholder="-29.6006" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Longitude</span>
            <input name="longitude" type="number" step="any" min={16} max={33.5} defaultValue={supplier?.longitude ?? ""} placeholder="30.3794" className={inputClass} />
          </label>
        </div>
        <p className="mt-2 font-body text-xs text-slate">
          Take the pin from the supplier&apos;s loading gate on a map (right-click → copy coordinates). Leave both blank
          until confirmed — a supplier without a pin is never used for distance estimates.
        </p>
      </fieldset>
      <fieldset>
        <legend className={labelClass}>Material categories *</legend>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <label key={c.slug} className="flex items-center gap-2 font-body text-sm text-basalt">
              <input type="checkbox" name="categorySlugs" value={c.slug} defaultChecked={supplier?.categorySlugs.includes(c.slug)} />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className={labelClass}>Products and notes</span>
        <textarea name="productNotes" rows={3} defaultValue={supplier?.productNotes ?? ""} className={inputClass} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Contact name</span>
          <input name="contactName" defaultValue={supplier?.contactName ?? ""} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Contact phone</span>
          <input name="contactPhone" type="tel" defaultValue={supplier?.contactPhone ?? ""} className={inputClass} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 font-body text-sm text-basalt">
          <input type="checkbox" name="isVerifiedPartner" defaultChecked={supplier?.isVerifiedPartner ?? true} />
          Verified partner (untick for a researched lead not yet qualified)
        </label>
        <label className="block">
          <span className={labelClass}>Source (researched leads)</span>
          <input name="sourceUrl" type="url" defaultValue={supplier?.sourceUrl ?? ""} placeholder="https://…" className={inputClass} />
        </label>
      </div>
      <label className="flex items-center gap-2 font-body text-sm text-basalt">
        <input type="checkbox" name="isActive" defaultChecked={supplier?.isActive ?? true} />
        Active — a delivery point for coverage and distance estimates (verified partners only)
      </label>
      <SubmitButton>{supplier ? "Save changes" : "Add supplier"}</SubmitButton>
    </ActionForm>
  );
}
