"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DOCUMENT_TYPE_LABEL, formatBytes, type DocumentSummary } from "@/lib/account-types";
import { CUSTOMER_TIERS, DELIVERY_RULES, pricePoints, type Product } from "@/data/catalogue";
import { formatZAR } from "@/lib/pricing";
import { technicalSpec } from "@/data/technical-specs";

const CAVEAT = "Typical values for this material class — confirm against the batch Certificate of Analysis before specifying structural or engineered work.";

const TABS = ["Specification", "Typical Uses", "Handling & Storage", "Grading Curve", "Compliance Docs (SANS/COA)", "Delivery & Returns"] as const;
type Tab = (typeof TABS)[number];

const LOAD_LABELS = { M3_6: "6m³ load", M3_10: "10m³ load", M3_14_PLUS: "14m³+ / Interlink" } as const;

export function ProductTabs({ product, categoryName }: { product: Product; categoryName: string }) {
  const [tab, setTab] = useState<Tab>("Specification");
  const spec = technicalSpec(product.sku, product.categorySlug);

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
        {tab === "Specification" && <Specification product={product} categoryName={categoryName} particleSize={spec?.particleSize} />}
        {tab === "Typical Uses" && spec && (
          <ul className="list-disc space-y-1 pl-5">
            {spec.typicalUses.map((use) => (
              <li key={use}>{use}</li>
            ))}
          </ul>
        )}
        {tab === "Handling & Storage" && spec && (
          <div className="space-y-3">
            <p>{spec.handling}</p>
            <p className="font-mono text-[11px] text-slate">{CAVEAT}</p>
          </div>
        )}
        {tab === "Grading Curve" && (
          <p className="text-slate">
            {product.gradingStandard
              ? `Supplied to ${product.gradingStandard} grading limits. `
              : ""}
            Grading curves vary by source quarry and are published per supplier batch — request the curve for your
            delivery with your quote, and it is attached to the order record.
          </p>
        )}
        {tab === "Compliance Docs (SANS/COA)" && <ComplianceDocuments product={product} />}
        {tab === "Delivery & Returns" && <DeliveryTable />}
      </div>
    </div>
  );
}

function Specification({ product, categoryName, particleSize }: { product: Product; categoryName: string; particleSize?: string }) {
  const rows: [string, string][] = [
    ["SKU", product.sku],
    ["Category", categoryName],
    ["Reference standard", product.gradingStandard ?? "—"],
    ...(particleSize ? [["Particle size (typical)", particleSize] as [string, string]] : []),
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
    <>
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
      {particleSize && <p className="mt-3 font-mono text-[11px] text-slate">{CAVEAT}</p>}
    </>
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

/** Module 5: the product's public SANS references and COAs, loaded when the tab opens. */
function ComplianceDocuments({ product }: { product: Product }) {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${encodeURIComponent(product.sku)}/documents`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: DocumentSummary[]) => !cancelled && setDocuments(data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [product.sku]);

  return (
    <div className="space-y-4">
      <p className="text-slate">
        {product.gradingStandard ? `Reference standard: ${product.gradingStandard}. ` : "This material has no single reference standard. "}
        Batch-specific Certificates of Analysis for your delivery are attached to your order record.
      </p>
      {failed ? (
        <p className="text-slate">Documents couldn&apos;t be loaded right now — please try again shortly.</p>
      ) : documents === null ? (
        <p className="text-slate">Loading documents…</p>
      ) : documents.length === 0 ? (
        <p className="text-slate">No documents published for this product yet — ask for them with your quote.</p>
      ) : (
        <ul className="divide-y divide-basalt/5 rounded-sm border border-basalt/10">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span>
                <span className="font-semibold text-basalt">{doc.title}</span>
                <span className="block text-xs text-slate">
                  {DOCUMENT_TYPE_LABEL[doc.documentType]} · {doc.standard}
                  {doc.batchReference && ` · batch ${doc.batchReference}`}
                  {doc.issuedAt && ` · issued ${doc.issuedAt.slice(0, 10)}`}
                  {doc.expiresAt && ` · valid to ${doc.expiresAt.slice(0, 10)}`}
                </span>
              </span>
              <a
                href={`/api/documents/${doc.id}`}
                target="_blank"
                rel="noopener"
                className="rounded-sm border border-seam-blue/40 px-3 py-1.5 text-xs font-semibold text-seam-blue hover:bg-seam-blue/5"
              >
                {doc.contentType === "application/pdf" ? "PDF" : "Image"} · {formatBytes(doc.sizeBytes)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
