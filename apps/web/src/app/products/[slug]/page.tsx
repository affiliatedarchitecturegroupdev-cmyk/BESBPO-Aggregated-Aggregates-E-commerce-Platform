import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BulkBagCalculator } from "@/components/product/BulkBagCalculator";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductTabs } from "@/components/product/ProductTabs";
import { pricePoints, PRODUCTS } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { getCatalogue, getProduct } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};
  const [headline] = pricePoints(product);
  return {
    title: product.name,
    description: `${product.name} from ${formatZAR(headline.price)}/${headline.label}, sold ${product.unitOfSaleLabel}. Delivered across KZN and Gauteng.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: product.images[0] ? { images: [{ url: product.images[0].src, alt: product.images[0].alt }] } : undefined,
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  // Products staff hide in the admin 404 here (and drop out of listings).
  const product = await getProduct(params.slug);
  if (!product) notFound();

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
          <div className="mt-6">
            <BulkBagCalculator product={product} />
          </div>
        </div>
      </div>

      <div className="mt-12">
        <ProductTabs product={product} categoryName={category.name} />
      </div>

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
