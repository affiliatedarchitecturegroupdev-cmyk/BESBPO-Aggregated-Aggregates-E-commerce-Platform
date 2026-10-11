import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignBriefForm } from "@/components/design/DesignBriefForm";
import { DISCIPLINE_ICON } from "@/components/design/DisciplineIcon";
import { DESIGN_SERVICES, DISCIPLINES, feeLabel, findDesignService } from "@/data/design-services";

export function generateStaticParams() {
  return DESIGN_SERVICES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const s = findDesignService(params.slug);
  if (!s) return {};
  return {
    title: `${s.name} | BAE design services`,
    description: `${s.summary} By Bellwether Architecture & Engineering — send a brief for a fee proposal.`,
    alternates: { canonical: `/design/${s.slug}` },
  };
}

const numeric = (v: string | undefined) => (v && /^\d{1,9}(\.\d+)?$/.test(v) ? v : undefined);

/** One BAE service (DESIGN_SERVICES.md): scope, fee basis and a brief form. */
export default function DesignServicePage({ params, searchParams }: { params: { slug: string }; searchParams: { area?: string; cost?: string } }) {
  const s = findDesignService(params.slug);
  if (!s) notFound();
  const Icon = DISCIPLINE_ICON[s.discipline];
  const related = DESIGN_SERVICES.filter((o) => o.discipline === s.discipline && o.slug !== s.slug).slice(0, 3);
  const basis =
    s.fee.kind === "fixed"
      ? s.fee.scope
      : s.fee.kind === "perM2"
        ? "On the floor area drawn (new floor area for additions)."
        : s.fee.kind === "percent"
          ? "A share of the estimated cost of the building work — a budget figure until the proposal."
          : "Priced from your brief: size, site and what council needs.";
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/design" className="hover:text-seam-blue">Design services</Link> /{" "}
        <Link href={`/design#${s.discipline}`} className="hover:text-seam-blue">{DISCIPLINES[s.discipline].name}</Link> / {s.name}
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="min-w-0">
          <span className="grid h-14 w-14 place-items-center rounded-sm bg-basalt text-ochre-gold">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 font-mono text-xs uppercase tracking-widest text-seam-blue">Bellwether Architecture &amp; Engineering · {DISCIPLINES[s.discipline].name}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-basalt">{s.name}</h1>
          <p className="mt-3 font-body text-sm text-slate">{s.summary}</p>
          <dl className="mt-6 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
            {[
              ["Fee", feeLabel(s.fee)],
              ["Basis", basis],
              ...(s.excludes ? [["Not included", s.excludes]] : []),
              ["Confirmed", "On BAE's written proposal and terms of engagement — nothing is charged until you accept."],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7rem_1fr] gap-3 px-4 py-3">
                <dt className="font-mono text-[11px] uppercase text-slate">{k}</dt>
                <dd className={k === "Fee" ? "font-semibold text-seam-blue" : "text-basalt"}>{v}</dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-8 font-display text-lg font-semibold text-basalt">What you get</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-sm text-basalt">
            {s.deliverables.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <h2 className="mt-6 font-display text-lg font-semibold text-basalt">When you need it</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-sm text-basalt">
            {s.whenNeeded.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          {(s.fee.kind === "percent" || s.fee.kind === "perM2") && (
            <p className="mt-6 font-body text-sm text-slate">
              Budget it with the <Link href="/design#fee-estimator" className="font-semibold text-seam-blue hover:underline">design fee estimator</Link>.
            </p>
          )}
          {s.related && s.related.length > 0 && (
            <div className="mt-6 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-4">
              <p className="font-mono text-[10px] uppercase text-seam-blue">From design to site</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {s.related.map((r) => (
                  <Link key={r.href} href={r.href} className="font-body text-sm font-semibold text-basalt hover:text-seam-blue hover:underline">
                    {r.label} →
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <div id="brief" className="scroll-mt-24 rounded-sm border border-basalt/10 bg-white p-5 md:p-6">
          <h2 className="font-display text-xl font-bold text-basalt">Send a brief</h2>
          <p className="mt-1 font-body text-sm text-slate">BAE replies with questions or a fee proposal. Reply to the confirmation email with any drawings, title deed or photos.</p>
          <div className="mt-5">
            <DesignBriefForm service={s} area={numeric(searchParams.area)} cost={numeric(searchParams.cost)} />
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-basalt">More {DISCIPLINES[s.discipline].name.toLowerCase()}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((o) => (
              <Link key={o.slug} href={`/design/${o.slug}`} className="flex flex-col rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
                <h3 className="font-display text-base font-semibold text-basalt">{o.name}</h3>
                <p className="mt-2 flex-1 font-body text-sm text-slate">{o.summary}</p>
                <p className="mt-3 font-mono text-[11px] text-seam-blue">{feeLabel(o.fee)} →</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
