import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteVacancy } from "@/app/admin/careers/actions";
import { VacancyForm, type AdminVacancy } from "@/components/admin/VacancyForm";
import { api } from "@/lib/api";
import { getSession, sessionToken } from "@/lib/session";

export const metadata = { title: "Edit vacancy" };

export default async function EditVacancyPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  const [user, result] = await Promise.all([getSession(), api<AdminVacancy>(`/careers/admin/vacancies/${encodeURIComponent(params.id)}`, { token: sessionToken() })]);
  if (!result.ok) notFound();
  const vacancy = result.data;
  return (
    <div className="max-w-3xl">
      <Link href="/admin/careers" className="font-mono text-xs text-slate hover:text-seam-blue">← Careers</Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-basalt">{vacancy.title}</h2>
        <div className="flex gap-3 font-mono text-[11px]">
          {vacancy.status === "OPEN" && <Link href={`/careers/${vacancy.slug}`} className="text-seam-blue hover:underline">View advert ↗</Link>}
          <Link href={`/admin/careers/applications?vacancyId=${vacancy.id}`} className="text-seam-blue hover:underline">
            {vacancy._count.applications} application{vacancy._count.applications === 1 ? "" : "s"}
          </Link>
        </div>
      </div>
      {searchParams.created && <p className="mt-2 font-body text-sm text-seam-blue">Vacancy created.</p>}
      <div className="mt-4">
        <VacancyForm vacancy={vacancy} />
      </div>
      {user?.role === "ADMIN" && vacancy._count.applications === 0 && (
        <form action={deleteVacancy} className="mt-4">
          <input type="hidden" name="id" value={vacancy.id} />
          <button className="font-body text-xs text-slate hover:text-red-700">Delete this vacancy</button>
        </form>
      )}
    </div>
  );
}
