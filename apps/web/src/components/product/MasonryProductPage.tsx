import Link from "next/link";
import { CompleteTheJob } from "@/components/merchandising/CompleteTheJob";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { PackagedUnitSelector } from "@/components/product/PackagedUnitSelector";
import { ProductGallery } from "@/components/product/ProductGallery";
import { WallCalculator } from "@/components/product/WallCalculator";
import { SaveToProject } from "@/components/projects/SaveToProject";
import { SocialShareButtons } from "@/components/social/SocialShareButtons";
import { CATEGORIES } from "@/data/categories";
import { LINE_PAGE, lineOf, MASONRY_CATEGORY_CODES, MASONRY_PRODUCTS } from "@/data/masonry";
import type { MerchandisedMasonryProduct } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

/** Product page for the masonry & precast line, CAT-19..25: walling, paving & retaining, and drainage & membranes. */
export function MasonryProductPage({ product }: { product: MerchandisedMasonryProduct }) {
  const category = CATEGORIES.find((c) => c.slug === product.categorySlug)!;
  const priced = product.units.filter((u) => u.prices !== null);
  const related = MASONRY_PRODUCTS.filter((p) => p.categorySlug === product.categorySlug && p.sku !== product.sku).slice(0, 4);
  const url = `${SITE_URL}/products/${product.slug}`;
  const walling = product.unitsPerM2 !== null;
  const line = lineOf(product.categorySlug);
  const paving = line === "paving";
  const drainage = line === "drainage";
  const perM2Label = paving ? (product.categorySlug === "paving-kerbs-edging" ? "Per m² of paving" : "Per m² of wall face") : "Per m² of wall";

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
      ["Type", product.masonryClass],
      ["Size", product.unitSize],
      [perM2Label, walling ? `About ${product.unitsPerM2}${paving ? "" : " (single leaf, 10 mm joints)"}` : null],
      ["Category code", MASONRY_CATEGORY_CODES[product.categorySlug] ?? null],
    ] as [string, string | null][]
  ).filter(([, value]) => value);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> /{" "}
        <Link href={LINE_PAGE[line].href} className="hover:text-seam-blue">{LINE_PAGE[line].label}</Link>{" "}
        /{" "}
        <Link href={`/products?category=${category.slug}`} className="hover:text-seam-blue">{category.name}</Link> / {product.name}
      </nav>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <ProductGallery sku={product.sku} categorySlug={product.categorySlug} images={product.images} />
          {walling && product.categorySlug !== "retaining-erosion-control" && (
            <WallCalculator
              mode={product.categorySlug === "paving-kerbs-edging" ? "area" : "wall"}
              options={[
                {
                  sku: product.sku,
                  slug: product.slug,
                  name: product.name,
                  unitsPerM2: product.unitsPerM2!,
                  unit: product.units[0].unit,
                  price: product.units[0].prices?.RETAIL ?? null,
                },
              ]}
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate">
            {category.name}
            {product.gradingStandard ? ` · ${product.gradingStandard}` : ""} · {product.sku}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{product.name}</h1>
          <p className="mt-3 font-display text-2xl font-bold text-seam-blue">
            {priced[0] ? (
              <>
                {formatZAR(priced[0].prices!.RETAIL)} <span className="text-base font-normal text-slate">/ {priced[0].label.toLowerCase()}</span>
              </>
            ) : (
              <span className="text-xl">Price on request</span>
            )}
          </p>
          {priced[0]?.unit === "THOUSAND" && (
            <p className="mt-1 font-body text-xs text-slate">That&apos;s {formatZAR(priced[0].prices!.RETAIL / 1000)} a brick — bricks are sold per 1,000.</p>
          )}
          <p className="mt-4 whitespace-pre-line font-body text-sm text-slate">{product.description ?? product.summary}</p>
          <div className="mt-6">
            <PackagedUnitSelector product={product} />
          </div>
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
                  <th className="py-2 pr-4 font-normal text-slate">{u.label}</th>
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
          <p className="mt-3 font-body text-xs text-slate">
            {drainage
              ? "Falls, bedding and connections to the municipal system follow the drawings, SANS 10400-P and the local authority's requirements."
              : paving
              ? "The base, bedding and wall design (height, drainage, backfill) decide how it performs — follow the maker's tables or an engineer."
              : "Your drawings and the NHBRC requirements decide the unit, strength and wall build-up."}
          </p>
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Handling &amp; Storage</h2>
          <p className="mt-3 font-body text-sm text-basalt">{product.handlingNotes}</p>
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Delivery &amp; Returns</h2>
          <p className="mt-3 font-body text-sm text-basalt">
            {drainage ? "Pipes, precast units and rolls" : paving ? "Pavers, kerbs, retaining blocks and gabions" : "Bricks, blocks and lintels"} come palletised on the supplier&apos;s flatbed or crane truck: we confirm the delivery slot, any
            delivery charge and the yard&apos;s minimum load with you before dispatch. See the{" "}
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
