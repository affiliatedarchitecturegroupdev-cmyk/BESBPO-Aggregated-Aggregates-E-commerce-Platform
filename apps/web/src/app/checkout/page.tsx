import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm, type SavedAddress } from "@/components/cart/CheckoutForm";
import { api } from "@/lib/api";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireSession("/checkout");
  const account = user.company ? await api<{ deliveryAddresses: SavedAddress[] } | null>("/trade-accounts/me", { token: sessionToken() }) : null;
  const addresses = account?.ok && account.data ? account.data.deliveryAddresses : [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/cart" className="hover:text-seam-blue">Cart</Link> / Checkout
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt">Checkout</h1>
      <div className="mt-6">
        <CheckoutForm addresses={addresses} email={user.email} />
      </div>
    </div>
  );
}
