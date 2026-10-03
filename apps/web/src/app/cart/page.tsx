import type { Metadata } from "next";
import Link from "next/link";
import { CartView } from "@/components/cart/CartView";
import { GroupServiceBanner } from "@/components/merchandising/GroupServiceBanner";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default async function CartPage() {
  const user = await getSession();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Cart
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt">Your Cart</h1>
      <div className="mt-6">
        <CartView signedIn={Boolean(user)} />
      </div>
      <div className="mt-10">
        <GroupServiceBanner categorySlug="sub-base-base-course" placement="cart" />
      </div>
    </div>
  );
}
