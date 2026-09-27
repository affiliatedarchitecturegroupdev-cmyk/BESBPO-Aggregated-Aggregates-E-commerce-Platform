import Link from "next/link";
import { SupplierForm } from "@/components/suppliers/SupplierForm";

export const metadata = { title: "Add a supplier" };

export default function NewSupplierPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/suppliers" className="font-mono text-xs text-slate hover:text-seam-blue">← Suppliers</Link>
      <h2 className="mt-2 font-display text-xl font-bold text-basalt">Add a supplier</h2>
      <div className="mt-4">
        <SupplierForm />
      </div>
    </div>
  );
}
