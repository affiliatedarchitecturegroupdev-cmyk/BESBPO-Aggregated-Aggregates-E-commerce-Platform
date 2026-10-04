import { ArrowDownRight, ArrowRight, Check, FileCheck2, MapPin, Ruler, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCarousel } from "@/components/sourcing/BadgeCarousel";
import { EvidenceRegister } from "@/components/sourcing/EvidenceRegister";
import { CORPORATE_EMAILS } from "@/data/corporate-contact";
import { SOURCING_BADGES } from "@/data/badges";
import { WHATSAPP_NUMBER } from "@/data/social";

export const metadata: Metadata = {
  title: "Responsible Sourcing",
  description:
    "How Aggregated Aggregates chooses its partner quarries and plants: source, grading, test evidence and delivery records — and the standards, accreditation and industry badges we expect our suppliers to meet.",
  alternates: { canonical: "/responsible-sourcing" },
};

const STEPS = [
  { n: "01", title: "Know the source", text: "Every partner is a named quarry, pit or plant: its operator, location, the materials it produces and who owns the technical information.", Icon: MapPin },
  { n: "02", title: "Read the material", text: "We record the grading or class each material is sold as — SANS 1083, SANS 1200-G, TRH14 / COLTO — its intended use, and the limits of that declaration.", Icon: Ruler },
  { n: "03", title: "Match the evidence", text: "Test reports, certificates and declarations are tied to the exact material and date. When we hold them, they're on the product page under Compliance Docs.", Icon: FileCheck2 },
  { n: "04", title: "Deliver with the paperwork", text: "Your order confirmation, delivery note and invoice record the material, quantity, vehicle and site — so the trail runs from the quarry face to your site.", Icon: Truck },
];

const RULES = [
  ["Aggregates", "Quarry + grading", "Source, grading and test evidence matched to the exact material and its intended use."],
  ["Sub-base", "Class + project fit", "Declared G-class, test results and moisture or compaction context — checked against your project specification when you share it."],
  ["Cement", "Conformity + batch", "Cement type and class, the SANS 50197 reference, the supplier's declaration or certificate, and the batch or date."],
  ["Delivery", "The movement record", "Order, load, vehicle, quantity, source and delivery site — on the documents in your account."],
];

const QUESTIONS = [
  "Which quarry, pit or plant does my material come from?",
  "What grading or class is this load declared as, and for which use?",
  "Who issued the test report or certificate, and when?",
  "Can I have the delivery note and source record for my order?",
];

/**
 * Responsible Sourcing: how we choose and hold our partner suppliers to
 * account. Adapted from the AggregateTrust prototype (Manus, Oct 2026) —
 * same structure and carousel, in Aggregated Aggregates' voice and design.
 */
