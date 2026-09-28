import { DELIVERY_RULES } from "@/data/catalogue";
import { MEDIA_BY_ID } from "@/data/media";

/**
 * "How it gets to you": sourcing, grading, delivery and use, paired with
 * the slideshow's photography. Supplier numbers come from the live partner
 * network.
 */
export function QuarryToSite({ partnerSuppliers }: { partnerSuppliers: number | null }) {
  const photo = MEDIA_BY_ID.get("tipper-truck-transit") ?? MEDIA_BY_ID.values().next().value!;
  const steps = [
    {
      title: "Sourced",
      detail: partnerSuppliers
        ? `Drawn from ${partnerSuppliers} approved partner suppliers — no owned yards, so you're supplied from the one nearest your site.`
        : "Drawn from our approved partner-supplier network — no owned yards, so you're supplied from the one nearest your site.",
    },
    { title: "Graded", detail: "Crushed, screened and graded to SANS 1200-G, SANS 1083 or COLTO/TRH14 where the material has a standard." },
    {
      title: "Delivered",
      detail: `By Besfleet or one of 15+ tipper partners. Included within ${DELIVERY_RULES.bands[0].maxKm}km on full loads; banded to ${DELIVERY_RULES.quoteOverKm}km, quoted beyond.`,
    },
    { title: "Applied", detail: "On site — road layers, foundations, concrete, drainage and landscaping." },
  ];
  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <span className="font-mono text-xs uppercase tracking-widest text-seam-blue">From Quarry to Site</span>
        <div className="mt-8 grid gap-8 md:grid-cols-2 md:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- licensed Unsplash CDN photography (data/media.ts) */}
          <img src={photo.url} alt={photo.alt} loading="lazy" referrerPolicy="no-referrer" className="h-72 w-full rounded-sm bg-basalt object-cover" />
          <ol className="space-y-5">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="font-mono text-lg font-bold text-ochre-gold">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-display text-base font-semibold text-basalt">{step.title}</h3>
                  <p className="font-body text-sm text-slate">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
