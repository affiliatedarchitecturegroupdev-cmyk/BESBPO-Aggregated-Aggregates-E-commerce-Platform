import Link from "next/link";
import { api } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";
import { STATUS_LABEL, type ProjectStatus } from "@/lib/projects";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Projects" };

type Row = { id: string; reference: string; packageLabel: string; summary: string; status: ProjectStatus; contactName: string; province: string; total: string | null; createdAt: string };
const FILTERS: (ProjectStatus | "ALL")[] = ["ALL", "BRIEF", "DESIGN", "QUOTING", "PROPOSED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

/** Admin → Projects (docs/projects.md): design-and-build briefs, proposals and jobs. */
export default async function AdminProjectsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = FILTERS.includes(searchParams.status as ProjectStatus) ? (searchParams.status as ProjectStatus) : "ALL";
  const result = await api<Row[]>(`/projects/staff${status === "ALL" ? "" : `?status=${status}`}`, { token: sessionToken() });
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">Design-and-build projects</h2>
        <p className="mt-1 max-w-3xl font-body text-sm text-slate">
          Briefs from <Link href="/services/complete-roofs" className="text-seam-blue hover:underline">Complete roofs</Link> and{" "}
          <Link href="/services/steel-structures" className="text-seam-blue hover:underline">Steel structures</Link>: design them, get the partners&apos; quotes, send the
          proposal with its stage payments, and record each payment as it comes in.
        </p>
      </div>
      <nav aria-label="Filter projects" className="flex flex-wrap gap-2 font-body text-xs">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/projects" : `/admin/projects?status=${f}`}
            aria-current={f === status ? "true" : undefined}
            className={`rounded-full border px-3 py-1 ${f === status ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-basalt hover:border-seam-blue"}`}
          >
            {f === "ALL" ? "All" : STATUS_LABEL[f]}
          </Link>
        ))}
      </nav>
      {!result.ok ? (
        <p className="font-body text-sm text-red-800">{result.message}</p>
      ) : result.data.length === 0 ? (
        <p className="font-body text-sm text-slate">No projects here yet.</p>
      ) : (
        <ul className="divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
          {result.data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 font-body text-sm">
              <span>
                <Link href={`/admin/projects/${p.id}`} className="font-semibold text-seam-blue hover:underline">
                  {p.reference}
                </Link>{" "}
                {p.summary} · {p.contactName}, {p.province}
              </span>
              <span className="text-xs text-slate">
                {new Date(p.createdAt).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}
                {p.total ? ` · ${formatZAR(Number(p.total))}` : ""} · <strong className="text-basalt">{STATUS_LABEL[p.status]}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
