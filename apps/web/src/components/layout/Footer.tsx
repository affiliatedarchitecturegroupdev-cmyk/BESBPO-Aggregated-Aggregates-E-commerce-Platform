import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { CATEGORIES } from "@/data/categories";
import { SALES_EMAIL } from "@/lib/site";

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
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Logo inverted />
          <p className="mt-4 font-body text-sm text-limestone/70">Every Layer Starts Here.</p>
          <p className="mt-4 font-mono text-xs text-limestone/50">A Besbpo Group division</p>
          <a href={`mailto:${SALES_EMAIL}`} className="mt-2 block font-mono text-xs text-limestone/70 hover:text-ochre-gold">
            {SALES_EMAIL}
          </a>
        </div>
        <FooterColumn title="Shop">
          {CATEGORIES.slice(0, 5).map((c) => (
            <li key={c.slug}>
              <Link href={`/products?category=${c.slug}`}>{c.name}</Link>
            </li>
          ))}
          <li>
            <Link href="/products">All products</Link>
          </li>
        </FooterColumn>
        <FooterColumn title="Buy">
          <li><Link href="/quote">Request a Quote</Link></li>
          <li><Link href="/delivery-areas">Delivery Areas & Charges</Link></li>
          <li><Link href="/trade-accounts">Trade Accounts</Link></li>
          <li><Link href="/account/dashboard">Trade Account Dashboard</Link></li>
        </FooterColumn>
        <FooterColumn title="Company">
          <li><Link href="/about">About</Link></li>
          <li><Link href="/contact">Contact & Sales</Link></li>
        </FooterColumn>
        <FooterColumn title="Legal & Compliance">
          {LEGAL_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </FooterColumn>
      </div>
      <div className="border-t border-limestone/10 px-4 py-4 text-center font-mono text-xs text-limestone/50">
        © {new Date().getFullYear()} Aggregated Aggregates, a division of Besbpo Group (Pty) Ltd. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-body text-sm font-semibold text-ochre-gold">{title}</p>
      <ul className="mt-3 space-y-2 font-body text-sm text-limestone/80 [&_a:hover]:text-limestone">{children}</ul>
    </div>
  );
}
