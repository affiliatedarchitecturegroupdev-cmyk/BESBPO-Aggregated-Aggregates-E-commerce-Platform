"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/admin/insights", label: "Overview" },
  { href: "/admin/insights/sales", label: "Sales" },
  { href: "/admin/insights/products", label: "Products & categories" },
  { href: "/admin/insights/customers", label: "Customers" },
  { href: "/admin/insights/hire", label: "Hire & services" },
  { href: "/admin/insights/pipeline", label: "Pipeline" },
  { href: "/admin/insights/geography", label: "Geography & delivery" },
  { href: "/admin/insights/marketing", label: "Marketing" },
  { href: "/admin/insights/finance", label: "Profit & loss", adminOnly: true },
  { href: "/admin/insights/email", label: "Weekly email", adminOnly: true },
];

/** Insights tabs; each link keeps the current filters. */
export function InsightsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  return (
    <nav aria-label="Insights" className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b border-basalt/10 px-1">
        {TABS.filter((t) => isAdmin || !t.adminOnly).map((t) => {
          const current = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={query ? `${t.href}?${query}` : t.href}
                aria-current={current ? "page" : undefined}
                className={`block whitespace-nowrap border-b-2 px-3 py-2 font-body text-sm ${current ? "border-seam-blue font-semibold text-basalt" : "border-transparent text-slate hover:text-basalt"}`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
