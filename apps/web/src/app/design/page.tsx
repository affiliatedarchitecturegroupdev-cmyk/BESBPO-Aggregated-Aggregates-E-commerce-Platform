import type { Metadata } from "next";
import Link from "next/link";
import { DesignBriefForm } from "@/components/design/DesignBriefForm";
import { DesignFeeEstimator } from "@/components/design/DesignFeeEstimator";
import { DISCIPLINE_ICON } from "@/components/design/DisciplineIcon";
import { DESIGN_SERVICES, DISCIPLINES, feeLabel, type Discipline } from "@/data/design-services";

export const metadata: Metadata = {
  title: "Architecture & Engineering Design — House Plans, Structural Design, Council Submissions | BAE",
  description:
    "Bellwether Architecture & Engineering: house plans and council submissions, additions, plan regularisation, structural design and inspections, retaining walls, stormwater and roads, energy (XA) design and bills of quantities — with a fee estimator.",
  alternates: { canonical: "/design" },
};

const STEPS = [
  ["Send a brief", "What you want to build, where, roughly how big — and any drawings, title deed or photos you have."],
  ["Proposal", "BAE replies with a fee proposal and terms of engagement for your project. Nothing is charged until you accept."],
  ["Design", "Concept, drawings and the engineer's design, with your changes, to SANS 10400."],
  ["Council", "BAE submits to your municipality and answers its comments until the plans are approved."],
  ["Quantities", "The bill of quantities becomes a project list in your account, by build stage."],
  ["Build", "Order the materials, hire and site services here — and BAE inspects as the work goes up."],
] as const;

/** BAE's design services (DESIGN_SERVICES.md): disciplines, fixed packages, indicative rates, a fee estimator and a brief form. */
export default function DesignPage() {
  const disciplines = Object.keys(DISCIPLINES) as Discipline[];
  const fixed = DESIGN_SERVICES.filter((s) => s.fee.kind === "fixed");
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Design services
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Bellwether Architecture &amp; Engineering · part of Besbpo Group</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Design it, approve it, then build it from one place</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            BAE is the group&apos;s architecture and engineering practice. Plans and council submissions, structural and civil design, inspections and bills of
            quantities — and the quantities land in your account as a project list, ready to order stage by stage.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#brief" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Send a brief
            </a>
            <a href="#fee-estimator" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Estimate the fees
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <section>
          <h2 className="font-display text-2xl font-bold text-basalt">Fixed-fee packages</h2>
          <p className="mt-1 font-body text-sm text-slate">Defined jobs at one price. Everything else is quoted from your brief.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {fixed.map((s) => (
              <Link key={s.slug} href={`/design/${s.slug}`} className="flex flex-col rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
                <p className="font-mono text-[10px] uppercase text-slate">{DISCIPLINES[s.discipline].name}</p>
                <h3 className="mt-1 font-display text-base font-semibold text-basalt">{s.name}</h3>
                <p className="mt-2 flex-1 font-body text-xs text-slate">{s.fee.kind === "fixed" ? s.fee.scope : s.summary}</p>
                <p className="mt-3 font-display text-lg font-bold text-seam-blue">{feeLabel(s.fee)}</p>
              </Link>
            ))}
          </div>
        </section>

        {disciplines.map((d) => {
          const Icon = DISCIPLINE_ICON[d];
          const services = DESIGN_SERVICES.filter((s) => s.discipline === d);
          return (
            <section key={d} id={d} className="mt-14 scroll-mt-24">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-basalt text-ochre-gold">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-basalt">{DISCIPLINES[d].name}</h2>
                  <p className="font-body text-sm text-slate">{DISCIPLINES[d].blurb}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <Link key={s.slug} href={`/design/${s.slug}`} className="flex flex-col rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
                    <h3 className="font-display text-base font-semibold text-basalt">{s.name}</h3>
                    <p className="mt-2 flex-1 font-body text-sm text-slate">{s.summary}</p>
                    <p className="mt-3 font-mono text-[11px] text-seam-blue">{feeLabel(s.fee)} →</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-basalt">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-sm border border-basalt/10 bg-white p-5">
                <p className="font-mono text-xs text-seam-blue">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 font-display text-base font-semibold text-basalt">{title}</h3>
                <p className="mt-1 font-body text-sm text-slate">{text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 font-body text-xs text-slate">
            Drawings, designs and certificates that the law requires a registered professional to sign are signed by one. Municipal plan fees, NHBRC enrolment and
            specialist reports (surveys, geotechnical) are paid at cost and shown separately on the proposal.
          </p>
        </section>

        <section id="fee-estimator" className="mt-14 grid scroll-mt-24 gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-2xl font-bold text-basalt">What will the design cost?</h2>
            <p className="mt-2 font-body text-sm text-slate">
              Design fees follow the size and cost of the building. Put in the floor area and a building cost per m² for a budget figure for plans, the
              engineer, inspections and a bill of quantities — and, for a new house, the NHBRC enrolment fee your builder pays.
            </p>
            <p className="mt-3 font-body text-sm text-slate">
              Fixed fees are firm for the scope described; everything else is confirmed on BAE&apos;s written proposal once we&apos;ve seen the brief.
            </p>
          </div>
          <DesignFeeEstimator />
        </section>

        <section id="brief" className="mt-14 grid scroll-mt-24 gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-2xl font-bold text-basalt">Send BAE a brief</h2>
            <p className="mt-2 font-body text-sm text-slate">
              Tell us what you want to build and where. BAE will come back with questions or a fee proposal and terms of engagement. Reply to the email you get
              with any drawings, title deed or photos.
            </p>
            <p className="mt-3 font-body text-sm text-slate">
              Already have approved plans? Go straight to a <Link href="/quote" className="text-seam-blue hover:underline">materials quote</Link> or{" "}
              <Link href="/shop-by-stage" className="text-seam-blue hover:underline">shop by build stage</Link>.
            </p>
          </div>
          <div className="rounded-sm border border-basalt/10 bg-white p-5 md:p-6">
            <DesignBriefForm />
          </div>
        </section>
      </div>
    </div>
  );
}
