import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { getNetwork, type NetworkSupplier } from "@/lib/network";
import { PROVINCES } from "@/lib/suppliers";

export const metadata: Metadata = {
  title: "Partner Supplier Network",
  description: "The approved quarries and plants Aggregated Aggregates sources from, by province — plus the B2B cement and admixture suppliers we're qualifying.",
  alternates: { canonical: "/suppliers" },
};

const CATEGORY_NAME = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

/**
 * Module 6, public side: the partner network behind every delivery. A
 * broker model — no owned yards. Verified partners and researched leads are
 * listed apart and labelled honestly; contact details are staff-only.
 */
export default async function SuppliersPage() {
  const network = await getNetwork();
  if (!network) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-basalt">Partner Supplier Network</h1>
        <p className="mt-3 font-body text-sm text-slate">The network can&apos;t be loaded right now — please try again shortly.</p>
      </div>
    );
  }
  const provinces = PROVINCES.filter((p) =>
    network.partners.some((s) => s.province === p),
  );
  const active = network.partners.filter((s) => s.isActive).length;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/delivery-areas" className="hover:text-seam-blue">Delivery Areas</Link> / Partner Network
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Partner Supplier Network</h1>
      <p className="mt-3 max-w-3xl font-body text-sm text-slate">
        Aggregated Aggregates holds no stock of its own: every order is supplied by an approved partner quarry or plant —
        {` ${network.partners.length}`} across {provinces.length} provinces — and delivered from the one nearest your site.
        {` ${active}`} are live now; any others are being onboarded.{" "}
        <Link href="/delivery-areas" className="text-seam-blue hover:underline">Delivery areas & charges →</Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-widest">
        <span className="rounded-sm bg-seam-blue/10 px-2 py-1 text-seam-blue">● Delivering now</span>
        <span className="rounded-sm bg-basalt/5 px-2 py-1 text-slate">○ Approved partner, being onboarded</span>
      </div>

      {provinces.map((province) => (
        <ProvinceSection key={province} province={province} suppliers={network.partners.filter((s) => s.province === province)} />
      ))}

      {network.leads.length > 0 && (
        <section className="mt-14 rounded-sm border border-ochre-gold/40 bg-ochre-gold/5 p-6">
          <h2 className="font-display text-lg font-bold text-basalt">Bulk &amp; Infrastructure sourcing — being qualified</h2>
          <p className="mt-1 max-w-3xl font-body text-sm text-slate">
            Cement, binder, admixture and specialty-sand producers we&apos;ve identified for the Bulk &amp; Infrastructure range.
            They are researched leads, not yet approved partners, and we don&apos;t deliver from them yet.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {network.leads.map((s) => (
              <li key={s.externalId ?? s.name} className="font-body text-sm text-basalt">
                {s.name}
                <span className="block text-xs text-slate">
                  {s.province} · {s.categorySlugs.map((c) => CATEGORY_NAME.get(c) ?? c).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProvinceSection({ province, suppliers }: { province: string; suppliers: NetworkSupplier[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-bold text-basalt">
        {province}
        <span className="ml-2 font-mono text-xs font-normal text-slate">({suppliers.length})</span>
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {suppliers.map((s) => (
          <div key={s.externalId ?? s.name} className="rounded-sm border border-basalt/10 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-body text-sm font-semibold text-basalt">{s.name}</p>
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.isActive ? "bg-seam-blue" : "border border-slate"}`}
                title={s.isActive ? "Delivering now" : "Province opening soon"}
              />
            </div>
            <p className="mt-1 font-body text-xs text-slate">{s.address ?? s.city}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-slate">
              {s.categorySlugs.map((c) => CATEGORY_NAME.get(c) ?? c).join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
