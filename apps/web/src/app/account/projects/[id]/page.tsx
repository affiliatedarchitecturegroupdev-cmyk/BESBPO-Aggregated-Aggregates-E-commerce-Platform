import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountNav } from "@/components/account/AccountNav";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { ProjectBoard } from "@/components/projects/ProjectBoard";
import { api } from "@/lib/api";
import { PROVINCES } from "@/lib/careers";
import type { ProjectList } from "@/lib/project-lists";
import { requireSession, sessionToken } from "@/lib/session";
import { SITE_URL } from "@/lib/site";
import { deleteProjectList, duplicateProjectList, shareProjectList, updateProjectList } from "../actions";

export const metadata: Metadata = { title: "Project List", robots: { index: false } };

const label = "font-mono text-[10px] uppercase text-slate";
const linkButton = "rounded-sm border border-basalt/20 bg-white px-3 py-1.5 font-body text-sm text-basalt hover:border-seam-blue";

export default async function ProjectListPage({ params }: { params: { id: string } }) {
  await requireSession(`/account/projects/${params.id}`);
  const result = await api<ProjectList>(`/project-lists/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) {
    if (result.status === 404 || result.status === 400) notFound();
    return <p className="mx-auto max-w-6xl px-4 py-10 font-body text-sm text-slate">{result.message}</p>;
  }
  const list = result.data;
  const shareUrl = list.shareToken ? `${SITE_URL}/projects/shared/${list.shareToken}` : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate print:hidden" aria-label="Breadcrumb">
        <Link href="/account/projects" className="hover:text-seam-blue">Project lists</Link> / {list.name}
      </nav>
      <h1 className="mt-2 font-display text-2xl font-bold text-basalt">{list.name}</h1>
      <p className="mt-1 font-body text-sm text-slate">
        {[list.siteName, list.province, list.neededBy ? `materials needed by ${list.neededBy}` : null].filter(Boolean).join(" · ")}
      </p>
      {list.notes && <p className="mt-2 max-w-3xl whitespace-pre-line font-body text-sm text-basalt">{list.notes}</p>}
      <div className="print:hidden">
        <AccountNav current="/account/projects" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <ProjectBoard list={{ id: list.id, name: list.name, siteName: list.siteName }} items={list.items} editable />
        </div>

        <aside className="space-y-6 print:hidden">
          <section aria-labelledby="share" className="rounded-sm border border-basalt/10 bg-white p-5">
            <h2 id="share" className="font-display text-base font-semibold text-basalt">Share with your team</h2>
            <p className="mt-1 font-body text-xs text-slate">
              Anyone with the link sees the products, stages and quantities (never your account details), can order or quote from it, and can save a copy to their own account.
            </p>
            {shareUrl ? (
              <>
                <input readOnly aria-label="Share link" value={shareUrl} className={`${inputClass} font-mono text-xs`} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/projects/shared/${list.shareToken}`} className={linkButton}>Open shared view</Link>
                  <form action={shareProjectList}>
                    <input type="hidden" name="id" value={list.id} />
                    <input type="hidden" name="enabled" value="no" />
                    <button type="submit" className={linkButton}>Stop sharing</button>
                  </form>
                </div>
              </>
            ) : (
              <form action={shareProjectList} className="mt-3">
                <input type="hidden" name="id" value={list.id} />
                <input type="hidden" name="enabled" value="yes" />
                <button type="submit" className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">Create a share link</button>
              </form>
            )}
          </section>

          <section aria-labelledby="details" className="rounded-sm border border-basalt/10 bg-white p-5">
            <h2 id="details" className="font-display text-base font-semibold text-basalt">Project details</h2>
            <ActionForm key={list.updatedAt} action={updateProjectList} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={list.id} />
              <label className="block">
                <span className={label}>Project name *</span>
                <input name="name" required minLength={2} maxLength={80} defaultValue={list.name} className={inputClass} />
              </label>
              <label className="block">
                <span className={label}>Site or suburb</span>
                <input name="siteName" maxLength={120} defaultValue={list.siteName ?? ""} className={inputClass} />
              </label>
              <label className="block">
                <span className={label}>Province</span>
                <select name="province" defaultValue={list.province ?? ""} className={inputClass}>
                  <option value="">—</option>
                  {PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={label}>Materials needed by</span>
                <input name="neededBy" type="date" defaultValue={list.neededBy ?? ""} className={inputClass} />
              </label>
              <label className="block">
                <span className={label}>Notes</span>
                <textarea name="notes" rows={3} maxLength={1000} defaultValue={list.notes ?? ""} className={inputClass} />
              </label>
              <SubmitButton variant="subtle">Save details</SubmitButton>
            </ActionForm>
          </section>

          <section aria-label="Manage list" className="flex flex-wrap gap-2">
            <form action={duplicateProjectList}>
              <input type="hidden" name="id" value={list.id} />
              <button type="submit" className={linkButton}>Duplicate for another job</button>
            </form>
            <form action={deleteProjectList}>
              <input type="hidden" name="id" value={list.id} />
              <button type="submit" className="rounded-sm px-3 py-1.5 font-body text-sm text-slate hover:bg-red-50 hover:text-red-800">Delete project</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
