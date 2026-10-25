import Link from "next/link";
import { ProductRail } from "@/components/merchandising/ProductRail";
import { availableCalculators } from "@/data/calculators";
import { jobKeyForCategory, resolveJob } from "@/data/complete-the-job";
import { DEPARTMENTS, type Department } from "@/data/departments";
import { getHiddenSkus } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { getCollections, getMerchCatalogue, getTopSellers, MIN_ROW, resolveCollection } from "@/lib/merchandising";

/** The calculators that help with each department's work; the project estimator for the rest. */
const CALCULATORS_BY_DEPARTMENT: Record<string, string[]> = {
  aggregates: ["tonnage", "estimator"],
  "cement-concrete": ["ready-mix", "estimator"],
  steel: ["steel", "estimator"],
  walling: ["wall", "estimator"],
  paving: ["paving", "tonnage"],
  drainage: ["french-drain", "tonnage"],
  roofing: ["roof", "estimator"],
  timber: ["roof", "estimator"],
  "roads-civil": ["tonnage", "paving"],
  "precast-concrete": ["french-drain", "estimator"],
  "garden-landscaping": ["tonnage", "paving"],
  "outdoor-living": ["paving", "estimator"],
  "formwork-access": ["ready-mix", "steel"],
};

/** Collections staff placed on this department (Admin → Collections). */
export async function DepartmentCollections({ department, hiddenSkus }: { department: Department; hiddenSkus: string[] }) {
  const hidden = new Set(hiddenSkus);
  const [collections, cat] = await Promise.all([getCollections(`DEPARTMENT:${department.slug}`), getMerchCatalogue()]);
  return (
    <>
      {collections.map((c) => (
        <ProductRail key={c.slug} eyebrow="Collection" title={c.title} blurb={c.subtitle ?? undefined} products={resolveCollection(c, hidden, 8, cat).products} seeAll={`/collections/${c.slug}`} seeAllLabel="See the collection →" bare track={`collection:${c.slug}:department-${department.slug}`} />
      ))}
    </>
  );
}

/** Top sellers in this department over the last 30 days (paid orders; hidden until there are enough). */
export async function DepartmentTopSellers({ department, hiddenSkus }: { department: Department; hiddenSkus: string[] }) {
  const products = await getTopSellers(new Set(hiddenSkus), { department: department.slug, limit: 8 });
  return <ProductRail eyebrow="Top sellers" title={`Most ordered in ${department.name}`} blurb="From paid orders over the last 30 days." products={products} min={MIN_ROW} bare track={`department:${department.slug}:top-sellers`} />;
}

/**
 * The rest of a department page (ROADMAP 3.2): "complete the job" ideas, the calculators for the work, and an FAQ
 * with FAQPage structured data. Answers come from the department's own numbers, never invented ones.
 */
export function DepartmentGuide({
  department,
  hiddenSkus,
  productCount,
  pricedCount,
  showCalculators = true,
}: {
  department: Department;
  hiddenSkus: string[];
  productCount: number;
  pricedCount: number;
  /** Off on pages that already have their own calculators section. */
  showCalculators?: boolean;
}) {
  const jobKey = department.categorySlugs.map(jobKeyForCategory).find(Boolean) ?? null;
  const job = jobKey ? resolveJob(jobKey, hiddenSkus) : null;
  const wanted = CALCULATORS_BY_DEPARTMENT[department.slug] ?? ["estimator"];
  const calculators = showCalculators ? availableCalculators(hiddenSkus).filter((c) => wanted.includes(c.key)) : [];
  const faqs = [
    {
      q: `Can I buy ${department.name.toLowerCase()} online?`,
      a:
        pricedCount > 0
          ? `Yes — ${pricedCount} of the ${productCount} products here have a published price and go straight into the cart. The rest are priced on a quote: we confirm the make, price and availability with a partner supplier before you pay.`
          : `Every product here is priced on a quote for now: add what you need to a quote request and we confirm the make, price and availability with a partner supplier before you pay.`,
    },
    { q: "What does “Quote” mean on a product?", a: "Make, finish and stock vary between suppliers, so we only publish a price we can stand behind. Request a quote and we come back with a supplier-backed price — nothing is charged until you accept it." },
    { q: "How is delivery charged?", a: "Delivery is worked out from your site's distance to the supplier and the load, and shown at checkout or on your quote. Larger orders can be split into phased deliveries." },
    { q: "Do you offer trade accounts and credit?", a: "Yes — contractors can apply for a trade account with tier pricing, and approved businesses for trade credit. Bulk and civil orders are quoted for volume." },
  ];
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <>
      {(job || calculators.length > 0) && (
        <section className="mt-14 grid gap-6 md:grid-cols-2">
          {job && (
            <div className="rounded-sm border border-basalt/10 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Complete the job · {job.stageLabel}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-basalt">{job.title}</h3>
              <ul className="mt-3 space-y-2">
                {job.companions.slice(0, 6).map((c) => (
                  <li key={c.sku} className="flex items-baseline justify-between gap-3 font-body text-sm">
                    <span>
                      <Link href={`/products/${c.slug}`} className="font-semibold text-basalt hover:text-seam-blue">{c.name}</Link>
                      <span className="block text-xs text-slate">{c.why}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate">{c.price !== null ? `${formatZAR(c.price)} / ${c.unitLabel}` : "Quote"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {calculators.length > 0 && (
            <div className="rounded-sm border border-basalt/10 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Work it out</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-basalt">Calculators for this work</h3>
              <ul className="mt-3 space-y-3">
                {calculators.map((c) => (
                  <li key={c.key}>
                    <Link href={c.href} className="font-body text-sm font-semibold text-seam-blue hover:underline">{c.name} →</Link>
                    <p className="font-body text-xs text-slate">{c.works}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold text-basalt">Questions about {department.name.toLowerCase()}</h2>
        <div className="mt-4 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="cursor-pointer font-body text-sm font-semibold text-basalt">{f.q}</summary>
              <p className="mt-2 font-body text-sm text-slate">{f.a}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </section>
    </>
  );
}

/**
 * The shared department blocks (ROADMAP 3.2) for the hand-built department pages — cement, steel, bricks &
 * blocks, paving, drainage and roofing: staff collections placed on the department, its top sellers, Complete the
 * Job and the FAQ. Their own calculators stay as they are. Counts include live supplier prices.
 */
export async function DepartmentMerchandising({ slug }: { slug: string }) {
  const department = DEPARTMENTS.find((d) => d.slug === slug);
  if (!department) return null;
  const [hiddenSkus, cat] = await Promise.all([getHiddenSkus(), getMerchCatalogue()]);
  const hidden = new Set(hiddenSkus);
  const inDepartment = cat.products.filter((p) => p.departmentSlug === slug && !hidden.has(p.sku));
  return (
    <>
      <DepartmentCollections department={department} hiddenSkus={hiddenSkus} />
      <DepartmentTopSellers department={department} hiddenSkus={hiddenSkus} />
      <DepartmentGuide department={department} hiddenSkus={hiddenSkus} productCount={inDepartment.length} pricedCount={inDepartment.filter((p) => p.fromPrice !== null).length} showCalculators={false} />
    </>
  );
}
