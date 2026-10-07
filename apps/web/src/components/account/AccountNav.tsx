import Link from "next/link";

const TABS = [
  { href: "/account/dashboard", label: "Dashboard" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/bookings", label: "Hire bookings" },
  { href: "/account/settings", label: "Settings" },
] as const;

export function AccountNav({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav className="mt-6 flex flex-wrap gap-2 font-body text-sm" aria-label="Account">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? "page" : undefined}
          className={`rounded-sm px-3 py-1.5 ${tab.href === current ? "bg-basalt text-limestone" : "border border-basalt/20 bg-white text-basalt hover:border-seam-blue"}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
