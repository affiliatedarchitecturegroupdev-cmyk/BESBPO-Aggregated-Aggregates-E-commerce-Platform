import type { Metadata } from "next";
import { CompleteTheJob } from "@/components/merchandising/CompleteTheJob";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BulkBagCalculator } from "@/components/product/BulkBagCalculator";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductTabs } from "@/components/product/ProductTabs";
import { GroupServiceBanner } from "@/components/merchandising/GroupServiceBanner";
import { SaveToProject } from "@/components/projects/SaveToProject";
import { SocialShareButtons } from "@/components/social/SocialShareButtons";
import { WhatsAppOrderButton } from "@/components/social/WhatsAppCta";
import { PackagedProductPage } from "@/components/product/PackagedProductPage";
import { ReadyMixProductPage } from "@/components/product/ReadyMixProductPage";
import { MasonryProductPage } from "@/components/product/MasonryProductPage";
import { SteelProductPage } from "@/components/product/SteelProductPage";
import { pricePoints, PRODUCTS } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { PACKAGED_PRODUCTS } from "@/data/packaged";
import { READY_MIX_PRODUCTS } from "@/data/ready-mix";
import { MASONRY_PRODUCTS } from "@/data/masonry";
import { STEEL_PRODUCTS } from "@/data/steel";
import { getCatalogue, getPackagedCatalogue, getProduct, getReadyMixCatalogue, getSteelCatalogue, getMasonryCatalogue } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return [...PRODUCTS, ...PACKAGED_PRODUCTS, ...READY_MIX_PRODUCTS, ...STEEL_PRODUCTS, ...MASONRY_PRODUCTS].map((p) => ({ slug: p.slug }));
}

async function getPackaged(slug: string) {
  return (await getPackagedCatalogue()).find((p) => p.slug === slug);
}

async function getSteel(slug: string) {
  return (await getSteelCatalogue()).find((p) => p.slug === slug);
}

async function getMasonry(slug: string) {
  return (await getMasonryCatalogue()).find((p) => p.slug === slug);
}

