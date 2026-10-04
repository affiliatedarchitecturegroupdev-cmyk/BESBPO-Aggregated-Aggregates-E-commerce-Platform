import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isStaff, requireSession } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s — Admin" }, robots: { index: false } };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/applications", label: "Trade applications" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/quotes", label: "Quote requests" },
  { href: "/admin/documents", label: "Compliance documents" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/image-permissions", label: "Image permissions" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/content", label: "Site content" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/whatsapp", label: "WhatsApp orders" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/careers", label: "Careers" },
  { href: "/admin/newsletter", label: "Newsletter" },
  { href: "/admin/team", label: "Team", adminOnly: true },
];

/**
 * Staff admin (Phase 4 CMS). Every page below requires a STAFF or ADMIN
 * session — the API enforces the same on every call. Admins grant and remove
 * access on Team (/admin/team); `pnpm db:set-role` remains for the first admin.
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
        {NAV.filter((item) => !("adminOnly" in item) || user.role === "ADMIN").map((item) => (
          <Link key={item.href} href={item.href} className="rounded-sm border border-basalt/20 bg-white px-3 py-1.5 text-basalt hover:border-seam-blue">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
