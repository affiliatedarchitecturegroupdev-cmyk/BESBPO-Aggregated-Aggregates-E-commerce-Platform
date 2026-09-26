import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-basalt/10 bg-limestone/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="Aggregated Aggregates — home">
          <Logo />
        </Link>
        <nav className="hidden gap-6 font-body text-sm text-basalt lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-seam-blue">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/quote"
            className="rounded-sm border border-basalt px-4 py-2 font-body text-sm hover:bg-basalt hover:text-limestone"
          >
            Get a Quote
          </Link>
          <Link
            href="/account/dashboard"
            className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm text-limestone hover:bg-basalt"
          >
            Sign In
          </Link>
        </div>
        {/* Mobile menu: a native disclosure, so it works without client JS. */}
        <details className="group relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
          </summary>
          <nav
            className="absolute right-0 mt-2 w-56 rounded-sm border border-basalt/10 bg-white p-2 font-body text-sm shadow-lg"
            aria-label="Mobile"
          >
            {[...NAV_LINKS, { href: "/quote", label: "Get a Quote" }, { href: "/account/dashboard", label: "Sign In" }].map(
              (link) => (
                <Link key={link.href} href={link.href} className="block rounded-sm px-3 py-2 text-basalt hover:bg-limestone">
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </details>
      </div>
    </header>
  );
}
