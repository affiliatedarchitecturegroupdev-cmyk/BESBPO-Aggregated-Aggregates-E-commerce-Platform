import Link from "next/link";
import { DeliveryRatesForm } from "@/components/admin/DeliveryRatesForm";
import { api } from "@/lib/api";
import type { StaffDeliveryRates } from "@/lib/delivery-rates";
import { getSession } from "@/lib/session";

export const metadata = { title: "Delivery rates" };

/**
 * Admin → Delivery rates (ROADMAP 9.1 and 9.2, docs/delivery-rates.md): the standard tipper rates and the flatbed
 * fees, used by the cart, checkout, quote requests and sales quotations as soon as they're saved.
 */
export default async function AdminDeliveryRatesPage() {
  const [user, rates] = await Promise.all([getSession(), api<StaffDeliveryRates>("/pricing/delivery-rates")]);
  if (!rates.ok) return <p className="font-body text-sm text-slate">{rates.message}</p>;
  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h2 className="font-display text-xl font-bold text-basalt">Delivery rates</h2>
        <p className="mt-1 font-body text-sm text-slate">
          What customers pay for delivery, by distance from the supplier and load. New carts, checkouts, quote requests and sales quotations use the rates
          as soon as you save; orders already placed keep theirs. Product pages and the delivery calculators show them within a minute. Check them against
          the delivery costs recorded at dispatch (Insights → Finance). Extra supply points are priced in{" "}
          <Link href="/admin/delivery-premium" className="text-seam-blue hover:underline">
            Delivery premium
          </Link>
          .
        </p>
      </div>
      <DeliveryRatesForm rates={rates.data} canEdit={user?.role === "ADMIN"} />
    </div>
  );
}
