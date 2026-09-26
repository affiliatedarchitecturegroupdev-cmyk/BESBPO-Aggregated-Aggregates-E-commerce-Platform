import Link from "next/link";
import type { Product } from "@/data/catalogue";
import { formatZAR, UNIT_LABELS } from "@/lib/pricing";

export function ProductCard({ product }: { product: Product }) {
  const retail = product.prices.RETAIL;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-sm border border-basalt/10 bg-white p-4 transition hover:border-seam-blue hover:shadow-sm"
    >
      <div className="flex h-28 items-center justify-center rounded-sm bg-limestone font-mono text-[10px] text-slate">IMG</div>
      <p className="mt-3 font-body text-sm font-semibold text-basalt group-hover:text-seam-blue">{product.name}</p>
      {product.gradingStandard && <p className="font-mono text-[10px] text-slate">{product.gradingStandard}</p>}
      <p className="mt-2 font-body text-sm text-slate">
        {product.units
          .map((unit) =>
            unit === "bag"
              ? `${formatZAR(retail.bag ?? 0)} /${product.bagWeightKg}kg bag`
              : `${formatZAR(retail[unit] ?? 0)} /${UNIT_LABELS[unit]}`,
          )
          .join(" • ")}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-sm bg-limestone px-2 py-1 font-mono text-[10px] text-slate">
          {product.units.includes("bag") ? (product.units.length > 1 ? "Bulk / Bag ▾" : "Bagged only") : "Bulk only"}
        </span>
        <span className="rounded-sm bg-seam-blue px-3 py-1.5 font-body text-xs font-semibold text-limestone group-hover:bg-basalt">
          Add to Quote
        </span>
      </div>
    </Link>
  );
}
