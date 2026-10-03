import Link from "next/link";
import type { AdminVacancy } from "@/components/admin/VacancyForm";
import { api } from "@/lib/api";
import { EMPLOYMENT_LABELS, formatClosing } from "@/lib/careers";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Careers" };

const STATUS_STYLE = { OPEN: "text-seam-blue", DRAFT: "text-slate", CLOSED: "text-ochre-gold" } as const;

export default async function AdminCareersPage() {
  const token = sessionToken();
  const [vacancies, fresh] = await Promise.all([
    api<AdminVacancy[]>("/careers/admin/vacancies", { token }),
    api<unknown[]>("/careers/admin/applications?status=NEW", { token }),
  ]);
  if (!vacancies.ok) return <p className="font-body text-sm text-slate">{vacancies.message}</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-basalt">Careers</h2>
          <p className="font-body text-xs text-slate">Job adverts on /careers, and the applications they bring in.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/careers/applications" className="rounded-sm border border-basalt/20 bg-white px-3 py-1.5 font-body text-sm text-basalt hover:border-seam-blue">
            Applications{fresh.ok && fresh.data.length > 0 ? ` (${fresh.data.length} new)` : ""}
          </Link>
          <Link href="/admin/careers/new" className="rounded-sm bg-seam-blue px-3 py-1.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
            New vacancy
          </Link>
        </div>
      </div>
      {vacancies.data.length === 0 ? (
        <p className="rounded-sm border border-dashed border-basalt/20 bg-white p-6 font-body text-sm text-slate">
          No vacancies yet. Until one is open, /careers invites people to join the talent pool.
        </p>
      ) : (
        <ul className="divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white">
          {vacancies.data.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-4 font-body text-sm">
              <div className="min-w-0">
                <Link href={`/admin/careers/${v.id}`} className="font-semibold text-basalt hover:text-seam-blue">{v.title}</Link>
                <p className="text-xs text-slate">
                  {v.department} · {v.location} · {EMPLOYMENT_LABELS[v.employmentType]} · {formatClosing(v.closingDate)}
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px]">
                <Link href={`/admin/careers/applications?vacancyId=${v.id}`} className="text-seam-blue hover:underline">
                  {v._count.applications} application{v._count.applications === 1 ? "" : "s"}
                </Link>
                <span className={STATUS_STYLE[v.status]}>{v.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
