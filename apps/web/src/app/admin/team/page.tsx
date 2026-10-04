import { notFound } from "next/navigation";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { getSession, sessionToken } from "@/lib/session";
import { addTeamMember, changeTeamRole } from "./actions";

export const metadata = { title: "Team" };

type Member = { id: string; email: string; name: string | null; role: "STAFF" | "ADMIN"; createdAt: string; updatedAt: string };

const ROLES = [
  {
    role: "STAFF",
    label: "Staff",
    can: "Day-to-day running: orders, quotes, trade applications, products and photos, documents, suppliers, site content, promotions, blog, WhatsApp orders, careers and the newsletter list.",
  },
  {
    role: "ADMIN",
    label: "Admin",
    can: "Everything staff can do, plus this Team page, payment-method settings, notification settings, recording photo permissions, and permanently deleting records (vacancies, applications, subscribers).",
  },
] as const;

/** Admin → Team: who can use the admin panel. Admins only. */
export default async function AdminTeamPage() {
  const user = await getSession();
  if (user?.role !== "ADMIN") notFound();
  const result = await api<{ members: Member[]; admins: number; staff: number }>("/team", { token: sessionToken() });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const { members, admins, staff } = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">Team</h2>
        <p className="mt-1 max-w-2xl font-body text-sm text-slate">
          Who can use the admin panel. {admins} admin{admins === 1 ? "" : "s"} · {staff} staff.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {ROLES.map((r) => (
          <div key={r.role} className="rounded-sm border border-basalt/10 bg-white p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-seam-blue">{r.label}</p>
            <p className="mt-1 font-body text-xs leading-5 text-slate">{r.can}</p>
          </div>
        ))}
      </div>

      <section className="rounded-sm border border-basalt/10 bg-white p-4 md:p-5">
        <h3 className="font-display text-base font-bold text-basalt">Add someone</h3>
        <p className="mt-1 font-body text-xs leading-5 text-slate">
          They register on the storefront first (Account → Create account), using their own work email. Then enter that email here. Each person should have
          their own account — never share a login.
        </p>
        <ActionForm action={addTeamMember} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Their account email *</span>
              <input name="email" type="email" required autoComplete="off" className={inputClass} placeholder="name@besbpo.co.za" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Access</span>
              <select name="role" defaultValue="STAFF" className={inputClass}>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <SubmitButton>Give access</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-base font-bold text-basalt">Current team</h3>
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id} className="rounded-sm border border-basalt/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-semibold text-basalt">{m.name || m.email}</p>
                  {m.name && <p className="truncate font-body text-xs text-slate">{m.email}</p>}
                </div>
                <span
                  className={`rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${m.role === "ADMIN" ? "bg-basalt text-limestone" : "bg-seam-blue/10 text-seam-blue"}`}
                >
                  {m.role === "ADMIN" ? "Admin" : "Staff"}
                  {m.id === user.id && " · you"}
                </span>
              </div>
              {m.id === user.id ? (
                <p className="mt-3 font-body text-xs text-slate">You can&apos;t change your own access — another admin can.</p>
              ) : (
                <ActionForm action={changeTeamRole} className="mt-3 space-y-2">
                  <input type="hidden" name="userId" value={m.id} />
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="block min-w-[12rem] flex-1 sm:flex-none">
                      <span className="sr-only">Access for {m.email}</span>
                      <select name="role" defaultValue={m.role} className={inputClass}>
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                        <option value="CUSTOMER">Remove from team</option>
                      </select>
                    </label>
                    <SubmitButton variant="subtle">Update</SubmitButton>
                  </div>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
        <p className="font-body text-xs text-slate">
          Removing someone turns their account back into a normal customer account; their orders and history stay. Changes apply on their next click.
        </p>
      </section>
    </div>
  );
}
