import Link from "next/link";
import { CompareToggle } from "@/components/product/CompareToggle";
import { CompareTray } from "@/components/product/CompareTray";
import { LeadTimeNote } from "@/components/delivery/LeadTimeNote";
import { CompleteTheJob } from "@/components/merchandising/CompleteTheJob";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { RatingSummaryLink } from "@/components/reviews/RatingSummaryLink";
import { getProductReviews, reviewStructuredData } from "@/lib/reviews";
import { RecentlyViewedRow } from "@/components/merchandising/RecentlyViewedRow";
import { CutToLengthForm } from "@/components/product/CutToLengthForm";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { PackagedUnitSelector } from "@/components/product/PackagedUnitSelector";
import { ProductGallery } from "@/components/product/ProductGallery";
import { SaveToProject } from "@/components/projects/SaveToProject";
import { TimberVariantPicker } from "@/components/product/TimberVariantPicker";
import { SocialShareButtons } from "@/components/social/SocialShareButtons";
import { CATEGORIES } from "@/data/categories";
import { departmentOf } from "@/data/departments";
import { CUT_TO_LENGTH, ROOFING_CATEGORY_CODES, ROOFING_PRODUCTS } from "@/data/roofing";
import { SUPPLIES_CATEGORY_CODES, SUPPLIES_PRODUCTS } from "@/data/supplies";
import type { MerchandisedRoofingProduct } from "@/lib/cms";
import { formatZAR, unpricedLabel } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

/**
 * Product page for the roofing line, CAT-26..28: sheets in standard lengths or cut to length, flashings and fixings,
 * insulation and rainwater goods — and roof & structural timber with its connectors, CAT-30/31. Building supplies
 * (CAT-32..42: doors and windows, fencing, water and plumbing, ceilings, tools and PPE, waterproofing and paint) share
 * the page, with their own department, delivery and advice.
 */
