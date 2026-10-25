import type { Metadata } from "next";
import Link from "next/link";
import { CompareActions } from "@/components/product/CompareActions";
import { ProductThumb } from "@/components/product/ProductThumb";
import { productDoc } from "@/lib/assistant/knowledge";
import { getAddedProducts, getHiddenSkus, getLivePrices } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { liveProductIndex } from "@/lib/product-index";

export const metadata: Metadata = { title: "Compare products", robots: { index: false } };


/**
 * Compare up to three products side by side (ROADMAP 4.3): price per unit, how each is sold, the standard,
 * coverage per m² where the catalogue knows it, density for bulk materials, and what each is for. The SKUs are
 * in the URL (/compare?skus=A,B,C), so a comparison can be shared.
 */
export default async function ComparePage({ searchParams }: { searchParams: { skus?: string } }) {
  const [hiddenSkus, live, added] = await Promise.all([getHiddenSkus(), getLivePrices(), getAddedProducts()]);
  const hidden = new Set(hiddenSkus);
  const bySku = new Map(liveProductIndex(live, added).map((p) => [p.sku, p]));
  const skus = [...new Set((searchParams.skus ?? "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 3);
  const products = skus.map((sku) => bySku.get(sku)).filter((p): p is NonNullable<typeof p> => !!p && !hidden.has(p.sku));
  const docs = products.map((p) => productDoc(p.sku));

  const rows: { label: string; cells: React.ReactNode[] }[] = [
    { label: "Category", cells: products.map((p) => p.categoryName) },
    { label: "Department", cells: products.map((p) => p.departmentName ?? "—") },
    { label: "Availability", cells: products.map((p) => (p.fromPrice !== null ? "Buy online" : "Price on quote")) },
    {
      label: "Price per unit",
      cells: products.map((p) => (
        <ul key={p.sku} className="space-y-0.5">
          {p.units.map((u) => (
            <li key={u.code}>
              {u.retail !== null ? <span className="font-semibold">{formatZAR(u.retail)}</span> : <span className="text-slate">On quote</span>}
              <span className="text-slate"> / {u.label}</span>
            </li>
          ))}
        </ul>
      )),
    },
    { label: "Sold by", cells: products.map((p) => p.soldBy) },
    { label: "Brand", cells: products.map((p) => p.brand ?? "Confirmed on the quote") },
    { label: "Standard", cells: products.map((p) => p.standard ?? "—") },
    { label: "Coverage", cells: docs.map((d) => (d?.unitsPerM2 ? `${d.unitsPerM2} per m²` : "—")) },
    { label: "Bulk density", cells: docs.map((d) => (d?.densityKgPerM3 ? `${d.densityKgPerM3.toLocaleString("en-ZA")} kg/m³` : "—")) },
    { label: "About", cells: docs.map((d) => d?.summary ?? "—") },
    {
      label: "Used for",
      cells: docs.map((d, i) =>
        d?.uses.length ? (
          <ul key={i} className="list-disc pl-4">
            {d.uses.slice(0, 4).map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        ) : (
          "—"
        ),
      ),
    },
  ].filter((r) => r.cells.some((c) => c !== "—"));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/products" className="hover:text-seam-blue">Products</Link> / Compare
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt">Compare products</h1>
      {products.length < 2 ? (
        <p className="mt-6 max-w-xl font-body text-sm text-slate">
          Tick <span className="font-semibold text-basalt">Compare</span> on two or three products in the{" "}
          <Link href="/products" className="text-seam-blue hover:underline">product listing</Link> to see them side by side here.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse font-body text-sm">
            <colgroup>
              <col className="w-36" />
              {products.map((p) => (
                <col key={p.sku} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="sr-only">Detail</th>
                {products.map((p) => (
                  <th key={p.sku} scope="col" className="border-b border-basalt/10 p-3 text-left align-top font-normal">
                    <ProductThumb sku={p.sku} categorySlug={p.categorySlug} name={p.name} className="h-24 w-full rounded-sm" grains={40} />
                    <Link href={`/products/${p.slug}`} className="mt-2 block font-semibold text-basalt hover:text-seam-blue">{p.name}</Link>
                    <p className="font-mono text-[10px] text-slate">{p.sku}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="align-top odd:bg-white">
                  <th scope="row" className="border-b border-basalt/5 p-3 text-left font-mono text-[10px] uppercase tracking-wide text-slate">{r.label}</th>
                  {r.cells.map((c, i) => (
                    <td key={products[i].sku} className="border-b border-basalt/5 p-3 text-basalt">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <CompareActions skus={products.map((p) => p.sku)} />
        </div>
      )}
    </div>
  );
}
