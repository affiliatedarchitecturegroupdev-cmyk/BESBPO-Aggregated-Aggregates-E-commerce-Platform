import Link from "next/link";

/** What we offer for project and trade buying, each with the page that does it. */
export const PROJECT_TOOLS = [
  {
    title: "Upload your bill of quantities",
    body: "Send the BOQ as Excel or CSV. We match each line to the catalogue; you check the matches, and it becomes one quote request.",
    href: "/quote/boq",
    cta: "Upload a BOQ",
  },
  {
    title: "Trade credit on account",
    body: "Approved trade companies can order on account with 7, 14, 30 or 60-day terms, up to their credit limit. Apply from your trade account.",
    href: "/trade-accounts#trade-credit",
    cta: "How trade credit works",
  },
  {
    title: "Deliver in stages",
    body: "Split one order into deliveries on the dates the build needs them; we confirm each date with the supplier. Each leaves once it's paid for, or straight away on a trade account.",
    href: "/trade-accounts#deliveries",
    cta: "Phased deliveries",
  },
  {
    title: "Signed proof of delivery",
    body: "The person receiving on site can sign on the driver's phone and note any shortage or damage, with a photo of the load. You're emailed when it's signed.",
    href: "/trade-accounts#deliveries",
    cta: "Proof of delivery",
  },
  {
    title: "Deposits, payment links and lay-by",
    body: "Secure a large order with a deposit and pay the balance before delivery, settle by payment link with a proforma, or spread the cost on lay-by.",
    href: "/ways-to-pay",
    cta: "Ways to pay",
  },
  {
    title: "Lead times up front",
    body: "Where our suppliers have confirmed them, the usual lead times show on the product page, in the cart and at checkout.",
    href: "/delivery-areas",
    cta: "Delivery areas and charges",
  },
];

/**
 * Built for projects (Phase 4 features): BOQ upload, trade credit, phased
 * deliveries, proof of delivery, ways to pay large orders and lead times.
 */
export function ProjectTools() {
  return (
    <section aria-labelledby="project-tools" className="border-y border-basalt/10 bg-limestone/60">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">Contractors, developers and trade</p>
            <h2 id="project-tools" className="mt-2 font-display text-2xl font-bold text-basalt md:text-3xl">
              Built for projects, not just orders
            </h2>
            <p className="mt-2 max-w-2xl font-body text-sm text-slate">
              From the bill of quantities to the last signed delivery, run the whole job&apos;s materials through one supplier.
            </p>
          </div>
          <Link href="/trade-accounts" className="shrink-0 font-body text-sm text-seam-blue hover:underline">
            Trade accounts →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECT_TOOLS.map((tool) => (
            <Link key={tool.title} href={tool.href} className="group flex flex-col rounded-sm border border-basalt/10 bg-white p-5 transition hover:border-seam-blue hover:shadow-sm">
              <h3 className="font-display text-base font-semibold text-basalt group-hover:text-seam-blue">{tool.title}</h3>
              <p className="mt-2 font-body text-sm text-slate">{tool.body}</p>
              <p className="mt-auto pt-4 font-body text-xs font-semibold text-seam-blue">{tool.cta} →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