export default function ResponsibleSourcingPage() {
  const whatsapp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I'd like the source and test documents for my order.")}`;
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-14 lg:grid-cols-[1.06fr_.94fr] lg:items-end lg:pb-24 lg:pt-20">
        <div className="absolute -left-32 top-12 h-72 w-72 rounded-full bg-ochre-gold/20 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-seam-blue">Home</Link> / Responsible Sourcing
          </nav>
          <p className="mt-6 flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-ochre-gold">
            <span className="h-px w-9 bg-ochre-gold" /> Responsible Sourcing
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.6rem,6vw,5.6rem)] font-bold leading-[0.95] tracking-tight text-basalt">
            Good materials leave a <em className="text-ochre-gold">trail.</em>
          </h1>
          <p className="mt-7 max-w-xl font-body text-lg leading-8 text-slate">
            We hold no stock of our own — every order comes from a partner quarry or plant. So we go the extra mile choosing them: where the material comes from, what
            it's declared to be, which documents back that up, and what the delivery record proves.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#method" className="inline-flex items-center gap-3 rounded-full bg-basalt px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-limestone transition-transform hover:-translate-y-1">
              How we choose suppliers <ArrowDownRight size={15} />
            </a>
            <a href="#badges" className="inline-flex items-center gap-3 rounded-full border border-basalt/20 px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-basalt transition-colors hover:border-ochre-gold hover:text-ochre-gold">
              See the badges <ArrowRight size={15} />
            </a>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[28px] bg-basalt p-7 text-limestone shadow-2xl shadow-basalt/15 lg:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[34px] border-ochre-gold/30" aria-hidden="true" />
          <div className="relative flex items-center justify-between border-b border-white/15 pb-6">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ochre-gold">Our promise</span>
            <ShieldCheck size={23} className="text-ochre-gold" aria-hidden="true" />
          </div>
          <p className="relative mt-8 max-w-md font-display text-2xl font-bold leading-tight md:text-3xl">
            &ldquo;We show you the source, the scope and the document — not just the badge.&rdquo;
          </p>
          <div className="relative mt-10 grid grid-cols-2 gap-3">
            {[
              ["01", "known source"],
              ["02", "declared grading"],
              [String(SOURCING_BADGES.length), "badges we check"],
              ["open", "your questions"],
            ].map(([metric, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-display text-2xl font-bold text-ochre-gold">{metric}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-white/55">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 01 Method */}
      <section id="method" className="scroll-mt-24 border-y border-basalt/10 bg-[#e8dfd2]">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-ochre-gold">01 / How we choose suppliers</p>
              <h2 className="mt-5 max-w-sm font-display text-4xl font-bold leading-[0.98] tracking-tight text-basalt md:text-5xl">From the quarry face to your site.</h2>
              <p className="mt-6 max-w-sm font-body leading-7 text-slate">
                Bulk materials need more than a product name. Before a partner supplies you through us, we look at who they are, what they produce and the evidence
                behind it. Only verified partners go live; researched leads wait until they've been checked.
              </p>
              <Link href="/suppliers" className="mt-6 inline-flex items-center gap-2 font-body text-sm font-semibold text-seam-blue hover:underline">
                Meet our partner network <ArrowRight size={15} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {STEPS.map(({ n, title, text, Icon }) => (
                <article key={n} className="group rounded-[20px] border border-basalt/10 bg-limestone p-6 transition-transform hover:-translate-y-1">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-ochre-gold">{n}</span>
                    <Icon size={18} className="text-basalt/30 transition-transform group-hover:translate-x-1 group-hover:translate-y-1" aria-hidden="true" />
                  </div>
                  <h3 className="mt-8 font-display text-xl font-bold text-basalt">{title}</h3>
                  <p className="mt-3 font-body text-sm leading-6 text-slate">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 02 Badges */}
      <section id="badges" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 lg:py-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-ochre-gold">02 / The badges</p>
            <h2 className="mt-5 max-w-2xl font-display text-4xl font-bold leading-[0.98] tracking-tight text-basalt md:text-5xl">Every badge has a scope.</h2>
          </div>
          <p className="max-w-sm font-body text-sm leading-6 text-slate">
            Standards bodies, accreditation, industry associations, builder and contractor registration, and supplier credentials each do a different job. These are
            the badges we expect our partners to hold where they apply — and how we keep each one in its lane.
          </p>
        </div>
        <div className="mt-10">
          <BadgeCarousel />
        </div>
      </section>

      {/* 03 Evidence */}
      <section id="evidence" className="scroll-mt-24 border-t border-basalt/10 bg-[#e8dfd2]">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-ochre-gold">03 / The evidence</p>
              <h2 className="mt-5 max-w-2xl font-display text-4xl font-bold leading-[0.98] tracking-tight text-basalt md:text-5xl">Search the trail, not just the name.</h2>
            </div>
            <p className="max-w-sm font-body text-sm leading-6 text-slate">
              Each claim on the store connects to a material, a source, a document and the person who owns it. Here's how that works for the materials we sell most.
            </p>
          </div>
          <div className="mt-10">
            <EvidenceRegister />
          </div>
          <div className="mt-14">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ochre-gold">What we publish, and when</p>
                <h3 className="mt-3 font-display text-3xl font-bold text-basalt">The material comes before the badge.</h3>
              </div>
              <ShieldCheck className="hidden text-ochre-gold md:block" size={28} aria-hidden="true" />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {RULES.map(([product, evidence, note]) => (
                <div key={product} className="rounded-[18px] border border-basalt/10 bg-limestone p-5">
                  <div className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-ochre-gold">{product}</div>
                  <h4 className="mt-5 font-display text-xl font-bold text-basalt">{evidence}</h4>
                  <p className="mt-3 font-body text-sm leading-6 text-slate">{note}</p>
                  <p className="mt-5 border-t border-basalt/10 pt-4 font-mono text-[9px] uppercase leading-4 tracking-[0.11em] text-slate">Published only when the scope is recorded and current</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 04 Ask */}
      <section id="ask" className="scroll-mt-24 border-t border-basalt/10 bg-ochre-gold text-basalt">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[.9fr_1.1fr] lg:py-24">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-basalt/60">04 / Ask for more</p>
            <h2 className="mt-5 max-w-lg font-display text-4xl font-bold leading-[0.95] tracking-tight md:text-5xl">Ask for the document behind the load.</h2>
            <p className="mt-6 max-w-md font-body text-lg leading-8 text-basalt/75">
              A product name starts the conversation. The source, scope, date and delivery record make it useful — and we&apos;re happy to share them.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/quote" className="rounded-full bg-basalt px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-limestone hover:bg-seam-blue">
                Request a quote
              </Link>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-full border border-basalt/30 px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] hover:bg-basalt/10">
                Ask on WhatsApp
              </a>
              <a href={`mailto:${CORPORATE_EMAILS.sales}?subject=${encodeURIComponent("Source and test documents")}`} className="rounded-full border border-basalt/30 px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] hover:bg-basalt/10">
                Email us
              </a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUESTIONS.map((text) => (
              <div key={text} className="rounded-[20px] border border-basalt/15 bg-white/25 p-6">
                <Check size={18} aria-hidden="true" />
                <p className="mt-6 font-display text-xl font-bold leading-tight">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclosure */}
      <section className="bg-basalt py-8 text-limestone">
        <div className="mx-auto flex max-w-6xl px-4 flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ochre-gold">About these badges</p>
            <p className="mt-2 max-w-2xl font-body text-sm leading-6 text-limestone/65">
              Each badge belongs to the body it represents. We show them to explain what we expect of our partner suppliers and to help you ask the right questions —
              they are not certifications held by Aggregated Aggregates, and no body has endorsed this store.
            </p>
          </div>
          <Link href="/legal/terms-and-conditions" className="font-mono text-[9px] uppercase tracking-[0.15em] text-limestone/45 hover:text-ochre-gold">
            Terms &amp; Conditions
          </Link>
        </div>
      </section>
    </div>
  );
}
