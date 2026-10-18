import type { Metadata } from "next";
import Link from "next/link";
import { FAQS, PROJECT_FAQS } from "@/data/faqs";
import { HIRE_FAQS } from "@/data/hire-faqs";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Delivery, pricing tiers, units of sale, payment, trade credit, BOQ quotes, phased deliveries, compliance documents, plant hire and site services — answered.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...FAQS, ...PROJECT_FAQS, ...HIRE_FAQS].map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / FAQ
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Frequently Asked Questions</h1>
      <FaqList id="materials" title="Materials, delivery & payment" faqs={FAQS} />
      <FaqList id="trade-projects" title="Trade credit, projects & deliveries" faqs={PROJECT_FAQS} />
      <FaqList id="plant-hire" title="Plant hire & site services" faqs={HIRE_FAQS} />
      <p className="mt-4 font-body text-sm text-slate">
        The full step-by-step is on <Link href="/plant-hire/how-it-works" className="text-seam-blue hover:underline">how hire bookings work</Link>, and the
        terms are in our <Link href="/legal/hire-terms" className="text-seam-blue hover:underline">Plant Hire &amp; Site Services Terms</Link>.
      </p>
      <p className="mt-8 font-body text-sm text-slate">
        Can&apos;t find what you&apos;re looking for?{" "}
        <Link href="/contact" className="text-seam-blue hover:underline">Talk to our sales team</Link>.
      </p>
    </div>
  );
}

function FaqList({ id, title, faqs }: { id: string; title: string; faqs: { question: string; answer: string }[] }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="font-display text-xl font-bold text-basalt">{title}</h2>
      <div className="mt-4 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white">
        {faqs.map((faq) => (
          <details key={faq.question} className="group p-5">
            <summary className="cursor-pointer list-none font-body text-sm font-semibold text-basalt group-open:text-seam-blue">{faq.question}</summary>
            <p className="mt-3 font-body text-sm text-slate">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
