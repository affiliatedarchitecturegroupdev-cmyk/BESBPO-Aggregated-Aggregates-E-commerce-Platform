import Link from "next/link";
import { QuotationEditor } from "@/components/admin/QuotationEditor";

export const metadata = { title: "New quotation" };

export default function NewQuotationPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/quotations" className="font-body text-sm text-seam-blue hover:underline">
        ← Quotations
      </Link>
      <h2 className="font-display text-xl font-bold text-basalt">New quotation</h2>
      <QuotationEditor />
    </div>
  );
}
