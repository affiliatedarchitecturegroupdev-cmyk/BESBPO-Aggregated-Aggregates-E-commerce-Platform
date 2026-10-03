import Link from "next/link";
import { api } from "@/lib/api";
import { getSession, sessionToken } from "@/lib/session";
import { eraseSubscriber } from "@/app/admin/careers/actions";

export const metadata = { title: "Newsletter" };

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  audience: "CUSTOMER" | "CONTRACTOR" | "PARTNER" | "OTHER";
  province: string | null;
  source: string | null;
  consentAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
};

const AUDIENCE = { CUSTOMER: "Customer", CONTRACTOR: "Contractor", PARTNER: "Partner", OTHER: "Other" } as const;
const FILTERS = [
  { key: "active", label: "Subscribed" },
  { key: "unsubscribed", label: "Unsubscribed" },
  { key: "all", label: "All" },
] as const;

export default async function AdminNewsletterPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = FILTERS.find((f) => f.key === searchParams.status)?.key ?? "active";
  const [user, result] = await Promise.all([
    getSession(),
    api<{ subscribers: Subscriber[]; active: number; unsubscribed: number; byAudience: Partial<Record<Subscriber["audience"], number>> }>(
      `/newsletter/admin/subscribers?status=${status}`,
      { token: sessionToken() },
    ),
  ]);
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const { subscribers, active, unsubscribed, byAudience } = result.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-basalt">Newsletter</h2>
          <p className="font-body text-xs text-slate">Sign-ups from the strip above the footer. Each one ticked the consent box (POPIA s69).</p>
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
        <Stat label="Unsubscribed" value={unsubscribed} />
      </div>
      <p className="font-body text-xs text-slate">
        The export has each subscriber&apos;s personal unsubscribe link. Put it at the bottom of every newsletter (most email tools can merge a CSV column).
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
                  <td className="px-3 py-2">{s.unsubscribedAt ? "Unsubscribed" : "Subscribed"}</td>
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
