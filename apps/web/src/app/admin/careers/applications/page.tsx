import Link from "next/link";
import { deleteApplication, updateApplication } from "@/app/admin/careers/actions";
import type { AdminVacancy } from "@/components/admin/VacancyForm";
import { api } from "@/lib/api";
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@/lib/careers";
import { getSession, sessionToken } from "@/lib/session";

export const metadata = { title: "Job applications" };

type Application = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  province: string | null;
  town: string | null;
  linkedinUrl: string | null;
  coverNote: string | null;
  cvFileName: string;
  cvSizeBytes: number;
  status: ApplicationStatus;
  staffNotes: string | null;
  createdAt: string;
  vacancy: { id: string; title: string; slug: string } | null;
};

const select = "rounded-sm border border-basalt/20 bg-white px-2 py-1 font-body text-xs";

export default async function ApplicationsPage({ searchParams }: { searchParams: { vacancyId?: string; status?: string } }) {
  const token = sessionToken();
  const query = new URLSearchParams();
  if (searchParams.vacancyId) query.set("vacancyId", searchParams.vacancyId);
  if (searchParams.status) query.set("status", searchParams.status);
  const [user, applications, vacancies] = await Promise.all([
    getSession(),
    api<Application[]>(`/careers/admin/applications?${query}`, { token }),
    api<AdminVacancy[]>("/careers/admin/vacancies", { token }),
  ]);
  if (!applications.ok) return <p className="font-body text-sm text-slate">{applications.message}</p>;
  const isAdmin = user?.role === "ADMIN";
  return (
    <div className="space-y-5">
      <Link href="/admin/careers" className="font-mono text-xs text-slate hover:text-seam-blue">← Careers</Link>
      <h2 className="font-display text-xl font-bold text-basalt">Job applications</h2>
      <form className="flex flex-wrap items-end gap-3 rounded-sm border border-basalt/10 bg-white p-3 font-body text-xs">
        <label>
          <span className="block font-mono text-[10px] uppercase text-slate">Role</span>
          <select name="vacancyId" defaultValue={searchParams.vacancyId ?? ""} className={select}>
            <option value="">All roles</option>
            <option value="pool">Talent pool</option>
            {(vacancies.ok ? vacancies.data : []).map((v) => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="block font-mono text-[10px] uppercase text-slate">Status</span>
          <select name="status" defaultValue={searchParams.status ?? ""} className={select}>
            <option value="">Any</option>
            {Object.entries(APPLICATION_STATUS_LABELS).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <button className="rounded-sm bg-basalt px-3 py-1.5 text-limestone">Filter</button>
      </form>
      <p className="font-body text-xs text-slate">
        {applications.data.length} application{applications.data.length === 1 ? "" : "s"}. CVs are private: only signed-in staff can download them. Delete
        applications after 12 months, or sooner if the applicant asks (POPIA).
      </p>
      <ul className="space-y-3">
        {applications.data.map((a) => (
          <li key={a.id} className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-basalt">{a.fullName}</p>
                <p className="text-xs text-slate">
                  <a href={`mailto:${a.email}`} className="text-seam-blue hover:underline">{a.email}</a> · <a href={`tel:${a.phone}`} className="hover:underline">{a.phone}</a>
                  {(a.town || a.province) && ` · ${[a.town, a.province].filter(Boolean).join(", ")}`}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate">
                  {a.vacancy ? a.vacancy.title : "Talent pool"} · {new Date(a.createdAt).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <a href={`/api/admin/careers/applications/${a.id}/cv`} className="rounded-sm border border-basalt/20 px-2 py-1 text-seam-blue hover:border-seam-blue">
                  Download CV ({Math.max(1, Math.round(a.cvSizeBytes / 1024))} KB)
                </a>
                {a.linkedinUrl && (
                  <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-seam-blue hover:underline">LinkedIn ↗</a>
                )}
              </div>
            </div>
            {a.coverNote && <p className="mt-3 whitespace-pre-line rounded-sm bg-limestone/60 p-3 text-xs text-basalt">{a.coverNote}</p>}
            <form action={updateApplication} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={a.id} />
              <select name="status" defaultValue={a.status} className={select} aria-label="Status">
                {Object.entries(APPLICATION_STATUS_LABELS).map(([value, text]) => (
                  <option key={value} value={value}>{text}</option>
                ))}
              </select>
              <input name="staffNotes" defaultValue={a.staffNotes ?? ""} placeholder="Notes (staff only)" maxLength={4000} className={`${select} min-w-[16rem] flex-1`} />
              <button className="rounded-sm bg-seam-blue px-3 py-1 font-body text-xs text-limestone hover:bg-basalt">Save</button>
            </form>
            {isAdmin && (
              <form action={deleteApplication} className="mt-2">
                <input type="hidden" name="id" value={a.id} />
                <button className="font-body text-[11px] text-slate hover:text-red-700">Delete application and CV (POPIA)</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
