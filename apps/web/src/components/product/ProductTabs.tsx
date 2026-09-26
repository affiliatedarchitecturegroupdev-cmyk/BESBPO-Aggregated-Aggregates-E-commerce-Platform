"use client";

import Link from "next/link";
import { useState } from "react";
import { CUSTOMER_TIERS, DELIVERY_RULES, pricePoints, type Product } from "@/data/catalogue";
import { formatZAR } from "@/lib/pricing";

const TABS = ["Specification", "Grading Curve", "Compliance Docs (SANS/COA)", "Delivery & Returns"] as const;
type Tab = (typeof TABS)[number];

const LOAD_LABELS = { M3_6: "6m³ load", M3_10: "10m³ load", M3_14_PLUS: "14m³+ / Interlink" } as const;

export function ProductTabs({ product, categoryName }: { product: Product; categoryName: string }) {
  const [tab, setTab] = useState<Tab>("Specification");

  return (
    <div className="rounded-sm border border-basalt/10 bg-white">
      <div className="flex overflow-x-auto border-b border-basalt/10 font-body text-sm" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap px-4 py-3 ${
              tab === t ? "border-b-2 border-seam-blue font-semibold text-seam-blue" : "text-slate hover:text-basalt"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="p-6 font-body text-sm text-basalt" role="tabpanel">
        {tab === "Specification" && <Specification product={product} categoryName={categoryName} />}
        {tab === "Grading Curve" && (
          <p className="text-slate">
            {product.gradingStandard
              ? `Supplied to ${product.gradingStandard} grading limits. `
              : ""}
            Grading curves vary by source quarry and are published per supplier batch — request the curve for your
            delivery with your quote, and it is attached to the order record.
          </p>
        )}
        {tab === "Compliance Docs (SANS/COA)" && (
          <p className="text-slate">
            {product.gradingStandard
              ? `Reference standard: ${product.gradingStandard}. `
              : "This material has no single reference standard. "}
            Where the supplier issues one, a batch-specific Certificate of Analysis (COA) is attached to this product and
            your order record.
          </p>
        )}
        {tab === "Delivery & Returns" && <DeliveryTable />}
      </div>
    </div>
  );
}

function Specification({ product, categoryName }: { product: Product; categoryName: string }) {
  const rows: [string, string][] = [
    ["SKU", product.sku],
    ["Category", categoryName],
    ["Reference standard", product.gradingStandard ?? "—"],
    ["Sold", product.unitOfSaleLabel],
    ["Bulk density (for ton ⇄ m³)", `${product.bulkDensityKgPerM3.toLocaleString("en-US")} kg/m³`],
    ...(product.bagWeightKg ? [["Bag weight", `${product.bagWeightKg} kg`] as [string, string]] : []),
    ...pricePoints(product).flatMap((point) =>
      CUSTOMER_TIERS.map(
        (tier) => [`${tier.label} — per ${point.label}`, formatZAR(product.prices[tier.name][point.unit] ?? 0)] as [string, string],
      ),
    ),
  ];
  return (
    <table className="w-full text-left">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-b border-basalt/5">
            <th className="py-2 pr-4 font-normal text-slate">{label}</th>
            <td className="py-2">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DeliveryTable() {
  const [included, ...banded] = DELIVERY_RULES.bands;
  return (
    <div className="space-y-4">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-basalt/10 text-xs text-slate">
            <th className="py-2">Distance from partner supplier</th>
            {Object.values(LOAD_LABELS).map((label) => (
              <th key={label} className="py-2">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-basalt/5">
            <td className="py-2">{included.minKm}–{included.maxKm}km</td>
            <td colSpan={3} className="py-2">Included in list price</td>
          </tr>
          {banded.map((band) => (
            <tr key={band.label} className="border-b border-basalt/5">
              <td className="py-2">{band.minKm}–{band.maxKm}km</td>
              {(Object.keys(LOAD_LABELS) as (keyof typeof LOAD_LABELS)[]).map((size) => (
                <td key={size} className="py-2">{formatZAR(band.fees[size] ?? 0)}</td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="py-2">Over {DELIVERY_RULES.quoteOverKm}km</td>
            <td colSpan={3} className="py-2">Quoted individually</td>
          </tr>
        </tbody>
      </table>
      <p className="text-slate">
        Full tipper loads start at {DELIVERY_RULES.minBulkM3}m³ or {DELIVERY_RULES.minBulkTons} tons. Smaller bulk orders
        go as a small load for {formatZAR(DELIVERY_RULES.smallLoadFee)} within {DELIVERY_RULES.smallLoadMaxKm}km; bagged
        orders deliver free from {DELIVERY_RULES.baggedFreeFromKg / 1000} ton, otherwise {formatZAR(DELIVERY_RULES.baggedFee)},
        within {DELIVERY_RULES.baggedMaxKm}km.
      </p>
      <p className="text-slate">
        See our <Link href="/legal/shipping-delivery" className="text-seam-blue underline">Shipping & Delivery</Link> and{" "}
        <Link href="/legal/returns-refunds" className="text-seam-blue underline">Returns & Refunds</Link> policies.
      </p>
    </div>
  );
}
