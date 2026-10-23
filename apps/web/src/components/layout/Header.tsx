import Link from "next/link";
import { MapPin } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { CartLink } from "@/components/cart/CartLink";
import { SearchBar } from "@/components/layout/SearchBar";
import { CORPORATE_SITE_URL } from "@/data/social";
import { DEPARTMENTS, SERVICE_LINKS } from "@/data/departments";
import { NAV_LINKS } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-basalt/10 bg-limestone/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:gap-6">
        <Link href="/" aria-label="Aggregated Aggregates — home" className="shrink-0">
          <Logo />
        </Link>
        {/* Desktop: the search bar fills the space between the logo and the account links. */}
        <SearchBar id="site-search" className="hidden flex-1 md:block" />
        <div className="ml-auto hidden shrink-0 items-center gap-3 whitespace-nowrap md:ml-0 md:flex">
          <CartLink className="px-2 py-2 text-basalt hover:text-seam-blue" />
          <Link
            href="/quote"
            className="hidden rounded-sm border border-basalt px-4 py-2 font-body text-sm hover:bg-basalt hover:text-limestone lg:inline-block"
          >
            Get a Quote
          </Link>
          <Link
            href="/account/dashboard"
            className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm text-limestone hover:bg-basalt"
          >
            Account
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-2 md:hidden">
          {/* On phones the cart sits next to the menu, always in view. */}
          <CartLink className="rounded-sm border border-basalt/20 px-3 py-2 text-basalt hover:text-seam-blue" />
          {/* Mobile menu: a native disclosure, so it works without client JS. */}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Menu</span>
              <span className="hidden group-open:inline">Close</span>
            </summary>
            <nav
              className="absolute right-0 mt-2 max-h-[75vh] w-64 overflow-y-auto rounded-sm border border-basalt/10 bg-white p-2 font-body text-sm shadow-lg"
              aria-label="Mobile"
            >
              <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-slate">Shop by department</p>
              {DEPARTMENTS.map((d) => (
                <Link key={d.slug} href={d.href} className="block rounded-sm px-3 py-2 text-basalt hover:bg-limestone">
                  {d.name}
                </Link>
              ))}
              <Link href="/departments" className="block rounded-sm px-3 py-2 font-semibold text-seam-blue hover:bg-limestone">
                All departments →
              </Link>
              <p className="mt-2 border-t border-basalt/10 px-3 pb-1 pt-3 font-mono text-[10px] uppercase tracking-widest text-slate">More</p>
              {[
                { href: "/aa-60-120", label: "AA 60/120 — delivered within 2 hours" },
                { href: "/buy-online", label: "Buy online — priced products" },
                { href: "/coverage", label: "Check delivery to your area" },
                { href: "/quote/boq", label: "Upload a bill of quantities" },
                ...NAV_LINKS.filter((l) => !["/products", "/reinforcing-steel"].includes(l.href)),
                { href: "/cart", label: "Cart" },
                { href: "/quote", label: "Get a Quote" },
                { href: "/account/dashboard", label: "Account" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-sm px-3 py-2 text-basalt hover:bg-limestone">
                  {link.label}
                </Link>
              ))}
              <a href={CORPORATE_SITE_URL} target="_blank" rel="noopener" className="mt-1 block rounded-sm border-t border-basalt/10 px-3 py-2 text-seam-blue hover:bg-limestone">
                Corporate website ↗
              </a>
            </nav>
          </details>
        </div>
      </div>
      {/* Phones: the search bar gets its own full-width row, always in view. */}
      <div className="px-4 pb-3 md:hidden">
        <SearchBar id="site-search-mobile" />
      </div>
      {/*
        Desktop navigation in two tiers, so nothing is cut off at any width:
        a slim top line with "All departments", the services and "Check
        delivery"; below it, the departments, centred and wrapping onto a second
        line rather than scrolling on a narrower window.
      */}
      <nav aria-label="Departments" className="hidden border-t border-basalt/10 bg-white/70 md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-basalt/5 px-4 py-1.5 font-body text-xs">
          <Link href="/departments" className="font-semibold uppercase tracking-wide text-seam-blue hover:text-basalt">
            All departments →
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {SERVICE_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-slate hover:text-seam-blue">
                {l.label}
              </Link>
            ))}
            <Link href="/aa-60-120" className="rounded-sm bg-ochre-gold px-2 py-0.5 font-semibold text-basalt hover:bg-basalt hover:text-limestone">
              AA 60/120 Express
            </Link>
            <Link href="/coverage" className="flex items-center gap-1 font-semibold text-seam-blue hover:text-basalt">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Check delivery
            </Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-2 font-body text-[13px] text-basalt lg:text-sm">
          {DEPARTMENTS.filter((d) => d.inBar).map((d) => (
            <Link key={d.slug} href={d.href} className="whitespace-nowrap hover:text-seam-blue">
              {d.shortName}
            </Link>
          ))}
          <Link href="/departments" className="whitespace-nowrap font-semibold text-seam-blue hover:text-basalt">
            All {DEPARTMENTS.length} departments →
          </Link>
        </div>
      </nav>
    </header>
  );
}
