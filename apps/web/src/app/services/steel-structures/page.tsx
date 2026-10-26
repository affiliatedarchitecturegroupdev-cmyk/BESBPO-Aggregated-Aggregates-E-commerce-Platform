import type { Metadata } from "next";
import Link from "next/link";
import { SteelBriefForm } from "@/components/projects/SteelBriefForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Steel Structures — Warehouses, Workshops, Carports and Canopies, Designed and Built",
  description:
    "Portal-frame warehouses and workshops, carports, shade structures and canopies: the engineer's design and shop drawings, fabrication by partner steelworks, sheeting, doors and erection — one package with an instant take-off and stage payments.",
  alternates: { canonical: "/services/steel-structures" },
};

const STEPS = [
  ["Brief", "What it's for, its size and height, the roof and cladding. The take-off comes straight back — frames, columns, rafters, purlins, girts, sheeting and more."],
  ["Design", "Our engineers design the structure for your site's wind and soil — the steel sections, bracing, connections and footings — and produce the shop drawings."],
  ["Proposal", "One price for the whole structure — design, steel, sheeting, doors, fabrication and erection — with stage payments. Accept it online."],
  ["Fabrication", "A partner steelworks cuts, drills, welds and paints the steel to the shop drawings."],
  ["Erection", "A partner crew sets the holding-down bolts, erects the frames and sheets the roof and walls; we manage the job."],
  ["Sign-off", "The engineer inspects and signs off, and your last stage payment follows only then."],
] as const;

const USES = [
  ["Warehouses and stores", "Clear-span portal frames, roller doors and a slab if you need one."],
  ["Workshops and factories", "Taller eaves, wider spans, insulation and space for a crane later."],
  ["Carports and shade", "Open mono- or duo-pitch frames over parking, schoolyards and walkways."],
  ["Canopies", "Over loading bays, fuel courts and entrances."],
] as const;

/**
 * Steel structures (ROADMAP 11.2b, docs/projects.md): the second design-and-build package, on the same project
 * engine as complete roofs — an instant take-off from the brief, then a proposal with stage payments.
 */
export default async function SteelStructuresPage() {
  const user = await getSession();
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / <Link href="/services" className="hover:text-ochre-gold">Services</Link> / Steel structures
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Design · fabricate · erect</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Steel buildings, designed and built for you</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            Warehouses, workshops, carports and canopies. Our engineers design the structure, partner steelworks fabricate it, we supply the sheeting, doors and
            fixings, and a partner crew erects it — one proposal, one point of contact, paid in stages.
          </p>
          <a href="#brief" className="mt-6 inline-block rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
            Work out my structure
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
        <section>
          <h2 className="font-display text-2xl font-bold text-basalt">What we build</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {USES.map(([title, text]) => (
              <div key={title} className="rounded-sm border border-basalt/10 bg-white p-5">
                <h3 className="font-display text-base font-semibold text-basalt">{title}</h3>
                <p className="mt-2 font-body text-sm text-slate">{text}</p>
              </div>
            ))}
          </div>
        </section>

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
          <p className="mt-4 font-body text-sm text-slate">
            Stage payments are usually a deposit when you accept (the design, steel and sheeting are ordered), a payment when the steel is fabricated and on site, and the last
            once the structure is erected, clad and signed off. Need just the design? See{" "}
            <Link href="/design/steel-structure-design" className="text-seam-blue hover:underline">
              steel structure design
            </Link>
            ; buying the steel yourself? See{" "}
            <Link href="/products?category=structural-steel" className="text-seam-blue hover:underline">
              structural steel
            </Link>
            .
          </p>
        </section>

        <section id="brief" className="scroll-mt-24">
          <h2 className="font-display text-2xl font-bold text-basalt">Work out your structure</h2>
          <p className="mb-5 mt-1 font-body text-sm text-slate">Give the outside dimensions. The take-off updates as you go; send it when you&apos;re ready.</p>
          <SteelBriefForm signedIn={user ? { name: user.name, email: user.email } : null} />
        </section>
      </div>
    </div>
  );
}
