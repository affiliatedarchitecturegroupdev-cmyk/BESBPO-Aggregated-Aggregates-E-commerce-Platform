import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { copySharedList } from "@/app/account/projects/actions";
import { ProjectBoard } from "@/components/projects/ProjectBoard";
import { api } from "@/lib/api";
import type { SharedProjectList } from "@/lib/project-lists";

export const metadata: Metadata = { title: "Shared Project List", robots: { index: false, follow: false } };

/** A project list someone shared by link: read-only, with a button to save a copy to your own account. */
export default async function SharedProjectListPage({ params }: { params: { token: string } }) {
  const result = await api<SharedProjectList>(`/project-lists/shared/${encodeURIComponent(params.token)}`);
  if (!result.ok) notFound();
  const list = result.data;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">Shared project list</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-basalt">{list.name}</h1>
      <p className="mt-1 font-body text-sm text-slate">
        {[list.siteName, list.province, list.neededBy ? `materials needed by ${list.neededBy}` : null].filter(Boolean).join(" · ")}
      </p>
      {list.notes && <p className="mt-2 max-w-3xl whitespace-pre-line font-body text-sm text-basalt">{list.notes}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3 print:hidden">
        <form action={copySharedList}>
          <input type="hidden" name="token" value={params.token} />
          <button type="submit" className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">Save a copy to my projects</button>
        </form>
        <p className="font-body text-xs text-slate">Project lists group materials by build stage, with quantities, for one job.</p>
      </div>
      <div className="mt-8">
        <ProjectBoard list={{ name: list.name, siteName: list.siteName }} items={list.items} editable={false} />
      </div>
    </div>
  );
}
