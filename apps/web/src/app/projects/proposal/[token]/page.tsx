import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalView } from "@/components/projects/ProposalView";
import { api } from "@/lib/api";
import type { ClientProject } from "@/lib/projects";
import { acceptProposal } from "./actions";

export const metadata: Metadata = { title: "Your proposal", robots: { index: false } };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });

/** The client's link to a design-and-build proposal (docs/projects.md): view it and accept it online. */
export default async function ProposalPage({ params, searchParams }: { params: { token: string }; searchParams: { accepted?: string; error?: string } }) {
  const result = await api<ClientProject>(`/projects/proposal/${encodeURIComponent(params.token)}`);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="mx-auto max-w-3xl px-4 py-12 font-body text-sm text-slate">{result.message}</p>;
  }
  const project = result.data;
  const p = project.proposal;
  if (!p) notFound();
  const expired = p.validUntil !== null && new Date(p.validUntil) <= new Date();
  const open = project.status === "PROPOSED" && !expired;
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-slate">
          {project.packageLabel} · proposal {project.reference}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{project.summary}</h1>
        <p className="mt-1 font-body text-sm text-slate">
          For {project.contactName}
          {project.siteAddress ? ` · ${project.siteAddress}` : ""}, {project.province}
          {p.validUntil ? ` · valid until ${date(p.validUntil)}` : ""}
        </p>
      </div>
      {searchParams.error && (
        <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">
          {searchParams.error}
        </p>
      )}
      {p.acceptedAt && (
        <p role="status" className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-4 font-body text-sm text-basalt">
          {searchParams.accepted ? "Thank you — " : ""}accepted by {p.acceptedName} on {date(p.acceptedAt)}. The first stage payment is now due; we start the design and order the
          trusses and materials once it&apos;s in.
        </p>
      )}
      <ProposalView project={project} />
      {open ? (
        <form action={acceptProposal} className="space-y-3 rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm text-basalt">
          <input type="hidden" name="token" value={params.token} />
          <h2 className="font-display text-lg font-bold">Accept the proposal</h2>
          <label className="block text-xs text-slate">
            Your full name
            <input name="name" required minLength={2} maxLength={120} defaultValue={project.contactName} className="mt-1 w-full max-w-sm rounded-sm border border-basalt/20 px-3 py-2 text-sm text-basalt" />
          </label>
          <label className="flex items-start gap-2 text-xs text-slate">
            <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 accent-seam-blue" />
            <span>
              I accept this proposal, its stage payments and the{" "}
              <Link href="/legal/terms-and-conditions" className="text-seam-blue underline">
                Terms &amp; Conditions
              </Link>{" "}
              (including design-and-build projects).
            </span>
          </label>
          <button className="rounded-sm bg-seam-blue px-5 py-2.5 font-semibold text-limestone hover:bg-basalt">Accept the proposal</button>
        </form>
      ) : (
        !p.acceptedAt && <p className="font-body text-sm text-slate">{expired ? "This proposal has expired — contact us and we'll refresh it." : "This proposal can't be accepted now — contact us."}</p>
      )}
      <p className="font-body text-xs text-slate">
        Questions? Reply to the email this came with, or <Link href="/contact" className="text-seam-blue hover:underline">contact us</Link> quoting {project.reference}.
      </p>
    </div>
  );
}
