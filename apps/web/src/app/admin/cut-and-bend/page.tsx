import Link from "next/link";
import { ScheduleStatus } from "@/components/steel/ScheduleParts";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { kg, STATUS_LABEL, type ScheduleSummary } from "@/lib/bar-schedule";
import { formatZAR } from "@/lib/pricing";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Cut & bend" };

/**
 * Bar bending schedules to price (STEEL_CATALOGUE.md, Phase S2). Price the
 * steel, cutting, bending and delivery with a merchant, then send the
 * written quote from the schedule's page.
 */
export default async function AdminCutAndBendPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status && STATUS_LABEL[searchParams.status] ? searchParams.status : undefined;
  const result = await api<{ schedules: ScheduleSummary[]; counts: Record<string, number> }>(`/cut-and-bend/admin${status ? `?status=${status}` : ""}`, { token: sessionToken() });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const { schedules, counts } = result.data;
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-basalt">Cut &amp; bend schedules</h1>
      <p className="mt-1 max-w-3xl font-body text-sm text-slate">
        Customers&apos; bar bending schedules, totalled by SANS 920 nominal mass. Download the rows as CSV (or the customer&apos;s file) for the merchant, then send the
        written quote from the schedule. Nothing is made until the customer accepts.
      </p>
      <nav className="mt-4 flex flex-wrap gap-2 font-body text-xs" aria-label="Filter by status">
        <Link href="/admin/cut-and-bend" className={`rounded-sm px-3 py-1.5 ${!status ? "bg-basalt text-limestone" : "border border-basalt/20 bg-white text-basalt"}`}>All</Link>
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <Link key={key} href={`/admin/cut-and-bend?status=${key}`} className={`rounded-sm px-3 py-1.5 ${status === key ? "bg-basalt text-limestone" : "border border-basalt/20 bg-white text-basalt"}`}>
            {label} ({counts[key] ?? 0})
          </Link>
        ))}
      </nav>
      {schedules.length === 0 ? (
        <p className="mt-6 rounded-sm border border-basalt/10 bg-white p-6 font-body text-sm text-slate">No schedules{status ? ` with status "${STATUS_LABEL[status]}"` : " yet"}.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-sm border border-basalt/10 bg-white">
          <table className="w-full min-w-max border-collapse font-body text-sm">
            <thead>
              <tr className="border-b border-basalt/10 text-left text-xs text-slate">
                {["Reference", "Customer", "Project", "Rows / mass", "Required by", "Quote", "Status", "Received"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-basalt/5 last:border-0">
                  <td className="px-3 py-2"><Link href={`/admin/cut-and-bend/${s.id}`} className="font-mono text-xs text-seam-blue hover:underline">{s.reference}</Link></td>
                  <td className="px-3 py-2">{s.companyName ?? s.contactName}</td>
                  <td className="px-3 py-2 text-slate">{s.projectName ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{s.lineCount ? `${s.lineCount} · ${kg(s.totalMassKg)}` : "File only"}{s.fileName && s.lineCount ? " + file" : ""}</td>
                  <td className="px-3 py-2">{s.requiredBy ? formatDate(s.requiredBy) : "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{s.quotedAmount !== null ? formatZAR(s.quotedAmount) : "—"}</td>
                  <td className="px-3 py-2"><ScheduleStatus status={s.status} /></td>
                  <td className="px-3 py-2 text-slate">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
