import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { PLANT_ICON } from "@/components/plant/icons";
import { PlantCard } from "@/components/plant/PlantCard";
import { findPlant, HIRE_BASES, HOURS_PER_DAY_CAP, PLANT, PLANT_CLASS_LABEL } from "@/data/plant-services";

export function generateStaticParams() {
  return PLANT.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = findPlant(params.slug);
  if (!item) return {};
  return {
    title: `${item.name} Hire (Wet Hire)`,
    description: `${item.name} — ${item.sizeLabel}, wet hire with operator and fuel from vetted partners across South Africa. ${item.typicalUses.join(". ")}. Request a written quote.`,
    alternates: { canonical: `/plant-hire/${item.slug}` },
  };
}

export default function PlantItemPage({ params }: { params: { slug: string } }) {
  const item = findPlant(params.slug);
  if (!item) notFound();
  const Icon = PLANT_ICON[item.plantClass];
  const related = PLANT.filter((p) => p.plantClass === item.plantClass && p.sku !== item.sku).slice(0, 4);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/plant-hire" className="hover:text-seam-blue">Plant Hire</Link> / {item.name}
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="grid h-14 w-14 place-items-center rounded-sm bg-basalt text-ochre-gold">
            <Icon className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 font-mono text-xs uppercase tracking-widest text-seam-blue">{PLANT_CLASS_LABEL[item.plantClass]} · {item.sku}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-basalt">{item.name}</h1>
          <p className="mt-1 font-body text-sm text-slate">{item.sizeLabel}</p>

          <dl className="mt-6 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
            {[
              ["Hire type", "Wet hire — operator, fuel and PPE included"],
              ["Hire day", `Up to ${HOURS_PER_DAY_CAP} machine hours; extra hours quoted`],
              ["Transport", item.needsLowbed ? "Delivered on a lowbed — mobilisation quoted by distance" : "Mobilisation quoted by distance"],
              ["Price", "Quoted — rates are being confirmed with partners in each province"],
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
          <p className="mt-6 font-body text-xs text-slate">{item.hireNotes}</p>
        </div>

        <div className="rounded-sm border border-basalt/10 bg-white p-5 md:p-6">
          <h2 className="font-display text-xl font-bold text-basalt">Request this machine</h2>
          <p className="mt-1 font-body text-sm text-slate">We&apos;ll check availability near your site and send a written quote. Nothing is booked until you accept it.</p>
          <div className="mt-5">
            <EnquiryForm
              kind="PLANT_HIRE"
              subject={`${item.name} — wet hire`}
              sku={item.sku}
              fields={[
                { name: "Hire basis", label: "Hire basis", type: "select", options: HIRE_BASES, required: true, defaultValue: "By the day" },
                { name: "Duration", label: "How many days or weeks?", type: "number", min: 1, required: true },
                { name: "Start date", label: "Start date", type: "date" },
                { name: "Job", label: "What's the job?", placeholder: "Trenching for a 40m water line…", wide: true },
              ]}
              submitLabel="Request a quote"
            />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-basalt">Other {PLANT_CLASS_LABEL[item.plantClass].toLowerCase()}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PlantCard key={p.sku} item={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
