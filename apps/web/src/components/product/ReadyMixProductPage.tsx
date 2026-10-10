import Link from "next/link";
import { GroupServiceBanner } from "@/components/merchandising/GroupServiceBanner";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ReadyMixCalculator } from "@/components/product/ReadyMixCalculator";
import { SaveToProject } from "@/components/projects/SaveToProject";
import { SocialShareButtons } from "@/components/social/SocialShareButtons";
import { CATEGORIES } from "@/data/categories";
import { READY_MIX_PRODUCTS } from "@/data/ready-mix";
import type { MerchandisedReadyMixProduct } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

/** Product page for CAT-12 ready-mix concrete: one strength grade per page. */
export function ReadyMixProductPage({ product }: { product: MerchandisedReadyMixProduct }) {
  const category = CATEGORIES.find((c) => c.slug === product.categorySlug)!;
  const prices = product.units[0].prices;
  const related = READY_MIX_PRODUCTS.filter((p) => p.sku !== product.sku);
  const url = `${SITE_URL}/products/${product.slug}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    category: category.name,
    description: product.description ?? category.description,
    brand: { "@type": "Brand", name: "Aggregated Aggregates" },
    ...(product.gradingStandard ? { additionalProperty: { "@type": "PropertyValue", name: "Standard", value: product.gradingStandard } } : {}),
    ...(product.images[0] ? { image: `${SITE_URL}${product.images[0].src}` } : {}),
    ...(prices
      ? {
          offers: {
            "@type": "Offer",
            price: prices.RETAIL.toFixed(2),
            priceCurrency: "ZAR",
            availability: "https://schema.org/InStock",
            url,
            priceSpecification: { "@type": "UnitPriceSpecification", price: prices.RETAIL.toFixed(2), priceCurrency: "ZAR", unitText: "m³" },
          },
        }
      : {}),
  };

  const rows: [string, string][] = [
    ["Standard", product.gradingStandard ?? "SANS 878"],
    ["Strength grade", `${product.strengthGradeMPa} MPa`],
    ["Mix", product.mixType],
    ["Minimum order", `${product.minimumLoadM3}m³ (one full mixer-truck load)`],
    [
      "Price per m³",
      prices
        ? [
            `${formatZAR(prices.RETAIL)} retail`,
            prices.CONTRACTOR_TRADE === null ? "trade quoted" : `${formatZAR(prices.CONTRACTOR_TRADE)} trade`,
            prices.VOLUME_CIVIL_BULK === null ? "volume quoted" : `${formatZAR(prices.VOLUME_CIVIL_BULK)} volume`,
          ].join(" · ")
        : product.pricingStatus,
    ],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> /{" "}
        <Link href={`/products?category=${category.slug}`} className="hover:text-seam-blue">{category.name}</Link> / {product.name}
      </nav>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductGallery sku={product.sku} categorySlug={product.categorySlug} images={product.images} />
        <div>
          <p className="font-mono text-xs text-slate">
            {category.name} · {product.gradingStandard ?? "SANS 878"} · {product.sku}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{product.name}</h1>
          <p className="mt-3 font-display text-2xl font-bold text-seam-blue">
            {prices ? (
              <>
                {formatZAR(prices.RETAIL)} <span className="text-base font-normal text-slate">/ m³</span>
              </>
            ) : (
              <span className="text-xl">Price on request</span>
            )}
          </p>
          <p className="mt-4 whitespace-pre-line font-body text-sm text-slate">{product.description ?? category.description}</p>
          <div className="mt-6">
            <ReadyMixCalculator product={product} />
          </div>
          <div className="mt-6 flex justify-end border-t border-basalt/10 pt-5">
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
              {rows.map(([label, value]) => (
                <tr key={label} className="border-b border-basalt/5">
                  <th className="py-2 pr-4 font-normal text-slate">{label}</th>
                  <td className="py-2">{value}</td>
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
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">On the day</h2>
          <p className="mt-3 font-body text-sm text-basalt">{product.handlingNotes}</p>
        </section>
        <section className="rounded-sm border border-basalt/10 bg-white p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Delivery &amp; testing</h2>
          <p className="mt-3 font-body text-sm text-basalt">
            Batched at the partner plant nearest your site and delivered by mixer truck. We book your pour slot with the
            plant before dispatch. Cube tests to SANS 5863 on request. See the{" "}
            <Link href="/legal/shipping-delivery" className="text-seam-blue underline">Shipping &amp; Delivery</Link> policy.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <GroupServiceBanner categorySlug={product.categorySlug} placement={`product_${product.categorySlug}`} />
      </div>

      <section className="mt-16">
        <h2 className="font-display text-xl font-bold text-basalt">Other strength grades</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((p) => (
            <PackagedProductCard key={p.sku} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
