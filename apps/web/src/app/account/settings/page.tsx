import type { Metadata } from "next";
import { AccountNav } from "@/components/account/AccountNav";
import { ActionForm, Field, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import type { SavedAddress } from "@/lib/account-types";
import { requireSession, sessionToken } from "@/lib/session";
import { PROVINCES } from "@/lib/suppliers";
import { addSavedAddress, changePassword, removeSavedAddress, setDefaultAddress, updateProfile } from "../actions";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

const card = "rounded-sm border border-basalt/10 bg-white";

/** Name, password and saved delivery sites for the signed-in customer. */
export default async function SettingsPage() {
  const user = await requireSession("/account/settings");
  const addresses = await api<SavedAddress[]>("/account/addresses", { token: sessionToken() });
  const shared = Boolean(user.company);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="font-mono text-xs text-slate">{user.email}</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-basalt">Account settings</h1>
      <AccountNav current="/account/settings" />

      <section id="addresses" className={`mt-8 ${card}`}>
        <div className="border-b border-basalt/10 px-4 py-3">
          <h2 className="font-body text-sm font-semibold text-basalt">Delivery sites</h2>
          <p className="font-body text-xs text-slate">
            {shared
              ? `Sites you add are shared with everyone at ${user.company!.name}. Your default site is filled in at checkout.`
              : "Your default site is filled in at checkout; pick any other from the list there."}
          </p>
        </div>
        <div className="grid gap-6 p-4 md:grid-cols-2">
          {!addresses.ok ? (
            <p className="font-body text-sm text-slate">{addresses.message}</p>
          ) : (
            <ul className="space-y-3 font-body text-sm">
              {addresses.data.length === 0 && <li className="text-slate">No saved delivery sites yet.</li>}
              {addresses.data.map((a) => (
                <li key={a.id} className="rounded-sm bg-limestone p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong className="text-basalt">{a.label}</strong>
                    <span className="font-mono text-[10px] text-slate">
                      {a.isDefault && <span className="text-seam-blue">DEFAULT</span>}
                      {a.isDefault && shared && " · "}
                      {shared && (a.shared ? "COMPANY" : "PERSONAL")}
                    </span>
                  </div>
                  <p className="text-slate">{[a.addressLine1, a.addressLine2, a.city, a.province, a.postalCode].filter(Boolean).join(", ")}</p>
                  <div className="mt-2 flex gap-4 text-xs">
                    {!a.isDefault && (
                      <form action={setDefaultAddress}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="text-seam-blue hover:underline">Make default</button>
                      </form>
                    )}
                    <form action={removeSavedAddress}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-slate hover:text-basalt" aria-label={`Remove ${a.label}`}>Remove</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={addSavedAddress} className="grid content-start gap-3 sm:grid-cols-2">
            <Field label="Site name (e.g. Ballito house)" name="label" required />
            <Field label="Postal code" name="postalCode" required />
            <div className="sm:col-span-2"><Field label="Street address" name="addressLine1" required /></div>
            <div className="sm:col-span-2"><Field label="Complex, unit or site notes" name="addressLine2" /></div>
            <Field label="City / town" name="city" required />
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Province *</span>
              <select name="province" defaultValue="KwaZulu-Natal" className={inputClass}>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2"><SubmitButton variant="subtle">Save delivery site</SubmitButton></div>
          </ActionForm>
        </div>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className={`${card} p-4`}>
          <h2 className="font-body text-sm font-semibold text-basalt">Your name</h2>
          <p className="font-body text-xs text-slate">Used on your orders, quotes and emails.</p>
          <ActionForm action={updateProfile} className="mt-3 space-y-3">
            <Field label="Full name" name="name" defaultValue={user.name ?? ""} autoComplete="name" />
            <SubmitButton variant="subtle">Save name</SubmitButton>
          </ActionForm>
        </section>

        <section className={`${card} p-4`}>
          <h2 className="font-body text-sm font-semibold text-basalt">Password</h2>
          <p className="font-body text-xs text-slate">At least 10 characters. Signed in with Google or Microsoft? Leave the current password blank to set one.</p>
          <ActionForm action={changePassword} className="mt-3 space-y-3">
            <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" />
            <Field label="New password" name="newPassword" type="password" required minLength={10} autoComplete="new-password" />
            <Field label="Confirm new password" name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" />
            <SubmitButton variant="subtle">Change password</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
