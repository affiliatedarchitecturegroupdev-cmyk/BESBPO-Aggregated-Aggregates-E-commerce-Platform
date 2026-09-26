import { notFound } from "next/navigation";
import { BulkBagCalculator } from "@/components/product/BulkBagCalculator";
import { DeliveryEstimator } from "@/components/delivery/DeliveryEstimator";
import { CATEGORIES } from "@/data/categories";
import { SAMPLE_PRODUCTS } from "@/data/products.sample";

export function generateStaticParams() {
  return SAMPLE_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = SAMPLE_PRODUCTS.find((p) => p.slug === params.slug);
  if (!product) notFound();

  const category = CATEGORIES.find((c) => c.slug === product.categorySlug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate">
        Home / Products / {category?.name} / {product.name}
      </nav>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="flex h-80 items-center justify-center rounded-sm bg-white font-mono text-xs text-slate">
          PRODUCT IMAGE GALLERY
        </div>
        <div>
          <p className="font-mono text-xs text-slate">
            {category?.name}
            {product.gradingStandard ? ` · ${product.gradingStandard}` : ""}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{product.name}</h1>
          <p className="mt-4 font-body text-sm text-slate">
            {category?.description}
          </p>
          <div className="mt-6">
            <BulkBagCalculator product={product} />
          </div>
          <div className="mt-6">
            <DeliveryEstimator />
          </div>
        </div>
      </div>

      <div className="mt-12 rounded-sm border border-basalt/10 bg-white">
        <div className="flex border-b border-basalt/10 font-body text-sm">
          <button className="border-b-2 border-seam-blue px-4 py-3 font-semibold text-seam-blue">Specification</button>
          <button className="px-4 py-3 text-slate">Grading Curve</button>
          <button className="px-4 py-3 text-slate">Compliance Docs (SANS/COA)</button>
          <button className="px-4 py-3 text-slate">Delivery & Returns</button>
        </div>
        <div className="p-6 font-body text-sm text-basalt">
          {product.gradingStandard
            ? `Graded to ${product.gradingStandard}. Compliance documents and, where available, a batch-specific Certificate of Analysis are attached to this product page and the order record.`
            : "Specification and compliance documents for this product are attached per batch where applicable."}
        </div>
      </div>
    </div>
  );
}
