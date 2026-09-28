"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

/** Header cart link with the number of lines in the cart. */
export function CartLink({ className = "" }: { className?: string }) {
  const { lines } = useCart();
  return (
    <Link href="/cart" className={`relative inline-flex items-center gap-1.5 ${className}`} aria-label={`Cart, ${lines.length} item${lines.length === 1 ? "" : "s"}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      <span className="font-body text-sm">Cart</span>
      {lines.length > 0 && (
        <span className="rounded-full bg-ochre-gold px-1.5 font-mono text-[10px] font-semibold text-basalt">{lines.length}</span>
      )}
    </Link>
  );
}
