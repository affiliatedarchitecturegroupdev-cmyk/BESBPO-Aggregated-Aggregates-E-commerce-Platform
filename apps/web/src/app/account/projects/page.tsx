import type { Metadata } from "next";
import Link from "next/link";
import { ProposalView } from "@/components/projects/ProposalView";
import { api } from "@/lib/api";
import { STATUS_LABEL, type ClientProject } from "@/lib/projects";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "My projects", robots: { index: false } };

/** My account → Projects (docs/projects.md): the client's design-and-build projects, proposals and stage payments. */
export default async function MyProjectsPage() {
  await requireSession("/account/projects");
  const result = await api<ClientProject[]>("/projects/mine", { token: sessionToken() });
  const projects = result.ok ? result.data : [];
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Link href="/account/dashboard" className="font-body text-sm text-seam-blue hover:underline">
        ← My account
      </Link>
      <h1 className="font-display text-2xl font-bold text-basalt">Design-and-build projects</h1>
      {!result.ok && <p className="font-body text-sm text-red-800">{result.message}</p>}
      {result.ok && projects.length === 0 && (
        <p className="font-body text-sm text-slate">
          No projects yet. <Link href="/services/complete-roofs" className="text-seam-blue hover:underline">Work out a complete roof</Link> and send us the brief.
        </p>
      )}
      {projects.map((p) => (
        <section key={p.id} className="space-y-3 rounded-sm border border-basalt/10 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-basalt">
              {p.summary} <span className="font-mono text-xs text-slate">{p.reference}</span>
            </h2>
            <span className="font-body text-sm font-semibold text-seam-blue">{STATUS_LABEL[p.status]}</span>
          </div>
          {p.proposal ? <ProposalView project={p} /> : <p className="font-body text-sm text-slate">We&apos;re working on your design and proposal — we&apos;ll email you when it&apos;s ready.</p>}
        </section>
      ))}
    </div>
  );
}