export async function RoofingProductPage({ product }: { product: MerchandisedRoofingProduct }) {
  const category = CATEGORIES.find((c) => c.slug === product.categorySlug)!;
  const sheet = product.roofProfile !== null;
  const timber = product.timberGrade !== null;
  const supplies = product.line === "supplies";
  const department = departmentOf(product.categorySlug);
  const lineProducts = supplies ? SUPPLIES_PRODUCTS : ROOFING_PRODUCTS;
  // Cut-to-length is quoted through its own cutting-list form, never added to the cart from the unit buttons.
  const stockUnits = { ...product, units: product.units.filter((u) => u.unit !== "METRE") };
  const priced = stockUnits.units.filter((u) => u.prices !== null);
  // Timber: the other sections in the same grade, treatment and profile, rather than this section's variants.
  const related = (
    timber
      ? ROOFING_PRODUCTS.filter((p) => p.timberGrade === product.timberGrade && p.timberTreatment === product.timberTreatment && p.timberFinish === product.timberFinish && p.sku !== product.sku)
      : lineProducts.filter((p) => p.categorySlug === product.categorySlug && p.sku !== product.sku)
  ).slice(0, 4);
  const url = `${SITE_URL}/products/${product.slug}`;

  // Offers only for benchmarked units — an unpriced product never implies a price.
  const reviewData = await getProductReviews(product.sku);
  const structuredData = {
    ...reviewStructuredData(reviewData),
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    category: category.name,
    description: product.description ?? product.summary,
    brand: { "@type": "Brand", name: "Aggregated Aggregates" },
    ...(product.gradingStandard ? { additionalProperty: { "@type": "PropertyValue", name: "Standard", value: product.gradingStandard } } : {}),
    ...(product.images[0] ? { image: `${SITE_URL}${product.images[0].src}` } : {}),
    ...(priced.length > 0
      ? {
          offers: priced.map((u) => ({
            "@type": "Offer",
            price: u.prices!.RETAIL.toFixed(2),
            priceCurrency: "ZAR",
            availability: "https://schema.org/InStock",
            url,
            priceSpecification: { "@type": "UnitPriceSpecification", price: u.prices!.RETAIL.toFixed(2), priceCurrency: "ZAR", unitText: u.label },
          })),
        }
      : {}),
  };

  const spec = (
    [
      ["Standard", product.gradingStandard],
      ["Profile", product.roofProfile],
      ["Thickness", product.thicknessMm !== null ? `${product.thicknessMm.toFixed(2)} mm` : null],
      ["Coating", product.coating],
      ["Cover width", product.coverWidthMm !== null ? `${product.coverWidthMm} mm per sheet` : null],
      ["Section", timber ? `${product.section} (thickness × width)` : null],
      ["Strength grade", timber ? `${product.timberGrade} (SANS 1783)` : null],
      ["Treatment", timber ? `${product.timberTreatment} CCA (SANS 10005) — ${product.timberTreatment === "H2" ? "dry, under cover" : "above ground, exposed to weather"}` : null],
      ["Profile", timber ? product.timberFinish : null],
      ["Lengths", timber ? "3.0, 3.6, 4.2, 4.8, 6.0 and 6.6 m" : null],
      ["Lengths", sheet ? `3.0, 3.6, 4.2, 4.8, 6.0 and 6.6 m in stock lengths; ${CUT_TO_LENGTH.min_m}–${CUT_TO_LENGTH.max_m} m cut to length` : null],
      ["Size", product.unitSize],
      ["Category code", ROOFING_CATEGORY_CODES[product.categorySlug] ?? SUPPLIES_CATEGORY_CODES[product.categorySlug] ?? null],
    ] as [string, string | null][]
  ).filter(([, value]) => value);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> /{" "}
        <Link href={supplies ? (department?.href ?? "/departments") : "/roofing"} className="hover:text-seam-blue">{supplies ? (department?.name ?? "Departments") : "Roofing"}</Link> /{" "}
        <Link href={`/products?category=${category.slug}`} className="hover:text-seam-blue">{category.name}</Link> / {product.name}
      </nav>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <ProductGallery sku={product.sku} categorySlug={product.categorySlug} images={product.images} />
          {timber && <TimberVariantPicker product={product} />}
          {sheet && <CutToLengthForm sku={product.sku} name={product.name} ratePerMetre={product.listPricePerMetre} />}
          {sheet && (
            <Link href="/roofing#roof-calculator" className="block rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-4 font-body text-sm text-basalt hover:border-seam-blue">
              <span className="font-semibold">How many sheets?</span> The roof calculator works out sheets, ridge, underlay, insulation and gutters from the roof&apos;s plan size and pitch →
            </Link>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate">
            {category.name}
            {product.gradingStandard ? ` · ${product.gradingStandard}` : ""} · {product.sku}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{product.name}</h1>
          <RatingSummaryLink sku={product.sku} />
          <p className="mt-3 font-display text-2xl font-bold text-seam-blue">
            {(sheet || timber) && product.listPricePerMetre !== null ? (
              <>
                {formatZAR(product.listPricePerMetre)} <span className="text-base font-normal text-slate">/ metre</span>
              </>
            ) : priced[0] ? (
              <>
                {formatZAR(priced[0].prices!.RETAIL)} <span className="text-base font-normal text-slate">/ {priced[0].label.toLowerCase()}</span>
              </>
            ) : (
              <span className="text-xl">Price on request</span>
            )}
          </p>
          {timber && priced[0] && (
            <p className="mt-1 font-body text-xs text-slate">
              From {formatZAR(priced[0].prices!.RETAIL)} ({priced[0].label}) to {formatZAR(priced[priced.length - 1].prices!.RETAIL)} ({priced[priced.length - 1].label}).
            </p>
          )}
          {sheet && priced[0] && (
            <p className="mt-1 font-body text-xs text-slate">
              Stock lengths from {formatZAR(priced[0].prices!.RETAIL)} ({priced[0].label}) — or cut to any length from {CUT_TO_LENGTH.min_m} m to {CUT_TO_LENGTH.max_m} m on a quote.
            </p>
          )}
          <p className="mt-4 whitespace-pre-line font-body text-sm text-slate">{product.description ?? product.summary}</p>
          <LeadTimeNote categorySlug={product.categorySlug} />
          <div className="mt-6">
            <PackagedUnitSelector product={stockUnits} />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-end gap-4 border-t border-basalt/10 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <SaveToProject sku={product.sku} />
              <CompareToggle sku={product.sku} />
              <SocialShareButtons productName={product.name} productUrl={url} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <section className="rounded-sm border border-basalt/10 bg-white p-6 md:col-span-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Specification</h2>
          <table className="mt-3 w-full text-left font-body text-sm">
            <tbody>
              {spec.map(([label, value]) => (
                <tr key={label} className="border-b border-basalt/5">
                  <th className="py-2 pr-4 font-normal text-slate">{label}</th>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
              {stockUnits.units.map((u) => (
                <tr key={u.unit} className="border-b border-basalt/5">
                  <th className="py-2 pr-4 font-normal text-slate">{u.label}</th>
                  <td className="py-2">
                    {u.prices
                      ? [
                          `${formatZAR(u.prices.RETAIL)} retail`,
                          u.prices.CONTRACTOR_TRADE === null ? "trade quoted" : `${formatZAR(u.prices.CONTRACTOR_TRADE)} trade`,
                          u.prices.VOLUME_CIVIL_BULK === null ? "volume quoted" : `${formatZAR(u.prices.VOLUME_CIVIL_BULK)} volume`,
                        ].join(" · ")
                      : unpricedLabel(u.pricingStatus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Typical Uses</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-sm text-basalt">
            {product.typicalUses.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ul>
          <p className="mt-3 font-body text-xs text-slate">
            {supplies
              ? "Sizes, ratings and the build-up come from your drawings and the maker's installation guide; plumbing, geysers and electrical work need a registered installer."
              : sheet
              ? "The minimum pitch, purlin spacing and fixing pattern for a profile and gauge come from the maker's tables; your truss design and drawings govern."
              : timber
                ? "Member sizes, spans and the grade come from your truss design, the SANS 10400-L span tables or your engineer — S7 only where it is specified."
                : "Your drawings, the truss design and SANS 10400 decide the build-up — follow the maker's installation guide."}
          </p>
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Handling &amp; Storage</h2>
          <p className="mt-3 font-body text-sm text-basalt">{product.handlingNotes}</p>
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Delivery &amp; Returns</h2>
          <p className="mt-3 font-body text-sm text-basalt">
            {supplies ? (
              <>
                Building supplies come on the merchant&apos;s own vehicle: we confirm stock, make and finish where the quote says so, the delivery slot and any delivery
                charge with you before dispatch. See the{" "}
              </>
            ) : timber ? (
              <>Timber comes on the merchant&apos;s flatbed: we confirm the grade and treatment, stock, the delivery slot and any delivery charge with you before dispatch. See the </>
            ) : (
              <>
                {sheet ? "Roof sheets" : "Roofing accessories"} come on the merchant&apos;s flatbed: we confirm the delivery slot, any delivery charge and any cut-to-length lead time with you
                before dispatch. Cut-to-length sheets are made for your order and can&apos;t be returned or refunded once cut, so check every length on your quote before you accept it. See the{" "}
              </>
            )}
            <Link href="/legal/shipping-delivery" className="text-seam-blue underline">Shipping &amp; Delivery</Link> and{" "}
            <Link href="/legal/returns-refunds" className="text-seam-blue underline">Returns &amp; Refunds</Link> policies. Returning materials that were supplied
            correctly carries an 18% <Link href="/legal/handling-fee" className="text-seam-blue underline">handling fee</Link>.
          </p>
        </section>
      </div>

      <ProductReviews sku={product.sku} slug={product.slug} productName={product.name} />

      <CompleteTheJob sku={product.sku} categorySlug={product.categorySlug} />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-xl font-bold text-basalt">
            {timber ? `Other sizes in ${product.timberGrade} ${product.timberTreatment} ${product.timberFinish?.toLowerCase()}` : `More in ${category.name}`}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PackagedProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      )}
      <RecentlyViewedRow current={product.sku} />
      <CompareTray />
    </div>
  );
}
