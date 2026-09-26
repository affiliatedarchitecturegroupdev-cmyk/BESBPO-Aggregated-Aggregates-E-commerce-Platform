import Link from "next/link";

const NAV_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/account/dashboard", label: "Trade Accounts" },
  { href: "/suppliers", label: "Delivery Areas" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="border-b border-basalt/10 bg-limestone">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-basalt">
          AGGREGATED AGGREGATES
        </Link>
        <nav className="hidden gap-6 font-body text-sm text-basalt md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-seam-blue">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/quote"
            className="rounded-sm border border-basalt px-4 py-2 font-body text-sm hover:bg-basalt hover:text-limestone"
          >
            Request a Quote
          </Link>
          <Link
            href="/account/dashboard"
            className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm text-limestone hover:bg-basalt"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
