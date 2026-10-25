import Link from "next/link";
import { CatalogueImportUpload } from "@/components/admin/CatalogueImportUpload";
import { CATEGORIES } from "@/data/categories";
import { departmentOf } from "@/data/departments";
import { api } from "@/lib/api";
import { IMPORT_STATUS_LABEL, type CatalogueImport } from "@/lib/catalogue-import";
import { saDate } from "@/lib/supplier-prices";
import { sessionToken } from "@/lib/session";
import type { Supplier } from "@/lib/suppliers";

export const metadata = { title: "Catalogue import" };

// Aggregates and ready-mix are priced from their own bands; their categories can't take imported products.
const BAND_CATEGORIES = new Set(["ready-mix-concrete", "agricultural-industrial", "ballast-rail", "crushed-stone", "crusher-run-road-building", "decorative-landscaping", "drainage-filter", "recycled-sustainable", "sand-fine-aggregates", "sub-base-base-course"]);

/**
 * Admin → Catalogue import (ROADMAP 2.6, docs/catalogue-import.md): add a supplier's whole range from one file.
 * Rows are checked and previewed first; added products are quote-only until a supplier price is approved.
 */
export default async function CatalogueImportPage() {
  const token = sessionToken();
  const [imports, suppliers] = await Promise.all([api<CatalogueImport[]>("/catalogue-import/staff", { token }), api<Supplier[]>("/suppliers", { token })]);
  const categories = CATEGORIES.filter((c) => !BAND_CATEGORIES.has(c.slug))
    .map((c) => ({ ...c, department: departmentOf(c.slug)?.name ?? "" }))
    .sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">Catalogue import</h2>
        <p className="mt-1 max-w-3xl font-body text-sm text-slate">
          Add new products from a CSV or Excel file — one product per row, with its name, category and how it&apos;s sold. Every row is checked and shown to you first;
          nothing goes on the store until you add it. New products are <strong>quote-only</strong> until a supplier price is approved. Choose the supplier to learn its
          product codes (so its next price list matches) and to send any costs to <Link href="/admin/supplier-prices" className="text-seam-blue hover:underline">Supplier prices</Link> for approval.
        </p>
      </div>
      <CatalogueImportUpload suppliers={suppliers.ok ? suppliers.data.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name, province: s.province })) : []} />

      <section>
        <h3 className="font-display text-lg font-bold text-basalt">Imports</h3>
        {!imports.ok ? (
          <p className="mt-2 font-body text-sm text-red-800">{imports.message}</p>
        ) : imports.data.length === 0 ? (
          <p className="mt-2 font-body text-sm text-slate">No imports yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
            {imports.data.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3 font-body text-sm">
                <Link href={`/admin/catalogue-import/${i.id}`} className="font-semibold text-seam-blue hover:underline">
                  {i.fileName}
                </Link>
                <span className="text-xs text-slate">
                  {i.supplierName ? `${i.supplierName} · ` : ""}
                  {saDate(i.createdAt)} · {i.counts.NEW} new · {i.counts.EXISTS} already listed · {i.counts.PROBLEM} can&apos;t add · <strong className="text-basalt">{IMPORT_STATUS_LABEL[i.status]}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="rounded-sm border border-basalt/10 bg-white p-4">
        <summary className="cursor-pointer font-body text-sm font-semibold text-basalt">Categories you can import into ({categories.length})</summary>
        <p className="mt-2 font-body text-xs text-slate">Use the category&apos;s name or its slug. Aggregates and ready-mix are priced from their own bands, so they aren&apos;t listed.</p>
        <table className="mt-2 w-full font-body text-xs">
          <thead>
            <tr className="text-left text-slate">
              <th className="py-1 pr-3">Department</th>
              <th className="py-1 pr-3">Category</th>
              <th className="py-1">Slug</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.slug} className="border-t border-basalt/5">
                <td className="py-1 pr-3 text-slate">{c.department}</td>
                <td className="py-1 pr-3 text-basalt">{c.name}</td>
                <td className="py-1 font-mono text-[11px] text-slate">{c.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
