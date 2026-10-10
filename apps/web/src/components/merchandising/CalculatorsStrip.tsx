import Link from "next/link";
import { CalculatorIcon } from "@/components/merchandising/CalculatorIcon";
import { availableCalculators } from "@/data/calculators";

/**
 * Calculators strip (CALCULATORS.md): every calculator on the site in one
 * band, so a customer can size the job before choosing what to buy. Scrolls
 * sideways on phones to keep the homepage short.
 */
export function CalculatorsStrip({ hiddenSkus = [] }: { hiddenSkus?: string[] }) {
  const calculators = availableCalculators(hiddenSkus);
  return (
    <section aria-labelledby="calculators-strip" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">Calculators</p>
            <h2 id="calculators-strip" className="mt-1 font-display text-2xl font-bold text-basalt">
              Work out what you need
            </h2>
          </div>
          <Link href="/calculators" className="shrink-0 font-body text-sm text-seam-blue hover:underline">
            All calculators →
          </Link>
        </div>
        <ul className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {calculators.map((c, i) => (
            <li
              key={c.key}
              className={`w-64 shrink-0 snap-start sm:w-auto ${i === calculators.length - 1 && calculators.length % 4 === 3 ? "lg:col-span-2" : ""}`}
            >
              <Link
                href={c.href}
                className="group flex h-full gap-3 rounded-sm border border-basalt/10 bg-limestone/50 p-4 transition hover:border-seam-blue hover:bg-white hover:shadow-sm"
              >
                <CalculatorIcon icon={c.icon} className="h-7 w-7 shrink-0 text-seam-blue" />
                <div className="flex min-w-0 flex-col">
                  <p className="font-display text-sm font-semibold text-basalt group-hover:text-seam-blue">{c.name}</p>
                  <p className="mt-1 font-body text-xs text-slate">{c.works}</p>
                  <p className="mt-auto pt-2 font-body text-xs font-semibold text-seam-blue">{c.cta} →</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
