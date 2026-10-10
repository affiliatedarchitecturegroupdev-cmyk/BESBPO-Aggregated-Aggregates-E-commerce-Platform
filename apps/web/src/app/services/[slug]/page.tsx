import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryForm, type DetailField } from "@/components/enquiries/EnquiryForm";
import { SERVICE_ICON } from "@/components/plant/icons";
import { ServiceCard } from "@/components/plant/PlantCard";
import { findService, SERVICE_TYPE_LABEL, SERVICE_UNIT_LABEL, SERVICES, type ServiceItem } from "@/data/plant-services";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = findService(params.slug);
  if (!item) return {};
  return {
    title: item.name,
    description: `${item.description} Done by vetted partners across South Africa — request a written quote.`,
    alternates: { canonical: `/services/${item.slug}` },
  };
}

/** The questions that size each kind of service. */
function fieldsFor(item: ServiceItem): DetailField[] {
  const when: DetailField = { name: "Date needed", label: "Date needed", type: "date" };
  switch (item.unit) {
    case "PER_LOAD":
      return [{ name: "Loads", label: "How many loads?", type: "number", min: 1, required: true }, when, { name: "Material", label: "Material", placeholder: "G5, spoil, rubble…" }];
    case "PER_DAY":
      return [{ name: "Days", label: "How many days?", type: "number", min: 1, required: true }, when];
    case "PER_SKIP":
      return [
        { name: "Skips", label: "How many skips?", type: "number", min: 1, required: true },
        when,
        { name: "Waste type", label: "What goes in it?", placeholder: "Builder's rubble, garden waste…" },
      ];
    case "PER_TONNE":
      return [
        { name: "Tonnes", label: "Approximate tonnes of steel to fix", type: "number", min: 1, required: true },
        when,
        { name: "Elements", label: "What's being fixed?", placeholder: "Raft, ground beams, slab, columns…" },
        { name: "Steel supply", label: "Who supplies the steel?", placeholder: "Ordering through you / already on site" },
      ];
    case "PER_M2":
      return [{ name: "Area m2", label: "Approximate area (m²)", type: "number", min: 1, required: true }, when, { name: "Vegetation", label: "What's on the site?", placeholder: "Grass, bush, trees, old slab…" }];
    default:
      return [
        { name: "Scope", label: "Describe the job", type: "textarea", required: true, placeholder: "Single-storey house, about 120m², brick and concrete…" },
        when,
      ];
  }
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const item = findService(params.slug);
  if (!item) notFound();
  const Icon = SERVICE_ICON[item.serviceType];
  const related = SERVICES.filter((s) => s.sku !== item.sku && s.serviceType === item.serviceType).slice(0, 3);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/services" className="hover:text-seam-blue">Site Services</Link> / {item.name}
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="grid h-14 w-14 place-items-center rounded-sm bg-basalt text-ochre-gold">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 font-mono text-xs uppercase tracking-widest text-seam-blue">{SERVICE_TYPE_LABEL[item.serviceType]} · {item.sku}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-basalt">{item.name}</h1>
          <p className="mt-3 font-body text-sm text-slate">{item.description}</p>
          <dl className="mt-6 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
            {[
              ["Charged", SERVICE_UNIT_LABEL[item.unit]],
              ["Price", item.unit === "QUOTE" ? "Always quoted per job, after a site assessment" : "Quoted — rates are being confirmed with partners in each province"],
              ["Done by", "Vetted partners near your site"],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3">
                <dt className="font-mono text-[11px] uppercase text-slate">{k}</dt>
                <dd className="text-basalt">{v}</dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-8 font-display text-lg font-semibold text-basalt">Typical uses</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-body text-sm text-basalt">
            {item.typicalUses.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          {(item.serviceType === "DEMOLITION" || item.serviceType === "RUBBLE_REMOVAL") && (
            <p className="mt-6 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-4 font-body text-sm text-basalt">
              Rubble can come back as recycled aggregate. See the <Link href="/recycled" className="font-semibold text-seam-blue hover:underline">recycled aggregate loop</Link>.
            </p>
          )}
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-5 md:p-6">
          <h2 className="font-display text-xl font-bold text-basalt">Request this service</h2>
          <p className="mt-1 font-body text-sm text-slate">We&apos;ll match a partner near your site and send a written quote. Nothing is booked until you accept it.</p>
          <div className="mt-5">
            <EnquiryForm kind="SITE_SERVICE" subject={item.name} sku={item.sku} fields={fieldsFor(item)} />
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-basalt">Related services</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((s) => (
              <ServiceCard key={s.sku} item={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
