import Link from "next/link";
import { addFleetUnit, linkPartnerUser, savePartner, toggleFleetUnit, unlinkPartnerUser } from "@/app/admin/bookings/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { PLANT, plantBySku, SERVICES, serviceBySku } from "@/data/plant-services";
import { api } from "@/lib/api";
import type { HirePartner } from "@/lib/admin-bookings";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Hire partners" };

const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"];
const STATUS_LABEL = { ONBOARDING: "Onboarding", ACTIVE: "Active — receives offers", SUSPENDED: "Suspended" } as const;
const label = "font-mono text-[10px] uppercase text-slate";

function PartnerFields({ p }: { p?: HirePartner }) {
  return (
    <>
      {p && <input type="hidden" name="id" value={p.id} />}
      <label className="block"><span className={label}>Name *</span><input name="name" required defaultValue={p?.name} className={inputClass} /></label>
      <label className="block">
        <span className={label}>Province *</span>
        <select name="province" required defaultValue={p?.province ?? ""} className={inputClass}>
          <option value="" disabled>Choose…</option>
          {PROVINCES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label className="block"><span className={label}>Town</span><input name="town" defaultValue={p?.town ?? ""} className={inputClass} /></label>
      <label className="block">
        <span className={label}>Status</span>
        <select name="status" defaultValue={p?.status ?? "ONBOARDING"} className={inputClass}>
          {Object.entries(STATUS_LABEL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </label>
      <label className="block"><span className={label}>Contact name</span><input name="contactName" defaultValue={p?.contactName ?? ""} className={inputClass} /></label>
      <label className="block"><span className={label}>Contact email * (staff only)</span><input name="contactEmail" type="email" required defaultValue={p?.contactEmail} className={inputClass} /></label>
      <label className="block"><span className={label}>Contact phone (staff only)</span><input name="contactPhone" defaultValue={p?.contactPhone ?? ""} className={inputClass} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className={label}>Latitude (from a map)</span><input name="latitude" type="number" step="any" defaultValue={p?.latitude ?? ""} className={inputClass} /></label>
        <label className="block"><span className={label}>Longitude</span><input name="longitude" type="number" step="any" defaultValue={p?.longitude ?? ""} className={inputClass} /></label>
      </div>
      <label className="flex items-center gap-2 font-body text-sm"><input type="checkbox" name="payoutDetailsConfirmed" defaultChecked={p?.payoutDetailsConfirmed} /> Bank confirmation letter on file</label>
      <label className="flex items-center gap-2 font-body text-sm"><input type="checkbox" name="isGroupEntity" defaultChecked={p?.isGroupEntity} /> Besbpo Group company (tie-break only)</label>
      <label className="block sm:col-span-2"><span className={label}>Notes (documents checked, insurance expiry…)</span><textarea name="notes" rows={2} defaultValue={p?.notes ?? ""} className={inputClass} /></label>
    </>
  );
}

/**
 * The plant-hire and site-services partner network. A partner gets offers
 * only when Active, with an active fleet unit for the job in its province.
 * Partner logins are ordinary site accounts linked here; contact details
 * stay staff-only.
 */
export default async function HirePartnersPage() {
  const result = await api<HirePartner[]>("/bookings/admin/partners", { token: sessionToken() });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  return (
    <div className="space-y-6">
      <Link href="/admin/bookings" className="font-mono text-xs text-slate hover:text-seam-blue">← Bookings</Link>
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">Hire partners & fleet</h2>
        <p className="mt-1 max-w-3xl font-body text-xs text-slate">
          Add a partner once their documents are checked (applications arrive in Enquiries). Link the account they registered on the site to give them the partner
          portal, record each machine or service they offer per province, and set them Active to start receiving offers.
        </p>
      </div>
      <details className="rounded-sm border border-basalt/10 bg-white p-5">
        <summary className="cursor-pointer font-display text-base font-semibold text-basalt">Add a partner</summary>
        <ActionForm action={savePartner} className="mt-4 grid gap-3 sm:grid-cols-2">
          <PartnerFields />
          <div className="sm:col-span-2"><SubmitButton>Add partner</SubmitButton></div>
        </ActionForm>
      </details>
      {result.data.length === 0 && <p className="font-body text-sm text-slate">No partners yet.</p>}
      <ul className="space-y-4">
        {result.data.map((p) => (
          <li key={p.id} className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-basalt">{p.name}</h3>
              <p className="font-mono text-[11px] text-slate">
                {p.province}{p.town ? ` · ${p.town}` : ""} · {STATUS_LABEL[p.status]} · {p._count.bookings} job(s){p.payoutDetailsConfirmed ? "" : " · bank letter missing"}{p.latitude === null ? " · no map pin" : ""}
              </p>
            </div>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className={label}>Fleet & services</h4>
                {p.fleet.length === 0 ? (
                  <p className="mt-1 text-xs text-slate">None yet — this partner can&apos;t be offered work.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {p.fleet.map((u) => (
                      <li key={u.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-sm px-2 py-1 ${u.isActive ? "bg-limestone/60" : "bg-basalt/5 text-slate"}`}>
                        <span>{(plantBySku(u.sku) ?? serviceBySku(u.sku))?.name ?? u.sku} — {u.label} <span className="text-xs text-slate">({u.province})</span></span>
                        <form action={toggleFleetUnit}>
                          <input type="hidden" name="unitId" value={u.id} />
                          <input type="hidden" name="isActive" value={String(!u.isActive)} />
                          <button className="text-xs text-seam-blue hover:underline">{u.isActive ? "Deactivate" : "Activate"}</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <ActionForm action={addFleetUnit} className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input type="hidden" name="id" value={p.id} />
                  <select name="sku" required defaultValue="" className={inputClass} aria-label="Machine or service">
                    <option value="" disabled>Machine or service…</option>
                    <optgroup label="Plant hire">{PLANT.map((x) => <option key={x.sku} value={x.sku}>{x.name}</option>)}</optgroup>
                    <optgroup label="Site services">{SERVICES.map((x) => <option key={x.sku} value={x.sku}>{x.name}</option>)}</optgroup>
                  </select>
                  <input name="label" required minLength={2} placeholder="Make, model, reg" className={inputClass} aria-label="Label" />
                  <select name="province" required defaultValue={p.province} className={inputClass} aria-label="Province">
                    {PROVINCES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <div className="sm:col-span-3"><SubmitButton variant="subtle">Add to fleet</SubmitButton></div>
                </ActionForm>
              </div>
              <div>
                <h4 className={label}>Portal logins</h4>
                {p.users.length === 0 ? (
                  <p className="mt-1 text-xs text-slate">None — ask the partner to register on the site, then link their email.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {p.users.map((u) => (
                      <li key={u.id} className="flex items-center justify-between gap-2 rounded-sm bg-limestone/60 px-2 py-1">
                        <span>{u.email}</span>
                        <form action={unlinkPartnerUser}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="userId" value={u.id} />
                          <button className="text-xs text-slate hover:text-red-700">Remove</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <ActionForm action={linkPartnerUser} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="email" type="email" required placeholder="Registered email" className={`${inputClass} max-w-xs`} aria-label="Registered email" />
                  <SubmitButton variant="subtle">Link login</SubmitButton>
                </ActionForm>
              </div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-seam-blue">Edit details</summary>
              <ActionForm action={savePartner} className="mt-3 grid gap-3 sm:grid-cols-2">
                <PartnerFields p={p} />
                <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
