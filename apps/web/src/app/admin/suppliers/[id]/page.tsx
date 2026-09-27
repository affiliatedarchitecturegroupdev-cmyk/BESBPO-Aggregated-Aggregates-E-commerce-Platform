import Link from "next/link";
import { notFound } from "next/navigation";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { sessionToken } from "@/lib/session";
import type { Supplier } from "@/lib/suppliers";
import { deleteSupplier } from "@/app/account/actions";

export const metadata = { title: "Supplier" };

export default async function SupplierPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  const result = await api<Supplier>(`/suppliers/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="font-body text-sm text-slate">{result.message}</p>;
  }
  const supplier = result.data;
  const mapLink =
    supplier.latitude !== null && supplier.longitude !== null
      ? `https://www.openstreetmap.org/?mlat=${supplier.latitude}&mlon=${supplier.longitude}#map=15/${supplier.latitude}/${supplier.longitude}`
      : null;
  return (
    <div className="max-w-3xl">
      <Link href="/admin/suppliers" className="font-mono text-xs text-slate hover:text-seam-blue">← Suppliers</Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-basalt">{supplier.name}</h2>
        <p className="font-mono text-[11px] text-slate">
          Updated {formatDate(supplier.updatedAt)}
          {mapLink && (
            <>
              {" · "}
              <a href={mapLink} target="_blank" rel="noopener noreferrer" className="text-seam-blue hover:underline">
                Check the pin on a map
              </a>
            </>
          )}
        </p>
      </div>
      {searchParams.created && (
        <p className="mt-3 rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-3 font-body text-sm text-seam-blue">Supplier added.</p>
      )}
      <div className="mt-4">
        <SupplierForm supplier={supplier} />
      </div>
      <form action={deleteSupplier} className="mt-6 rounded-sm border border-red-700/20 bg-white p-4 font-body text-xs text-slate">
        <input type="hidden" name="id" value={supplier.id} />
        <p>
          Deleting removes the supplier completely. To pause a supplier, untick <strong>Active</strong> instead. If the
          supplier is still in the database CSV, the next import adds it back.
        </p>
        <button className="mt-3 rounded-sm border border-red-700/40 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50">Delete supplier</button>
      </form>
    </div>
  );
}
