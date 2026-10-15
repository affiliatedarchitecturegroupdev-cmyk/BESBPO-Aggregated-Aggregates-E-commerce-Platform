import Link from "next/link";
import { EXPRESS, EXPRESS_MATERIALS } from "@/data/express";
import { formatZAR } from "@/lib/pricing";

/** Homepage: AA 60/120 express delivery, its own section. */
export function ExpressBand() {
  return (
    <section className="bg-basalt px-4 py-10 text-limestone" aria-labelledby="express-band">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="inline-block rounded-sm bg-ochre-gold px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-basalt">New · AA 60/120</p>
          <h2 id="express-band" className="mt-3 font-display text-3xl font-bold leading-tight">Short on materials? On site within 2 hours.</h2>
          <p className="mt-3 max-w-xl font-body text-sm text-limestone/80">
            Cement, bricks, blocks, lintels, DPC, small steel and roofing — delivered within {EXPRESS.promiseMinutes} minutes when your site is within{" "}
            {EXPRESS.radiusKm} km of a partner supplier. {formatZAR(EXPRESS.fee)} on top of delivery; more than an hour late and the fee is refunded.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/aa-60-120" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              How AA 60/120 works
            </Link>
            <Link href="/aa-60-120#check" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Check your site
            </Link>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2 font-body text-sm">
          {EXPRESS_MATERIALS.map((m) => (
            <li key={m.name}>
              <Link href={m.href} className="block rounded-sm border border-limestone/15 px-3 py-2 hover:border-ochre-gold">
                {m.name}
              </Link>
            </li>
          ))}
          <li className="rounded-sm border border-dashed border-limestone/20 px-3 py-2 font-mono text-[11px] text-limestone/60">
            {EXPRESS.hours} · order by {EXPRESS.cutoff}
          </li>
        </ul>
      </div>
    </section>
  );
}
