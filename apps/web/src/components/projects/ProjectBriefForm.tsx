"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { estimateProject, sendProjectBrief } from "@/app/services/project-actions";
import type { Estimate, ProjectPackage } from "@/lib/projects";
import { PROVINCES } from "@/lib/suppliers";

export const briefInput = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";
export const briefLabel = "block font-body text-xs text-slate";
// The site's number style ("1,490" and "135.1"), the same on the server and in every browser.
const n = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });

/**
 * A design-and-build brief (docs/projects.md): the package's own inputs (`children`), an instant take-off that
 * updates as the client types — quantities only, never an invented price — and their details to send it for a
 * proposal. Shared by complete roofs and steel structures.
 */
export function ProjectBriefForm<B extends object>({
  pkg,
  brief,
  signedIn,
  what,
  heading,
  children,
}: {
  pkg: ProjectPackage;
  brief: B;
  signedIn: { name: string | null; email: string } | null;
  /** "roof", "structure" — for the consent and the closing note. */
  what: string;
  heading: string;
  children: React.ReactNode;
}) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", siteAddress: "", province: "", notes: "" });
  const [privacy, setPrivacy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await estimateProject(pkg, brief);
      if (result.ok) {
        setEstimate(result.estimate);
        setProblem(null);
      } else setProblem(result.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [pkg, brief]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startSending(async () => {
      const result = await sendProjectBrief({ pkg, brief, contactName: contact.name, contactEmail: contact.email, contactPhone: contact.phone, siteAddress: contact.siteAddress, province: contact.province, notes: contact.notes, privacyAccepted: privacy });
      if (result.ok) setSent(result.reference);
      else setError(result.error);
    });
  };

  if (sent) {
    return (
      <div role="status" className="rounded-sm border border-seam-blue/30 bg-white p-6 font-body text-sm text-basalt">
        <p className="font-display text-lg font-bold">Thank you — your brief is in. Reference {sent}.</p>
        <p className="mt-2">
          Our design team looks at it and comes back to you, usually within two working days, with any questions. Your proposal follows from the engineer&apos;s design and
          our partners&apos; quotes, with a schedule of stage payments. We&apos;ve emailed you a copy.
        </p>
        {signedIn && (
          <Link href="/account/projects" className="mt-3 inline-block font-semibold text-seam-blue hover:underline">
            See it in My account → Projects
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4 rounded-sm border border-basalt/10 bg-white p-5">
        <h3 className="font-display text-lg font-bold text-basalt">1. {heading}</h3>
        {children}

        <h3 className="pt-2 font-display text-lg font-bold text-basalt">2. Where, and how to reach you</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {!signedIn && (
            <>
              <label className={briefLabel}>
                Your name
                <input required minLength={2} maxLength={120} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={briefInput} />
              </label>
              <label className={briefLabel}>
                Email
                <input required type="email" maxLength={200} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={briefInput} />
              </label>
            </>
          )}
          <label className={briefLabel}>
            Phone (optional)
            <input maxLength={40} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={briefInput} />
          </label>
          <label className={briefLabel}>
            Province
            <select required name="province" value={contact.province} onChange={(e) => setContact({ ...contact, province: e.target.value })} className={briefInput}>
              <option value="">Choose…</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className={`${briefLabel} sm:col-span-2`}>
            Site address (optional)
            <input maxLength={300} value={contact.siteAddress} onChange={(e) => setContact({ ...contact, siteAddress: e.target.value })} className={briefInput} />
          </label>
          <label className={`${briefLabel} sm:col-span-2`}>
            Anything else — plans available, the site, access, timing
            <textarea name="notes" rows={3} maxLength={3000} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} className={briefInput} />
          </label>
        </div>
        <label className="flex items-start gap-2 font-body text-xs text-slate">
          <input type="checkbox" name="privacy" required checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-0.5 h-4 w-4 accent-seam-blue" />
          <span>
            I agree that Aggregated Aggregates may use these details to design and quote my {what}, as set out in the{" "}
            <Link href="/legal/privacy-policy" className="text-seam-blue underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {signedIn && <p className="font-body text-xs text-slate">We&apos;ll email {signedIn.email}.</p>}
        {error && (
          <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">
            {error}
          </p>
        )}
        <button disabled={sending || !!problem} className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-60">
          {sending ? "Sending…" : "Send my brief for a proposal"}
        </button>
      </div>

      <aside className="space-y-3 rounded-sm border border-basalt/10 bg-white p-5" aria-live="polite">
        <h3 className="font-display text-lg font-bold text-basalt">Your {what}, worked out</h3>
        {problem ? (
          <p className="font-body text-sm text-red-800">{problem}</p>
        ) : !estimate ? (
          <p className="font-body text-sm text-slate">Working it out…</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 font-body text-sm sm:grid-cols-4">
              {estimate.takeoff.figures.map((f) => (
                <div key={f.label} className="rounded-sm bg-limestone/60 p-2">
                  <dt className="font-mono text-[10px] uppercase text-slate">{f.label}</dt>
                  <dd className="font-display text-base font-bold text-basalt">
                    {n(f.value)} <span className="font-body text-xs font-normal text-slate">{f.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            {estimate.takeoff.warnings.map((w) => (
              <p key={w} className="rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-2 font-body text-xs text-basalt">
                {w}
              </p>
            ))}
            <table className="w-full font-body text-sm">
              <tbody>
                {estimate.takeoff.lines.map((l) => (
                  <tr key={l.key} className="border-t border-basalt/5 align-top">
                    <td className="py-1.5 pr-2 text-basalt">
                      {l.shopHref ? (
                        <Link href={l.shopHref} className="hover:text-seam-blue hover:underline">
                          {l.label}
                        </Link>
                      ) : (
                        l.label
                      )}
                      {l.note && <span className="block text-[11px] text-slate">{l.note}</span>}
                    </td>
                    <td className="whitespace-nowrap py-1.5 text-right font-semibold text-basalt">
                      {n(l.quantity)} {l.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="font-body text-xs text-slate">
              Indicative quantities from common rules of thumb. The engineer&apos;s design sets the final numbers; your proposal prices the design, materials, manufacture
              and installation as one package.
            </p>
          </>
        )}
      </aside>
    </form>
  );
}
