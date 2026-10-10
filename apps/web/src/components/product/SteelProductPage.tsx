import Link from "next/link";
import { CompleteTheJob } from "@/components/merchandising/CompleteTheJob";
import { BarMassCalculator } from "@/components/product/BarMassCalculator";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { PackagedUnitSelector } from "@/components/product/PackagedUnitSelector";
import { ProductGallery } from "@/components/product/ProductGallery";
import { SaveToProject } from "@/components/projects/SaveToProject";
import { SocialShareButtons } from "@/components/social/SocialShareButtons";
import { CATEGORIES } from "@/data/categories";
import { STEEL_CATEGORY_CODES, STEEL_PRODUCTS } from "@/data/steel";
import type { MerchandisedSteelProduct } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

/** Product page for CAT-15..18 steel: rebar, mesh & brickforce, fixing accessories, structural sections. */
export function SteelProductPage({ product }: { product: MerchandisedSteelProduct }) {
  const category = CATEGORIES.find((c) => c.slug === product.categorySlug)!;
  const priced = product.units.filter((u) => u.prices !== null);
  const related = STEEL_PRODUCTS.filter((p) => p.categorySlug === product.categorySlug && p.sku !== product.sku).slice(0, 4);
  const url = `${SITE_URL}/products/${product.slug}`;
  const isBar = product.categorySlug === "reinforcing-bar" && product.diameterMm !== null;

  // Offers only for benchmarked units — an unpriced product never implies a price.
  const structuredData = {
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
      ["Product type", product.steelFamily],
      ["Grade", product.steelGrade],
      ["Diameter", product.diameterMm !== null ? `${product.diameterMm} mm` : null],
      ["Nominal mass", product.massKgPerM !== null ? `${product.massKgPerM} kg/m (SANS 920)` : null],
      ["Size", product.sectionSize],
      ["Category code", STEEL_CATEGORY_CODES[product.categorySlug] ?? null],
    ] as [string, string | null][]
  ).filter(([, value]) => value);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> /{" "}
        <Link href="/reinforcing-steel" className="hover:text-seam-blue">Reinforcing &amp; Structural Steel</Link> /{" "}
        <Link href={`/products?category=${category.slug}`} className="hover:text-seam-blue">{category.name}</Link> / {product.name}
      </nav>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <ProductGallery sku={product.sku} categorySlug={product.categorySlug} images={product.images} />
          {isBar && <BarMassCalculator diameterMm={product.diameterMm!} />}
        </div>
        <div>
          <p className="font-mono text-xs text-slate">
            {category.name}
            {product.gradingStandard ? ` · ${product.gradingStandard}` : ""} · {product.sku}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{product.name}</h1>
          <p className="mt-3 font-display text-2xl font-bold text-seam-blue">
            {priced[0] ? (
              <>
                {formatZAR(priced[0].prices!.RETAIL)} <span className="text-base font-normal text-slate">/ {priced[0].label}</span>
              </>
            ) : (
              <span className="text-xl">Price on request</span>
            )}
          </p>
          <p className="mt-4 whitespace-pre-line font-body text-sm text-slate">{product.description ?? product.summary}</p>
          <div className="mt-6">
            <PackagedUnitSelector product={product} />
          </div>
          {product.categorySlug === "reinforcing-bar" && (
            <p className="mt-4 rounded-sm border border-basalt/10 bg-limestone/60 p-3 font-body text-xs text-basalt">
              <strong>Need it cut and bent?</strong>{" "}
              <Link href="/reinforcing-steel/cut-and-bend" className="text-seam-blue underline">Send us your bar bending schedule</Link> (SANS 282 shape
              codes) and we price the steel, cutting and bending with the merchant.
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-4 border-t border-basalt/10 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <SaveToProject sku={product.sku} />
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
              {product.units.map((u) => (
                <tr key={u.unit} className="border-b border-basalt/5">
                  <th className="py-2 pr-4 font-normal text-slate">
                    {u.label}
                    {u.weightKg !== null && u.unit !== "TONNE" ? ` (≈ ${u.weightKg} kg)` : ""}
                  </th>
                  <td className="py-2">
                    {u.prices
                      ? [
                          `${formatZAR(u.prices.RETAIL)} retail`,
                          u.prices.CONTRACTOR_TRADE === null ? "trade quoted" : `${formatZAR(u.prices.CONTRACTOR_TRADE)} trade`,
                          u.prices.VOLUME_CIVIL_BULK === null ? "volume quoted" : `${formatZAR(u.prices.VOLUME_CIVIL_BULK)} volume`,
                        ].join(" · ")
                      : u.pricingStatus}
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
          <p className="mt-3 font-body text-xs text-slate">Your engineer&apos;s drawings decide the size, grade and quantity.</p>
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Handling &amp; Storage</h2>
          <p className="mt-3 font-body text-sm text-basalt">{product.handlingNotes}</p>
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Delivery &amp; Returns</h2>
          <p className="mt-3 font-body text-sm text-basalt">
            Steel is delivered on the merchant&apos;s flatbed or crane truck, not a tipper: we confirm the delivery slot and any
            delivery charge with you before dispatch, and mill certificates travel with the load. See the{" "}
            <Link href="/legal/shipping-delivery" className="text-seam-blue underline">Shipping &amp; Delivery</Link> and{" "}
            <Link href="/legal/returns-refunds" className="text-seam-blue underline">Returns &amp; Refunds</Link> policies.
          </p>
        </section>
      </div>

      <CompleteTheJob sku={product.sku} categorySlug={product.categorySlug} />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-xl font-bold text-basalt">More in {category.name}</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PackagedProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
