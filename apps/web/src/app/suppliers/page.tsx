import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { DEPARTMENTS, departmentOf } from "@/data/departments";
import { getNetwork, type NetworkSupplier } from "@/lib/network";
import { PROVINCES } from "@/lib/suppliers";

export const metadata: Metadata = {
  title: "Partner Supplier Network",
  description:
    "The approved quarries, plants, mills and merchants Aggregated Aggregates sources from — by province and department — for aggregates, cement, ready-mix, steel, bricks, paving, drainage, roofing and timber.",
  alternates: { canonical: "/suppliers" },
};

const CATEGORY_NAME = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

const departmentsOf = (s: NetworkSupplier) => new Set(s.categorySlugs.flatMap((c) => departmentOf(c)?.slug ?? []));

/**
 * Module 6, public side: the partner network behind every delivery. A
 * broker model — no owned yards. Approved partners are listed by province
 * and can be filtered by department; contact details and map pins are
 * staff-only. Researched leads still being qualified are listed apart.
 */
export default async function SuppliersPage({ searchParams }: { searchParams: { department?: string; province?: string } }) {
  const network = await getNetwork();
  if (!network) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-basalt">Partner Supplier Network</h1>
        <p className="mt-3 font-body text-sm text-slate">The network can&apos;t be loaded right now — please try again shortly.</p>
      </div>
    );
  }
  const department = DEPARTMENTS.find((d) => d.slug === searchParams.department);
  const provinceFilter = PROVINCES.find((p) => p === searchParams.province);
  const partners = network.partners.filter(
    (s) => (!department || departmentsOf(s).has(department.slug)) && (!provinceFilter || s.province === provinceFilter),
  );
  const provinces = PROVINCES.filter((p) => partners.some((s) => s.province === p));
  const live = network.partners.filter((s) => s.isActive).length;
  const allProvinces = PROVINCES.filter((p) => network.partners.some((s) => s.province === p)).length;
  const href = (next: { department?: string; province?: string }) => {
    const params = new URLSearchParams();
    if (next.department) params.set("department", next.department);
    if (next.province) params.set("province", next.province);
    const query = params.toString();
    return query ? `/suppliers?${query}` : "/suppliers";
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 font-mono text-xs ${active ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/15 bg-white text-basalt hover:border-seam-blue"}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/delivery-areas" className="hover:text-seam-blue">Delivery Areas</Link> / Partner Network
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Partner Supplier Network</h1>
      <p className="mt-3 max-w-3xl font-body text-sm text-slate">
        Aggregated Aggregates holds no stock of its own. Every order is supplied by an approved partner — quarries and sand mines, cement and
        ready-mix plants, steel mills and merchants, brickworks and precast yards, roofing and timber suppliers — and delivered from the one nearest
        your site. <Link href="/coverage" className="text-seam-blue hover:underline">Check delivery to your town →</Link>
      </p>
      <dl className="mt-6 grid grid-cols-3 gap-3 sm:max-w-xl">
        {[
          { label: "Approved partners", value: network.partners.length },
          { label: "Delivering now", value: live },
          { label: "Provinces", value: allProvinces },
        ].map((stat) => (
          <div key={stat.label} className="rounded-sm border border-basalt/10 bg-white p-3">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-slate">{stat.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-basalt">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2" aria-label="Filter by department">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate">Department</span>
          <Link href={href({ province: provinceFilter })} className={chip(!department)}>All</Link>
          {DEPARTMENTS.map((d) => (
            <Link key={d.slug} href={href({ department: d.slug, province: provinceFilter })} className={chip(department?.slug === d.slug)}>
              {d.shortName}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Filter by province">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate">Province</span>
          <Link href={href({ department: department?.slug })} className={chip(!provinceFilter)}>All</Link>
          {PROVINCES.map((p) => (
            <Link key={p} href={href({ department: department?.slug, province: p })} className={chip(provinceFilter === p)}>
              {p}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-6 font-body text-sm text-basalt">
        {partners.length} partner{partners.length === 1 ? "" : "s"}
        {department ? ` supplying ${department.name.toLowerCase()}` : ""}
        {provinceFilter ? ` in ${provinceFilter}` : ""}.
      </p>
      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-widest">
        <span className="rounded-sm bg-seam-blue/10 px-2 py-1 text-seam-blue">● Delivering now</span>
        <span className="rounded-sm bg-basalt/5 px-2 py-1 text-slate">○ Approved partner, being onboarded</span>
      </div>

      {provinces.map((province, i) => (
        <ProvinceSection
          key={province}
          province={province}
          suppliers={partners.filter((s) => s.province === province)}
          open={Boolean(provinceFilter) || provinces.length <= 2 || i === 0}
        />
      ))}

      {network.leads.length > 0 && !department && !provinceFilter && (
        <section className="mt-14 rounded-sm border border-ochre-gold/40 bg-ochre-gold/5 p-6">
          <h2 className="font-display text-lg font-bold text-basalt">Being qualified</h2>
          <p className="mt-1 max-w-3xl font-body text-sm text-slate">
            Product lines and supplier networks we&apos;re still qualifying. They aren&apos;t approved partners yet, and we don&apos;t deliver from them.
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

function ProvinceSection({ province, suppliers, open }: { province: string; suppliers: NetworkSupplier[]; open: boolean }) {
  return (
    <details open={open} className="group mt-6 rounded-sm border border-basalt/10 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <h2 className="font-display text-lg font-bold text-basalt">
          {province}
          <span className="ml-2 font-mono text-xs font-normal text-slate">({suppliers.length})</span>
        </h2>
        <span className="font-mono text-xs text-seam-blue group-open:hidden">Show</span>
        <span className="hidden font-mono text-xs text-seam-blue group-open:inline">Hide</span>
      </summary>
      <div className="grid gap-3 border-t border-basalt/10 p-4 sm:grid-cols-2">
        {suppliers.map((s) => (
          <div key={s.externalId ?? s.name} className="rounded-sm border border-basalt/10 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-body text-sm font-semibold text-basalt">{s.name}</p>
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.isActive ? "bg-seam-blue" : "border border-slate"}`}
                title={s.isActive ? "Delivering now" : "Being onboarded"}
              />
            </div>
            <p className="mt-1 font-body text-xs text-slate">{s.address ?? s.city}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-slate">
              {s.categorySlugs.map((c) => CATEGORY_NAME.get(c) ?? c).join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}
