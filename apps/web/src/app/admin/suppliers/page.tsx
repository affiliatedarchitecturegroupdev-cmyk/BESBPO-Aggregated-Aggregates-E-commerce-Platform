import Link from "next/link";
import { SupplierImportForm } from "@/components/suppliers/SupplierImportForm";
import { CATEGORIES } from "@/data/categories";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";
import { PROVINCES, SUPPLIER_TIER_LABEL, type Supplier } from "@/lib/suppliers";

export const metadata = { title: "Suppliers" };

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "missing-coordinates", label: "Needs a map pin" },
  { value: "leads", label: "Researched leads" },
];

const CATEGORY_NAME = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

type SearchParams = { province?: string; filter?: string };

function query(params: SearchParams) {
  const search = new URLSearchParams();
  if (params.province) search.set("province", params.province);
  if (params.filter) search.set("filter", params.filter);
  const text = search.toString();
  return text ? `?${text}` : "";
}

export default async function AdminSuppliersPage({ searchParams }: { searchParams: SearchParams }) {
  const province = PROVINCES.includes(searchParams.province ?? "") ? searchParams.province : undefined;
  const filter = FILTERS.some((f) => f.value && f.value === searchParams.filter) ? searchParams.filter : undefined;
  const result = await api<Supplier[]>(`/suppliers${query({ province, filter })}`, { token: sessionToken() });

  return (
    <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">Import the supplier database</h2>
          <p className="mt-1 font-body text-xs text-slate">
            Rows are matched on <code>supplier_id</code>: existing suppliers are updated, new ones added, and suppliers
            missing from the file are left alone. A file with any bad row is rejected whole. Both the partner database
            and the B2B research list (with <code>source_url</code>, imported as unverified leads) are accepted.
          </p>
          <div className="mt-4">
            <SupplierImportForm />
          </div>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-xs text-slate">
          <p className="text-sm font-semibold text-basalt">Adding map pins in bulk</p>
          <p className="mt-1">
            <a href="/api/admin/suppliers/export" className="font-semibold text-seam-blue hover:underline">
              Export the CSV
            </a>
            , fill the <code>latitude</code> and <code>longitude</code> columns in a spreadsheet, and import it again.
          </p>
          <p className="mt-2">
            The export holds supplier names and contacts — keep it off shared drives and never commit it to the code
            repository.
          </p>
        </div>
        <Link
          href="/admin/suppliers/new"
          className="block rounded-sm bg-seam-blue px-5 py-2.5 text-center font-body text-sm font-semibold text-limestone hover:bg-basalt"
        >
          Add a supplier
        </Link>
      </aside>

      <section>
        <form method="get" className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <select name="province" defaultValue={province ?? ""} className="rounded-sm border border-basalt/20 bg-white px-2 py-1">
            <option value="">All provinces</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {filter && <input type="hidden" name="filter" value={filter} />}
          <button className="rounded-sm border border-basalt/20 bg-white px-2 py-1 text-basalt">Go</button>
          <span className="mx-1 text-slate">|</span>
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/suppliers${query({ province, filter: f.value || undefined })}`}
              className={`rounded-sm px-2.5 py-1 ${(filter ?? "") === f.value ? "bg-basalt text-limestone" : "bg-white text-slate"}`}
            >
              {f.label}
            </Link>
          ))}
        </form>

        {!result.ok ? (
          <p className="mt-4 font-body text-sm text-slate">{result.message}</p>
        ) : result.data.length === 0 ? (
          <p className="mt-4 font-body text-sm text-slate">
            {province || filter ? "No suppliers match." : "No suppliers yet — import the supplier database CSV."}
          </p>
        ) : (
          <>
            <p className="mt-4 font-body text-sm text-slate">
              {result.data.length} supplier{result.data.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-2 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white font-body text-sm">
              {result.data.map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/admin/suppliers/${s.id}`} className="font-semibold text-seam-blue hover:underline">
                      {s.name}
                    </Link>
                    <span className="flex flex-wrap gap-3 font-mono text-[11px] text-slate">
                      {s.externalId && <span>{s.externalId}</span>}
                      <span>{s.isVerifiedPartner ? SUPPLIER_TIER_LABEL[s.tier] : "Lead"}</span>
                      {s.latitude === null && s.isVerifiedPartner && <span className="text-ochre-gold">No map pin</span>}
                      <span className={s.isActive ? "text-seam-blue" : "text-red-700"}>{s.isActive ? "Active" : "Inactive"}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate">
                    {s.city}, {s.province} · {s.categorySlugs.map((c) => CATEGORY_NAME.get(c) ?? c).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