async function getReadyMix(slug: string) {
  return (await getReadyMixCatalogue()).find((p) => p.slug === slug);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) {
    const readyMix = await getReadyMix(params.slug);
    if (readyMix) {
      const price = readyMix.units[0].prices?.RETAIL;
      return {
        title: readyMix.name,
        description: `${readyMix.name} (${readyMix.gradingStandard ?? "SANS 878"})${price ? ` from ${formatZAR(price)}/m³` : ""} — full mixer-truck loads from ${readyMix.minimumLoadM3}m³, delivered by the plant nearest your site.`,
        alternates: { canonical: `/products/${readyMix.slug}` },
      };
    }
    const steel = await getSteel(params.slug);
    if (steel) {
      const price = steel.units.find((u) => u.prices)?.prices?.RETAIL;
      const unit = steel.units.find((u) => u.prices)?.label;
      return {
        title: steel.name,
        description: `${steel.name}${steel.gradingStandard ? ` (${steel.gradingStandard})` : ""}${price ? ` from ${formatZAR(price)} per ${unit?.toLowerCase()}` : ""} — sold by ${steel.units.map((u) => u.label.toLowerCase()).join(", ")}, delivered by flatbed.`,
        alternates: { canonical: `/products/${steel.slug}` },
      };
    }
    const masonry = await getMasonry(params.slug);
    if (masonry) {
      const unit = masonry.units.find((u) => u.prices);
      return {
        title: masonry.name,
        description: `${masonry.name}${masonry.gradingStandard ? ` (${masonry.gradingStandard})` : ""}${unit ? ` from ${formatZAR(unit.prices!.RETAIL)} ${unit.label.toLowerCase()}` : ""} — delivered palletised by flatbed across South Africa.`,
        alternates: { canonical: `/products/${masonry.slug}` },
      };
    }
    const packaged = await getPackaged(params.slug);
    if (!packaged) return {};
    return {
      title: packaged.name,
      description: `${packaged.name}${packaged.gradingStandard ? ` (${packaged.gradingStandard})` : ""} — sold by ${packaged.units.map((u) => u.label).join(", ")}. ${packaged.typicalUses[0]}.`,
      alternates: { canonical: `/products/${packaged.slug}` },
    };
  }
  const [headline] = pricePoints(product);
  return {
    title: product.name,
    description: `${product.name} from ${formatZAR(headline.price)}/${headline.label}, sold ${product.unitOfSaleLabel}. Delivered across South Africa.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: product.images[0] ? { images: [{ url: product.images[0].src, alt: product.images[0].alt }] } : undefined,
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  // Products staff hide in the admin 404 here (and drop out of listings).
  const product = await getProduct(params.slug);
  if (!product) {
    const readyMix = await getReadyMix(params.slug);
    if (readyMix) return <ReadyMixProductPage product={readyMix} />;
    const steel = await getSteel(params.slug);
    if (steel) return <SteelProductPage product={steel} />;
    const masonry = await getMasonry(params.slug);
    if (masonry) return <MasonryProductPage product={masonry} />;
    const packaged = await getPackaged(params.slug);
    if (!packaged) notFound();
    return <PackagedProductPage product={packaged} />;
  }

  const category = CATEGORIES.find((c) => c.slug === product.categorySlug)!;
  const [headline, ...others] = pricePoints(product);
  const related = (await getCatalogue()).filter((p) => p.categorySlug === product.categorySlug && p.sku !== product.sku).slice(0, 4);

  // schema.org Product data so search engines can show the price.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    category: category.name,
    description: product.description ?? category.description,
    brand: { "@type": "Brand", name: "Aggregated Aggregates" },
    ...(product.gradingStandard ? { additionalProperty: { "@type": "PropertyValue", name: "Grading standard", value: product.gradingStandard } } : {}),
    ...(product.images[0] ? { image: `${SITE_URL}${product.images[0].src}` } : {}),
    offers: pricePoints(product).map((point) => ({
      "@type": "Offer",
      price: point.price.toFixed(2),
      priceCurrency: "ZAR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/products/${product.slug}`,
      priceSpecification: { "@type": "UnitPriceSpecification", price: point.price.toFixed(2), priceCurrency: "ZAR", unitText: point.label },
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        // JSON.stringify escapes quotes; "<" is escaped so the JSON can't close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> /{" "}
        <Link href="/products" className="hover:text-seam-blue">Products</Link> /{" "}
        <Link href={`/products?category=${category.slug}`} className="hover:text-seam-blue">{category.name}</Link> /{" "}
        {product.name}
      </nav>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductGallery sku={product.sku} categorySlug={product.categorySlug} images={product.images} />
        <div>
          <p className="font-mono text-xs text-slate">
            {category.name}
            {product.gradingStandard ? ` · ${product.gradingStandard}` : ""} · {product.sku}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{product.name}</h1>
          <p className="mt-3 font-display text-2xl font-bold text-seam-blue">
            {formatZAR(headline.price)} <span className="text-base font-normal text-slate">/ {headline.label}</span>
          </p>
          {others.length > 0 && (
            <p className="font-body text-sm text-slate">
              {others.map((p) => `${formatZAR(p.price)} / ${p.label}`).join(" • ")}
            </p>
          )}
          <p className="mt-4 whitespace-pre-line font-body text-sm text-slate">{product.description ?? category.description}</p>
          <div id="calculator" className="mt-6 scroll-mt-24">
            <BulkBagCalculator product={product} />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-basalt/10 pt-5">
            {/* WhatsApp ordering is for bagged, Retail-scale orders; bulk goes through the quote flow. */}
            {product.units.includes("bag") ? <WhatsAppOrderButton productName={`${product.name} (${product.sku})`} /> : <span />}
            <div className="flex flex-wrap items-center gap-3">
              <SaveToProject sku={product.sku} />
              <SocialShareButtons productName={product.name} productUrl={`${SITE_URL}/products/${product.slug}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <ProductTabs product={product} categoryName={category.name} />
      </div>

      <div className="mt-10">
        <GroupServiceBanner categorySlug={product.categorySlug} placement={`product_${product.categorySlug}`} />
      </div>

      <CompleteTheJob sku={product.sku} categorySlug={product.categorySlug} />

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-xl font-bold text-basalt">More in {category.name}</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
