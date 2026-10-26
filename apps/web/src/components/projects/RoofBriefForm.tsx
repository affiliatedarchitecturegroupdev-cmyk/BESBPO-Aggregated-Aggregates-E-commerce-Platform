"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { estimateRoof, sendRoofBrief } from "@/app/services/complete-roofs/actions";
import { COVERINGS, SHAPES, type Estimate, type RoofBrief } from "@/lib/projects";
import { PROVINCES } from "@/lib/suppliers";

const input = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";
const label = "block font-body text-xs text-slate";
// The site's number style ("1,490" and "135.1"), the same on the server and in every browser.
const n = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });

/**
 * The complete-roof brief (docs/projects.md): the roof's footprint, shape, pitch and covering give an instant
 * take-off — quantities only, never an invented price — and the brief goes to our design team for a proposal.
 */
export function RoofBriefForm({ signedIn }: { signedIn: { name: string | null; email: string } | null }) {
  const [brief, setBrief] = useState<RoofBrief>({ shape: "GABLE", lengthM: 12, widthM: 8, pitchDeg: 26, covering: "CONCRETE_TILE", overhangM: 0.6, insulation: true });
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", siteAddress: "", province: "", notes: "" });
  const [privacy, setPrivacy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await estimateRoof(brief);
      if (result.ok) {
        setEstimate(result.estimate);
        setProblem(null);
      } else setProblem(result.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [brief]);

  const set = <K extends keyof RoofBrief>(key: K, value: RoofBrief[K]) => setBrief((b) => ({ ...b, [key]: value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startSending(async () => {
      const result = await sendRoofBrief({ brief, contactName: contact.name, contactEmail: contact.email, contactPhone: contact.phone, siteAddress: contact.siteAddress, province: contact.province, notes: contact.notes, privacyAccepted: privacy });
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
        <h3 className="font-display text-lg font-bold text-basalt">1. Your roof</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Shape
            <select value={brief.shape} onChange={(e) => set("shape", e.target.value as RoofBrief["shape"])} className={input}>
              {SHAPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Covering
            <select
              value={brief.covering}
              onChange={(e) => {
                const covering = e.target.value as RoofBrief["covering"];
                setBrief((b) => ({ ...b, covering, pitchDeg: COVERINGS.find((c) => c.value === covering)!.pitch }));
              }}
              className={input}
            >
              {COVERINGS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Length, wall to wall (m)
            <input type="number" min={2} max={120} step={0.1} value={brief.lengthM} onChange={(e) => set("lengthM", Number(e.target.value))} className={input} />
          </label>
          <label className={label}>
            Width (span), wall to wall (m)
            <input type="number" min={2} max={60} step={0.1} value={brief.widthM} onChange={(e) => set("widthM", Number(e.target.value))} className={input} />
          </label>
          <label className={label}>
            Pitch (°)
            <input type="number" min={1} max={50} step={0.5} value={brief.pitchDeg} onChange={(e) => set("pitchDeg", Number(e.target.value))} className={input} />
          </label>
          <label className={label}>
            Overhang (m)
            <input type="number" min={0} max={1.5} step={0.05} value={brief.overhangM} onChange={(e) => set("overhangM", Number(e.target.value))} className={input} />
          </label>
        </div>
        <label className="flex items-center gap-2 font-body text-sm text-basalt">
          <input type="checkbox" checked={brief.insulation} onChange={(e) => set("insulation", e.target.checked)} className="h-4 w-4 accent-seam-blue" />
          Include ceiling insulation
        </label>

        <h3 className="pt-2 font-display text-lg font-bold text-basalt">2. Where, and how to reach you</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {!signedIn && (
            <>
              <label className={label}>
                Your name
                <input required minLength={2} maxLength={120} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={input} />
              </label>
              <label className={label}>
                Email
                <input required type="email" maxLength={200} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={input} />
              </label>
            </>
          )}
          <label className={label}>
            Phone (optional)
            <input maxLength={40} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={input} />
          </label>
          <label className={label}>
            Province
            <select required value={contact.province} onChange={(e) => setContact({ ...contact, province: e.target.value })} className={input}>
              <option value="">Choose…</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className={`${label} sm:col-span-2`}>
            Site address (optional)
            <input maxLength={300} value={contact.siteAddress} onChange={(e) => setContact({ ...contact, siteAddress: e.target.value })} className={input} />
          </label>
          <label className={`${label} sm:col-span-2`}>
            Anything else — new build or re-roof, plans available, access, timing
            <textarea rows={3} maxLength={3000} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} className={input} />
          </label>
        </div>
        <label className="flex items-start gap-2 font-body text-xs text-slate">
          <input type="checkbox" required checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-0.5 h-4 w-4 accent-seam-blue" />
          <span>
            I agree that Aggregated Aggregates may use these details to design and quote my roof, as set out in the{" "}
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
        <h3 className="font-display text-lg font-bold text-basalt">Your roof, worked out</h3>
        {problem ? (
          <p className="font-body text-sm text-red-800">{problem}</p>
        ) : !estimate ? (
          <p className="font-body text-sm text-slate">Working it out…</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 font-body text-sm sm:grid-cols-4">
              {[
                ["Roof area", `${n(estimate.takeoff.roofAreaM2)} m²`],
                ["Footprint", `${n(estimate.takeoff.planAreaM2)} m²`],
                ["Rafter run", `${n(estimate.takeoff.rafterLengthM)} m`],
                ["Trusses", `about ${estimate.takeoff.trusses}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-sm bg-limestone/60 p-2">
                  <dt className="font-mono text-[10px] uppercase text-slate">{k}</dt>
                  <dd className="font-display text-base font-bold text-basalt">{v}</dd>
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
              Indicative quantities from common rules of thumb. The engineer&apos;s roof design and the truss plant&apos;s layout set the final numbers; your proposal prices the
              design, materials, trusses and installation as one package.
            </p>
          </>
        )}
      </aside>
    </form>
  );
}
