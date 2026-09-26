import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BulkBagCalculator } from "@/components/product/BulkBagCalculator";
import { MaterialSwatch } from "@/components/product/MaterialSwatch";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductTabs } from "@/components/product/ProductTabs";
import { findProduct, pricePoints, PRODUCTS, productsInCategory } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { formatZAR } from "@/lib/pricing";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const product = findProduct(params.slug);
  if (!product) return {};
  const [headline] = pricePoints(product);
  return {
    title: product.name,
    description: `${product.name} from ${formatZAR(headline.price)}/${headline.label}, sold ${product.unitOfSaleLabel}. Delivered across KZN and Gauteng.`,
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = findProduct(params.slug);
  if (!product) notFound();

  const category = CATEGORIES.find((c) => c.slug === product.categorySlug)!;
  const [headline, ...others] = pricePoints(product);
  const related = productsInCategory(product.categorySlug).filter((p) => p.sku !== product.sku).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> /{" "}
        <Link href="/products" className="hover:text-seam-blue">Products</Link> /{" "}
        <Link href={`/products?category=${category.slug}`} className="hover:text-seam-blue">{category.name}</Link> /{" "}
        {product.name}
      </nav>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div>
          <MaterialSwatch sku={product.sku} categorySlug={product.categorySlug} className="h-80" grains={260} />
          <p className="mt-2 font-mono text-[10px] text-slate">Illustrative texture — colour and grading vary by source.</p>
        </div>
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
          <p className="mt-4 font-body text-sm text-slate">{category.description}</p>
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
