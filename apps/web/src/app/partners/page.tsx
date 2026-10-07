import { BadgeCheck, ClipboardList, FileSpreadsheet, Handshake } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";

export const metadata: Metadata = {
  title: "Become a Partner — Plant Hire, Haulage & Site Services",
  description:
    "Plant-hire, tipper, skip, demolition and testing operators: join the Aggregated Aggregates partner network and receive jobs from customers near you. Apply online.",
  alternates: { canonical: "/partners" },
};

const DOCS = [
  "Company registration and tax-compliance details",
  "Operator certificates and PrDP where applicable",
  "Public-liability and plant or vehicle insurance certificates",
  "Equipment list with year, model and registration",
  "Written day and week rates per machine, per province (our rate-card template)",
  "Bank confirmation letter",
];

const STEPS = [
  { Icon: ClipboardList, title: "Apply", text: "Tell us about your business, your fleet and the provinces you work in." },
  { Icon: BadgeCheck, title: "Get vetted", text: "We check your documents, insurance and equipment before you receive any work." },
  { Icon: FileSpreadsheet, title: "Send your rate card", text: "Written rates per machine and province. Once two partners have rates in a province, customers there can see a price." },
  { Icon: Handshake, title: "Receive jobs", text: "We send you requests from customers near you. You confirm availability; we handle the customer and the quote." },
];

const PARTNER_TYPES = ["Plant hire (wet hire)", "Tipper haulage", "Skip bins / rubble removal", "Site clearing / demolition", "Testing laboratory", "Small equipment hire", "Fuel supply", "Other"];

export default function PartnersPage() {
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Partners
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Partner network</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Own plant or tippers? Work with us.</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            We already supply aggregates, cement and ready-mix to contractors across South Africa. Those same customers need machines, trucks and site
            services — and we&apos;re building a vetted partner network in every province to do the work.
          </p>
          <a href="#apply" className="mt-6 inline-block rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
            Apply to join
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">How it works</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="rounded-sm border border-basalt/10 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-sm bg-limestone text-seam-blue">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs text-ochre-gold">0{i + 1}</span>
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-basalt">{title}</h3>
              <p className="mt-1 font-body text-sm text-slate">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-xl font-bold text-basalt">What we&apos;ll ask for</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-sm text-basalt">
              {DOCS.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="mt-6 font-body text-xs text-slate">
              Partners agree not to go around the platform for customers introduced through it. Commercial terms are shared during onboarding. Customers
              never see your contact details unless you both agree.
            </p>
            <p className="mt-4 font-body text-sm text-slate">
              Supplying aggregates or cement instead? See <Link href="/suppliers" className="font-semibold text-seam-blue hover:underline">our supplier network</Link>.
            </p>
          </div>
          <section id="apply" className="scroll-mt-24 rounded-sm border border-basalt/10 bg-white p-5 md:p-6">
            <h2 className="font-display text-xl font-bold text-basalt">Apply to join</h2>
            <div className="mt-5">
              <EnquiryForm
                kind="PARTNER_APPLICATION"
                subject="Partner application"
                askSite={false}
                fields={[
                  { name: "Partner type", label: "What do you offer?", type: "select", options: PARTNER_TYPES, required: true },
                  { name: "Years operating", label: "Years operating", type: "number", min: 0 },
                  { name: "Provinces covered", label: "Provinces and towns you cover", wide: true, placeholder: "e.g. Gauteng — Midrand, Centurion, Tembisa" },
                  { name: "Fleet", label: "Fleet summary", type: "textarea", required: true, placeholder: "2 x TLB 4x4, 1 x 20t excavator, 3 x 10m³ tippers…" },
                ]}
                messageLabel="Anything else? (optional)"
                submitLabel="Send my application"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
