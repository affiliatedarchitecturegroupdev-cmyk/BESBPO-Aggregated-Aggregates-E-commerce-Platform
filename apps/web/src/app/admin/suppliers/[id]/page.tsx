import Link from "next/link";
import { notFound } from "next/navigation";
import { SupplierForm } from "@/components/suppliers/SupplierForm";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { sessionToken } from "@/lib/session";
import type { Supplier } from "@/lib/suppliers";
import { deleteSupplier } from "@/app/account/actions";
import { linkSupplierLogin, unlinkSupplierLogin } from "@/app/admin/deliveries/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";

export const metadata = { title: "Supplier" };

export default async function SupplierPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  const result = await api<Supplier>(`/suppliers/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="font-body text-sm text-slate">{result.message}</p>;
  }
  const supplier = result.data;
  const logins = await api<{ id: string; email: string; name: string | null }[]>(`/supplier-portal/suppliers/${encodeURIComponent(params.id)}/logins`, { token: sessionToken() });
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
      <section className="mt-6 rounded-sm border border-basalt/10 bg-white p-4">
        <h3 className="font-body text-sm font-semibold text-basalt">Supplier portal logins</h3>
        <p className="mt-1 font-body text-xs text-slate">
          People at this supplier who see the orders assigned to it (no prices or customer contact details) and answer whether they can load them. They
          create an account on the site first; link it here by email.
        </p>
        {logins.ok && logins.data.length > 0 && (
          <ul className="mt-2 space-y-1 font-body text-xs">
            {logins.data.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <span>{u.name ? `${u.name} · ` : ""}{u.email}</span>
                <ActionForm action={unlinkSupplierLogin} className="inline">
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="text-red-700 hover:underline">Unlink</button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={linkSupplierLogin} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="supplierId" value={supplier.id} />
          <label className="block min-w-[16rem] flex-1"><span className="font-mono text-[10px] uppercase text-slate">Account email</span><input name="email" type="email" required className={inputClass} /></label>
          <SubmitButton variant="subtle">Link login</SubmitButton>
        </ActionForm>
      </section>
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
