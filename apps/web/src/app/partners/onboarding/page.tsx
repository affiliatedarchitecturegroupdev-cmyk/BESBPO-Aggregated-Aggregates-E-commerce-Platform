import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CORPORATE_EMAILS } from "@/data/corporate-contact";
import { HOURS_PER_DAY_CAP, MIN_PARTNER_CARDS, PLANT, SERVICES } from "@/data/plant-services";

export const metadata: Metadata = {
  title: "Partner Onboarding Guide",
  description:
    "How plant-hire and site-services partners join Aggregated Aggregates: documents we check, the rate-card template, getting into the partner portal, accepting offers, and how payouts work.",
  alternates: { canonical: "/partners/onboarding" },
};

const DOCUMENTS = [
  "Company registration documents and tax-compliance details",
  "Public-liability insurance, and insurance for your machines and vehicles",
  "Operator certificates of competence for each machine type, and PrDPs where required",
  "A list of your machines: make, model, year and registration, and the provinces you work in",
  "A bank confirmation letter for the account in your company's name",
];

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Apply",
    body: (
      <>
        Fill in the short form on the <Link href="/partners#apply" className="text-seam-blue hover:underline">Partners page</Link>. Our partnerships team will contact
        you for the documents below.
      </>
    ),
  },
  { title: "Send your documents", body: "We check each one before you receive any work, and record your machines and the provinces you cover." },
  {
    title: "Send your rates",
    body: (
      <>
        Fill in the rate-card template below — your price to us for each machine and service, per province. We add our platform fee on top when we quote the
        customer, and only publish a price once {MIN_PARTNER_CARDS} partners in a province have given us written rates.
      </>
    ),
  },
  {
    title: "Create your portal login",
    body: (
      <>
        <Link href="/account/register" className="text-seam-blue hover:underline">Create an account</Link> on the site with your work email and tell us the address.
        We link it to your business, and the <Link href="/partners/portal" className="text-seam-blue hover:underline">partner portal</Link> appears when you sign in.
      </>
    ),
  },
  {
    title: "Accept the Partner Terms",
    body: (
      <>
        The first time you open the portal, read and accept the <Link href="/legal/partner-terms" className="text-seam-blue hover:underline">Partner Terms</Link> on your
        company&apos;s behalf. You can&apos;t accept jobs until you have.
      </>
    ),
  },
  { title: "Start receiving offers", body: "Once we set you active, paid job offers arrive in the portal and by email." },
];

export default function PartnerOnboardingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/partners" className="hover:text-seam-blue">Partners</Link> / Onboarding
      </nav>
      <p className="mt-6 font-mono text-xs uppercase tracking-widest text-seam-blue">Partner onboarding guide</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-basalt md:text-4xl">From application to your first paid job</h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-slate">
        Everything a plant-hire, haulage or site-services business needs to join our partner network and start taking jobs through the platform.
      </p>

      <ol className="mt-10 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-sm border border-basalt/10 bg-white p-5">
            <span className="font-mono text-sm text-ochre-gold">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="font-display text-base font-semibold text-basalt">{s.title}</h2>
              <p className="mt-1 font-body text-sm text-slate">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-display text-xl font-bold text-basalt">Documents checklist</h2>
          <ul className="mt-3 space-y-2 font-body text-sm text-basalt">
            {DOCUMENTS.map((d) => (
              <li key={d} className="flex gap-2">
                <span aria-hidden="true" className="text-seam-blue">✓</span>
                {d}
              </li>
            ))}
          </ul>
          <p className="mt-4 font-body text-xs text-slate">Keep them current — tell us straight away if insurance lapses or a certificate expires.</p>
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-display text-xl font-bold text-basalt">Rate-card template</h2>
          <p className="mt-2 font-body text-sm text-slate">
            One row per machine or service, for each province you cover — copy the rows if you work in more than one. For plant, give a day rate (up to{" "}
            {HOURS_PER_DAY_CAP} machine hours, wet: operator, fuel and PPE), a week rate and your excess-hour rate; for services, a rate per load, skip, day or m².
            Say whether your amounts include VAT, and from when they apply.
          </p>
          <a
            href="/downloads/partner-rate-card-template.csv"
            download
            className="mt-4 inline-flex items-center gap-2 rounded-sm bg-seam-blue px-4 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Download the template (CSV)
          </a>
          <p className="mt-3 font-body text-xs text-slate">
            Opens in Excel or Google Sheets. Prefer your own rate card? Email it to{" "}
            <a href={`mailto:${CORPORATE_EMAILS.sales}?subject=${encodeURIComponent("Partner rate card")}`} className="text-seam-blue hover:underline">{CORPORATE_EMAILS.sales}</a>{" "}
            and we&apos;ll capture it. Demolition and scheduled waste are always quoted per job, so they aren&apos;t on the template.
          </p>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-basalt">Working through the portal</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Offers", "Every offer is already paid by the customer. You see the job, dates, site and your payout — accept or decline within 30 minutes."],
            ["Your calendar", "Block dates when a machine is busy or in for service, so you aren't offered work you can't take."],
            ["On the job", "Start with the customer's 6-digit arrival code, add a job card each day, and message the customer in the job — never off-platform."],
            ["Payouts", "48 hours after the customer signs off, with no dispute, your payout is released and paid by EFT to your confirmed account."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-sm border border-basalt/10 bg-white p-5">
              <h3 className="font-display text-base font-semibold text-basalt">{title}</h3>
              <p className="mt-1 font-body text-sm text-slate">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-basalt">What we list</h2>
        <p className="mt-1 font-body text-sm text-slate">The machines and services on the template — tell us if you offer something else.</p>
        <div className="mt-4 grid gap-6 font-body text-sm text-basalt sm:grid-cols-2">
          <ul className="space-y-1">{PLANT.map((p) => <li key={p.sku}>{p.name} <span className="font-mono text-[11px] text-slate">{p.sku}</span></li>)}</ul>
          <ul className="space-y-1">{SERVICES.map((s) => <li key={s.sku}>{s.name} <span className="font-mono text-[11px] text-slate">{s.sku}</span></li>)}</ul>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/partners#apply" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">Apply to join</Link>
        <Link href="/partners/portal" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">Partner sign-in</Link>
        <Link href="/legal/partner-terms" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">Partner Terms</Link>
      </div>
    </div>
  );
}
