import type { Metadata } from "next";
import Link from "next/link";
import { RoofBriefForm } from "@/components/projects/RoofBriefForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Complete Roofs — Designed, Manufactured and Installed",
  description:
    "One package for your whole roof: the engineer's roof design and truss layout, engineered timber trusses, tiles or sheeting, insulation, gutters and installation by our partner crews — with an instant take-off and stage payments.",
  alternates: { canonical: "/services/complete-roofs" },
};

const STEPS = [
  ["Brief", "Your roof's size, shape, pitch and covering. You get the take-off straight away — trusses, tiles or sheeting, battens or purlins, insulation and gutters."],
  ["Design", "Our engineers design the roof and the truss layout to SANS 10400-L, from your plans or a site visit."],
  ["Proposal", "One price for the whole roof — design, materials, trusses and installation — with a schedule of stage payments. Accept it online."],
  ["Manufacture", "A certified partner truss plant makes the trusses to the design; we deliver them with the materials."],
  ["Install", "A partner roofing crew erects the trusses and covers the roof; we manage the job."],
  ["Sign-off", "The engineer's sign-off and the truss certificate, with your final stage payment only once it's done."],
] as const;

const INCLUDED = [
  "Roof design, truss layout and the engineer's sign-off",
  "Engineered timber trusses from a certified partner truss plant",
  "Concrete tiles, IBR, corrugated or concealed-fix sheeting",
  "Battens or purlins, underlay, ridges, flashings and fixings",
  "Fascias, barge boards, gutters and downpipes",
  "Ceiling insulation (optional)",
  "Delivery to site and installation by a partner crew",
];

/**
 * Complete roofs (ROADMAP 11.2a, docs/projects.md): the first design-and-build package. The brief gives an instant
 * take-off; the proposal prices design, materials, trusses and installation as one package with stage payments.
 */
export default async function CompleteRoofsPage() {
  const user = await getSession();
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / <Link href="/roofing" className="hover:text-ochre-gold">Roofing</Link> / Complete roofs
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Design · manufacture · install</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Your whole roof, from one place</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            We design the roof, a certified partner truss plant makes the trusses, we supply the covering and everything that goes with it, and a partner crew
            installs it. One proposal, one point of contact, and you pay in stages as the roof goes up.
          </p>
          <a href="#brief" className="mt-6 inline-block rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
            Work out my roof
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        <section>
          <h2 className="font-display text-2xl font-bold text-basalt">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-sm border border-basalt/10 bg-white p-5">
                <p className="font-mono text-[10px] uppercase text-slate">Step {i + 1}</p>
                <h3 className="mt-1 font-display text-base font-semibold text-basalt">{title}</h3>
                <p className="mt-2 font-body text-sm text-slate">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-sm border border-basalt/10 bg-white p-5">
            <h2 className="font-display text-lg font-bold text-basalt">What&apos;s in the package</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-sm text-basalt">
              {INCLUDED.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm text-basalt">
            <h2 className="font-display text-lg font-bold">Paying in stages</h2>
            <p className="mt-3">
              Your proposal sets out the payments — usually a deposit when you accept (the design, truss manufacture and materials are ordered), a payment when the
              trusses and materials are on site, and the last payment once the roof is complete and signed off.
            </p>
            <p className="mt-3 text-slate">
              Prefer to buy the materials and use your own builder? Everything is in{" "}
              <Link href="/roofing" className="text-seam-blue hover:underline">
                Roofing
              </Link>{" "}
              and{" "}
              <Link href="/timber" className="text-seam-blue hover:underline">
                Timber
              </Link>
              , and our <Link href="/design/steel-structure-design" className="text-seam-blue hover:underline">engineers</Link> can design the roof on its own.
            </p>
          </div>
        </section>

        <section id="brief" className="scroll-mt-24">
          <h2 className="font-display text-2xl font-bold text-basalt">Work out your roof</h2>
          <p className="mb-5 mt-1 font-body text-sm text-slate">Measure the walls the roof sits on. The take-off updates as you go; send it when you&apos;re ready.</p>
          <RoofBriefForm signedIn={user ? { name: user.name, email: user.email } : null} />
        </section>
      </div>
    </div>
  );
}
