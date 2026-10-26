import type { Metadata } from "next";
import Link from "next/link";
import { CartLeadTimes } from "@/components/delivery/CartLeadTimes";
import { getLeadTimes } from "@/lib/cms";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import type { SavedAddress } from "@/lib/account-types";
import { api } from "@/lib/api";
import type { Team } from "@/lib/company-accounts";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireSession("/checkout");
  const [saved, team] = await Promise.all([
    api<SavedAddress[]>("/account/addresses", { token: sessionToken() }),
    user.company ? api<Team>("/company/team", { token: sessionToken() }) : null,
  ]);
  const addresses = saved.ok ? saved.data : [];
  // Company accounts (docs/company-accounts.md): the PO number, and when an order waits for approval.
  const company = team?.ok
    ? { name: team.data.company.name, requirePurchaseOrder: team.data.company.requirePurchaseOrder, role: team.data.me.companyRole, spendLimit: team.data.me.spendLimit, approvalThreshold: team.data.company.approvalThreshold }
    : null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/cart" className="hover:text-seam-blue">Cart</Link> / Checkout
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt">Checkout</h1>
      <div className="mt-6">
        <CheckoutForm addresses={addresses} email={user.email} company={company} />
        <CartLeadTimes leadTimes={[...(await getLeadTimes()).values()]} />
      </div>
    </div>
  );
}
