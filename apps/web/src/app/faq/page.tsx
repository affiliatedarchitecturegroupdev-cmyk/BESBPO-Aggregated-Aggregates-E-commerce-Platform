import type { Metadata } from "next";
import Link from "next/link";
import { CUSTOMER_TIERS, DELIVERY_RULES } from "@/data/catalogue";
import { HIRE_FAQS } from "@/data/hire-faqs";
import { formatZAR } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Delivery, pricing tiers, units of sale, payment, WhatsApp ordering, compliance documents, plant hire and site services — answered.",
  alternates: { canonical: "/faq" },
};

const pct = (name: string) => Math.round((CUSTOMER_TIERS.find((t) => t.name === name)?.discount ?? 0) * 100);
const [included, ...bands] = DELIVERY_RULES.bands;

const FAQS: { question: string; answer: string }[] = [
  {
    question: "Do you deliver, or do I collect?",
    answer: `We deliver from our approved partner-supplier network — quarries and plants across South Africa; we hold no stock of our own. Full tipper loads are included within ${included.maxKm}km of the nearest partner supplier, carry a flat fee by load size from ${bands[0].minKm}–${bands[bands.length - 1].maxKm}km, and are quoted individually beyond ${DELIVERY_RULES.quoteOverKm}km.`,
  },
  {
    question: "What's the difference between buying by ton, m³ or bag?",
    answer:
      "Bulk aggregates convert live between tons and m³ using each material's bulk density, so a ton price and an m³ price describe the same rate. Bagged units carry a small premium over the bulk rate to cover bagging and handling — handy for smaller, DIY-scale orders.",
  },
  {
    question: "What are the Retail, Contractor/Trade and Volume/Civil Bulk tiers?",
    answer: `Retail is standard list pricing. Contractor/Trade is an approved trade account: ${pct("CONTRACTOR_TRADE")}% off aggregates, 4% off bagged cement and 2% off ready-mix. Volume/Civil Bulk gets up to ${pct("VOLUME_CIVIL_BULK")}% off aggregates with purchase-order invoicing; its cement and ready-mix, and any order of 10m³ or more, are quoted with delivered pricing rather than priced online. No discount ever takes a price below our minimum margin, so on low-margin materials the saving can be a little smaller.`,
  },
  {
    question: "Why do some products say “Price on request”?",
    answer:
      "A few Bulk & Infrastructure lines — bulk-bag and tanker cement, 52.5N cement, road-capping binder and concrete admixtures — have no public market benchmark yet. Rather than guess, we confirm a supplier-backed price with you directly.",
  },
  {
    question: "Can I order through WhatsApp?",
    answer:
      "Yes — for bagged and smaller Retail orders. Message us what you need and our team confirms price and delivery in the same chat. Bulk tonnage and Volume/Civil Bulk orders go through the quote request for accurate delivered pricing.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "Card, instant EFT, Capitec Pay, digital wallets, SnapScan and Zapper, buy-now-pay-later options, and — for approved trade accounts — Lulapay trade credit or EFT / purchase-order invoicing. The Ways to Pay page lists every method and its terms.",
  },
  {
    question: "Do you supply compliance documentation?",
    answer:
      "Yes. Graded products carry their reference standard (SANS 1200-G, SANS 1083 or COLTO/TRH14). Reference documents are published on the product page, and batch-specific Certificates of Analysis are attached to your order record.",
  },
  {
    question: "Which provinces do you deliver to?",
    answer:
      "Yes — we deliver across all nine provinces, from the approved partner supplier nearest your site. Check your town on our Where We Deliver page (/coverage); if it isn't listed, request a quote and we'll confirm.",
  },
  {
    question: "How far is my site from your nearest supplier?",
    answer: `Use “Use my location” on the Delivery Areas page or any product calculator. It gives a straight-line estimate; road distance is confirmed when you order. Bagged delivery is priced within ${DELIVERY_RULES.baggedMaxKm}km (${formatZAR(DELIVERY_RULES.baggedFee)}, free from ${DELIVERY_RULES.baggedFreeFromKg / 1000} ton).`,
  },
];

export default function FaqPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...FAQS, ...HIRE_FAQS].map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / FAQ
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Frequently Asked Questions</h1>
      <FaqList id="materials" title="Materials, delivery & payment" faqs={FAQS} />
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
