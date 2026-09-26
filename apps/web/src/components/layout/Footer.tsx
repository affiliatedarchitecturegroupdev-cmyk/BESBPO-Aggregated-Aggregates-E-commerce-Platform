import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/legal/privacy-policy", label: "Privacy Policy" },
  { href: "/legal/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/legal/popia-notice", label: "POPIA Notice" },
  { href: "/legal/cookie-policy", label: "Cookie Policy" },
  { href: "/legal/returns-refunds", label: "Returns & Refunds" },
  { href: "/legal/shipping-delivery", label: "Shipping & Delivery" },
  { href: "/legal/paia-manual", label: "PAIA Manual" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-basalt/10 bg-basalt text-limestone">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold">AGGREGATED AGGREGATES</p>
          <p className="mt-2 font-body text-sm text-limestone/70">Every Layer Starts Here.</p>
          <p className="mt-4 font-mono text-xs text-limestone/50">A Besbpo Group division</p>
        </div>
        <div>
          <p className="font-body text-sm font-semibold text-ochre-gold">Shop</p>
          <ul className="mt-3 space-y-2 font-body text-sm text-limestone/80">
            <li><Link href="/products">All Products</Link></li>
            <li><Link href="/quote">Request a Quote</Link></li>
            <li><Link href="/suppliers">Delivery Areas</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-body text-sm font-semibold text-ochre-gold">Trade</p>
          <ul className="mt-3 space-y-2 font-body text-sm text-limestone/80">
            <li><Link href="/account/dashboard">Trade Account Dashboard</Link></li>
            <li><Link href="/contact">Talk to Sales</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-body text-sm font-semibold text-ochre-gold">Legal & Compliance</p>
          <ul className="mt-3 space-y-2 font-body text-sm text-limestone/80">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-limestone/10 px-4 py-4 text-center font-mono text-xs text-limestone/50">
        © {new Date().getFullYear()} Aggregated Aggregates, a division of Besbpo Group (Pty) Ltd. All rights reserved.
      </div>
    </footer>
  );
}
