import Link from "next/link";
import { api } from "@/lib/api";
import { getSession, sessionToken } from "@/lib/session";
import { eraseSubscriber, syncNewsletter } from "@/app/admin/careers/actions";
import { ActionForm, SubmitButton } from "@/components/account/Forms";

export const metadata = { title: "Newsletter" };

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  audience: "CUSTOMER" | "CONTRACTOR" | "PARTNER" | "OTHER";
  province: string | null;
  source: string | null;
  consentAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  listmonkId: number | null;
  listmonkSyncedAt: string | null;
  listmonkError: string | null;
};

type ListmonkStatus = { live: boolean; missingEnvVars: string[]; url: string | null; listIds: number[]; unsynced: number };

const AUDIENCE = { CUSTOMER: "Customer", CONTRACTOR: "Contractor", PARTNER: "Partner", OTHER: "Other" } as const;
const FILTERS = [
  { key: "active", label: "Subscribed" },
  { key: "pending", label: "Awaiting confirmation" },
  { key: "unsubscribed", label: "Unsubscribed" },
  { key: "all", label: "All" },
] as const;

export default async function AdminNewsletterPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = FILTERS.find((f) => f.key === searchParams.status)?.key ?? "active";
  const [user, result] = await Promise.all([
    getSession(),
    api<{ subscribers: Subscriber[]; active: number; pending: number; unsubscribed: number; byAudience: Partial<Record<Subscriber["audience"], number>>; listmonk: ListmonkStatus }>(
      `/newsletter/admin/subscribers?status=${status}`,
      { token: sessionToken() },
    ),
  ]);
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const { subscribers, active, pending, unsubscribed, byAudience, listmonk } = result.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-basalt">Newsletter</h2>
          <p className="font-body text-xs text-slate">
            Sign-ups from the strip above the footer. Each one ticked the consent box (POPIA s69), then confirmed by clicking the link we emailed (double
            opt-in). Only confirmed subscribers are exported or sent to Listmonk.
          </p>
        </div>
        <a href="/api/admin/newsletter/export" className="rounded-sm bg-seam-blue px-3 py-1.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
          Export subscribers (CSV)
        </a>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Subscribed" value={active} />
        {(Object.keys(AUDIENCE) as Subscriber["audience"][]).map((a) => (
          <Stat key={a} label={AUDIENCE[a]} value={byAudience[a] ?? 0} />
        ))}
        <Stat label="Awaiting confirmation" value={pending} />
        <Stat label="Unsubscribed" value={unsubscribed} />
      </div>
      <section className={`rounded-sm border p-4 font-body text-sm ${listmonk.live ? "border-seam-blue/30 bg-seam-blue/5" : "border-ochre-gold/40 bg-ochre-gold/10"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-basalt">Listmonk {listmonk.live ? "— connected" : "— not connected yet"}</h3>
            {listmonk.live ? (
              <p className="mt-1 text-xs text-slate">
                Confirmed subscribers go to list{listmonk.listIds.length === 1 ? "" : "s"} {listmonk.listIds.join(", ")} as soon as they confirm; unsubscribes go both
                ways, and the full sync runs every hour. {listmonk.unsynced > 0 ? `${listmonk.unsynced} confirmed subscriber(s) not in Listmonk yet.` : "Everyone is in sync."}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate">
                Sign-ups are kept here until it&apos;s set up. Still needed on the API service: {listmonk.missingEnvVars.join(", ")} (docs/email.md).
              </p>
            )}
          </div>
          {listmonk.live && (
            <ActionForm action={syncNewsletter} className="flex items-center gap-2">
              <SubmitButton variant="subtle">Sync now</SubmitButton>
            </ActionForm>
          )}
        </div>
      </section>
      <p className="font-body text-xs text-slate">
        Campaigns go out from Listmonk with the branded template (docs/listmonk/campaign-template.html), which uses each subscriber&apos;s personal unsubscribe
        link. The CSV export has the same links, for any other email tool.
      </p>
      <nav className="flex gap-2 font-mono text-[11px]">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin/newsletter?status=${f.key}`} aria-current={f.key === status ? "page" : undefined} className={`rounded-sm px-2.5 py-1 ${f.key === status ? "bg-basalt text-limestone" : "bg-white text-slate"}`}>
            {f.label}
          </Link>
        ))}
      </nav>
      {subscribers.length === 0 ? (
        <p className="font-body text-sm text-slate">Nobody here yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-basalt/10 bg-white">
          <table className="w-full font-body text-xs">
            <thead className="bg-limestone/60 text-left font-mono text-[10px] uppercase text-slate">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Province</th>
                <th className="px-3 py-2">Signed up</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Listmonk</th>
                {user?.role === "ADMIN" && <th className="px-3 py-2"><span className="sr-only">Erase</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-basalt/10">
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 text-basalt">{s.email}</td>
                  <td className="px-3 py-2">{s.name ?? "—"}</td>
                  <td className="px-3 py-2">{AUDIENCE[s.audience]}</td>
                  <td className="px-3 py-2">{s.province ?? "—"}</td>
                  <td className="px-3 py-2">{new Date(s.createdAt).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}</td>
                  <td className="px-3 py-2">{s.unsubscribedAt ? "Unsubscribed" : s.confirmedAt ? "Subscribed" : "Awaiting confirmation"}</td>
                  <td className="px-3 py-2" title={s.listmonkError ?? undefined}>
                    {s.listmonkError ? <span className="text-red-700">Sync failed — retries hourly</span> : s.listmonkSyncedAt ? `Synced ${new Date(s.listmonkSyncedAt).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}` : "—"}
                  </td>
                  {user?.role === "ADMIN" && (
                    <td className="px-3 py-2 text-right">
                      <form action={eraseSubscriber}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="text-slate hover:text-red-700" title="Delete this person's record entirely (on request)">Erase</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-basalt/10 bg-white p-3">
      <p className="font-mono text-[10px] uppercase text-slate">{label}</p>
      <p className="font-display text-xl font-bold text-basalt">{value}</p>
    </div>
  );
}
