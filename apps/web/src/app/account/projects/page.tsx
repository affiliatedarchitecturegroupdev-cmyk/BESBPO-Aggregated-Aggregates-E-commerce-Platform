import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { PROVINCES } from "@/lib/careers";
import { formatZAR } from "@/lib/pricing";
import { summarise, type ProjectList } from "@/lib/project-lists";
import { requireSession, sessionToken } from "@/lib/session";
import { createProjectList } from "./actions";

export const metadata: Metadata = { title: "Project Lists", robots: { index: false } };

const label = "font-mono text-[10px] uppercase text-slate";
const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

/** The customer's project lists (PROJECT_LISTS.md): materials saved per job, by build stage. */
export default async function ProjectListsPage() {
  await requireSession("/account/projects");
  const result = await api<ProjectList[]>("/project-lists", { token: sessionToken() });
  const lists = result.ok ? result.data : [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-basalt">Project lists</h1>
      <AccountNav current="/account/projects" />
      <p className="mt-6 max-w-2xl font-body text-sm text-slate">
        Plan each job&apos;s materials in one place: save products from any product page under the build stage they&apos;re for, add quantities as the
        drawings firm up, then send the list to your cart or for a quote — or share it with your builder or quantity surveyor.
      </p>
      {!result.ok && <p className="mt-6 font-body text-sm text-slate">{result.message}</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          {result.ok && lists.length === 0 && (
            <div className="rounded-sm border border-dashed border-basalt/25 bg-white p-6 font-body text-sm text-slate">
              <p className="font-semibold text-basalt">No projects yet.</p>
              <p className="mt-1">Start one here, or use <strong>Save to project</strong> on any product page.</p>
            </div>
          )}
          <ul className="space-y-3">
            {lists.map((l) => {
              const s = summarise(l.items);
              return (
                <li key={l.id}>
                  <Link href={`/account/projects/${l.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-basalt/10 bg-white p-4 hover:border-seam-blue">
                    <div className="min-w-0">
                      <p className="font-display text-base font-semibold text-basalt">{l.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate">
                        {[l.siteName, l.province, l.neededBy ? `needed ${date(l.neededBy)}` : null].filter(Boolean).join(" · ") || "No site details"}
                      </p>
                      <p className="mt-0.5 font-body text-xs text-slate">
                        {l.items.length} product{l.items.length === 1 ? "" : "s"} · updated {date(l.updatedAt)}
                        {l.shareToken ? " · shared" : ""}
                      </p>
                    </div>
                    <div className="text-right font-body text-sm">
                      {s.pricedLines > 0 && <p className="font-semibold text-basalt">{formatZAR(s.estimate)}</p>}
                      {s.quotedLines > 0 && <p className="text-xs text-slate">+ {s.quotedLines} to quote</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <section aria-labelledby="new-project" className="h-fit rounded-sm border border-basalt/10 bg-white p-5">
          <h2 id="new-project" className="font-display text-base font-semibold text-basalt">Start a project</h2>
          <ActionForm action={createProjectList} className="mt-3 space-y-3">
            <label className="block">
              <span className={label}>Project name *</span>
              <input name="name" required minLength={2} maxLength={80} placeholder="e.g. House 14 — foundations" className={inputClass} />
            </label>
            <label className="block">
              <span className={label}>Site or suburb</span>
              <input name="siteName" maxLength={120} placeholder="e.g. Erf 214, Midrand" className={inputClass} />
            </label>
            <label className="block">
              <span className={label}>Province</span>
              <select name="province" defaultValue="" className={inputClass}>
                <option value="">—</option>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Materials needed by</span>
              <input name="neededBy" type="date" className={inputClass} />
            </label>
            <SubmitButton>Create project</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
