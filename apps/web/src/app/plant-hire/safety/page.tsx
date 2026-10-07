import { ClipboardCheck, FileCheck2, HardHat, IdCard, ShieldCheck, Truck, Wrench, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Plant Hire Safety & Partner Vetting",
  description:
    "What we check before a plant-hire or site-services partner receives work — registration, insurance, operator competency and PrDPs, machine condition — and how responsibilities are shared on site.",
  alternates: { canonical: "/plant-hire/safety" },
};

/*
 * Every check listed here must match what Partner Terms §2 requires and what
 * staff verify during onboarding (Admin → Hire partners). Don't add a check
 * we don't actually carry out. The "On your site" wording touches on the
 * Construction Regulations and awaits attorney review with the hire terms
 * (content/legal/README.md — internal; never shown on the page).
 */
const CHECKS: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: FileCheck2, title: "A registered, tax-compliant business", text: "Company registration and tax-compliance details, checked before a partner receives any offers." },
  { Icon: ShieldCheck, title: "Insurance in place", text: "Public-liability insurance, plus insurance for the partner's machines and vehicles. We ask partners to tell us straight away if cover lapses." },
  { Icon: IdCard, title: "Competent operators", text: "Operator certificates of competence for each machine type, and professional driving permits (PrDP) where the law requires them." },
  { Icon: Truck, title: "Roadworthy vehicles, maintained machines", text: "A list of each partner's machines, with vehicles licensed and roadworthy, and machines maintained and safe to operate." },
  { Icon: Wrench, title: "Kept up to date", text: "Partners must keep their documents current. Offers stop if they lapse, and we can suspend a partner over safety concerns." },
  { Icon: ClipboardCheck, title: "A record of every job", text: "The job starts only with your arrival code, and the partner records the work on daily job cards you can see." },
];

export default function PlantSafetyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/plant-hire" className="hover:text-seam-blue">Plant Hire</Link> / Safety &amp; vetting
      </nav>
      <p className="mt-6 font-mono text-xs uppercase tracking-widest text-seam-blue">Safety & partner vetting</p>
      <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold text-basalt md:text-4xl">Who comes onto your site, and what we check first</h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-slate">
        Every plant-hire and site-services job is done by an independent partner. Before a partner receives any work through us, we check their business,
        insurance, operators and equipment — and we keep checking while they work with us.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHECKS.map(({ Icon, title, text }) => (
          <div key={title} className="rounded-sm border border-basalt/10 bg-white p-5">
            <span className="grid h-10 w-10 place-items-center rounded-sm bg-limestone text-seam-blue">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-base font-semibold text-basalt">{title}</h2>
            <p className="mt-1 font-body text-sm text-slate">{text}</p>
          </div>
        ))}
      </div>

      <section className="mt-14 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-basalt">
            <HardHat className="h-5 w-5 text-ochre-gold" aria-hidden="true" /> What partners commit to on site
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-sm text-basalt">
            <li>Arrive with the machine described, a competent operator, fuel and personal protective equipment.</li>
            <li>Work safely and lawfully, under the Occupational Health and Safety Act and the Construction Regulations, 2014, and follow your site&apos;s safety rules.</li>
            <li>Refuse work they reasonably consider unsafe, and tell us straight away.</li>
            <li>Take rubble and waste only to licensed disposal sites, and keep the tip or weighbridge slips.</li>
          </ul>
          <p className="mt-3 font-body text-xs text-slate">
            Set out in full in our <Link href="/legal/partner-terms" className="text-seam-blue hover:underline">Partner Terms</Link>.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-basalt">What we need from you</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-sm text-basalt">
            <li>Safe, legal and practical access to the site for the machine and its transport.</li>
            <li>Advance warning of anything that affects the work or safety — underground services, overhead lines, ground conditions, slopes, asbestos or other hazardous material.</li>
            <li>Any permits or permissions the work needs, and someone on site to meet the crew.</li>
            <li>The site&apos;s own health and safety arrangements — including its safety file and induction where the site has a principal contractor.</li>
          </ul>
          <p className="mt-3 font-body text-xs text-slate">
            Set out in full in our <Link href="/legal/hire-terms" className="text-seam-blue hover:underline">Plant Hire &amp; Site Services Terms</Link>.
          </p>
        </div>
      </section>

      <section className="mt-14 rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-6">
        <h2 className="font-display text-lg font-bold text-basalt">Demolition and hazardous material</h2>
        <p className="mt-2 font-body text-sm text-basalt">
          Demolition and the removal of asbestos or other hazardous waste need specific competencies, permits and method statements. We only arrange them where
          your written quote says so, with a partner competent for that work. Asbestos removal is not available through the platform.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/plant-hire" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">Hire a machine</Link>
        <Link href="/plant-hire/how-it-works" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">How bookings work</Link>
        <Link href="/partners" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">Become a partner</Link>
      </div>
    </div>
  );
}
