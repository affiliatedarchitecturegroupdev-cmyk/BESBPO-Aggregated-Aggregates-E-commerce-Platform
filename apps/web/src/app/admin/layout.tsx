import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isStaff, requireSession } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s — Admin" }, robots: { index: false } };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/applications", label: "Trade applications" },
  { href: "/admin/quotes", label: "Quote requests" },
  { href: "/admin/documents", label: "Compliance documents" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/content", label: "Site content" },
];

/**
 * Staff admin (Phase 4 CMS). Every page below requires a STAFF or ADMIN
 * session — the API enforces the same on every call. Roles are granted with
 * `pnpm db:set-role`, never from here.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession("/admin");
  if (!isStaff(user)) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-basalt">Admin</h1>
        <p className="font-mono text-xs text-slate">
          {user.email} · {user.role}
        </p>
      </div>
      <nav className="mt-6 flex flex-wrap gap-2 font-body text-sm" aria-label="Admin">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-sm border border-basalt/20 bg-white px-3 py-1.5 text-basalt hover:border-seam-blue">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
