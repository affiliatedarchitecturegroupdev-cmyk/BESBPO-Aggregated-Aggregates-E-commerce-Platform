import { DELIVERY_RULES } from "@/data/catalogue";

const STEPS = [
  {
    title: "Pick your material",
    body: "Browse graded sub-base, stone, sand and decorative aggregate. Every product shows its reference standard and whether it comes bulk, bagged, or both.",
  },
  {
    title: "Size the load",
    body: "Enter tons, m³ or bags — the calculator converts between them using each material's bulk density and prices your tier and delivery distance live.",
  },
  {
    title: "Delivered by tipper",
    body: `Delivery within ${DELIVERY_RULES.bands[0].maxKm}km of the nearest partner supplier is included on full loads. Larger civil orders and anything beyond ${DELIVERY_RULES.quoteOverKm}km are quoted individually.`,
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-basalt/10 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold text-basalt">How ordering works</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="font-mono text-xs text-seam-blue">0{index + 1}</span>
              <p className="mt-2 font-display text-lg font-bold text-basalt">{step.title}</p>
              <p className="mt-2 font-body text-sm text-slate">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
