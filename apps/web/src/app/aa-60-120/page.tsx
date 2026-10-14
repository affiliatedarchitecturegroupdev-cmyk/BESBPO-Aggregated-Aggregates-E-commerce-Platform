import type { Metadata } from "next";
import Link from "next/link";
import { DeliveryBand } from "@/components/merchandising/DeliveryBand";
import { EXPRESS, EXPRESS_EXCLUDED, EXPRESS_MATERIALS } from "@/data/express";
import { formatZAR } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "AA 60/120 — Building Materials Delivered Within 2 Hours",
  description:
    "AA 60/120 express delivery: cement, bagged sand and stone, bricks, blocks, lintels, DPC, small steel and roofing delivered within 120 minutes when your site is within 30 km of a partner supplier. Monday to Saturday, order by 15:00.",
  alternates: { canonical: "/aa-60-120" },
};

const STEPS = [
  { title: "Check you're in range", body: `Share your site's location at checkout. AA 60/120 covers sites within ${EXPRESS.radiusKm} km of our nearest partner supplier for every material in the order.` },
  { title: "Order and pay", body: `Choose AA 60/120 at checkout (+${formatZAR(EXPRESS.fee)} on top of delivery) and pay by card or PayFast, ${EXPRESS.hours}.` },
  { title: "We confirm the supplier", body: "Our sales team calls or emails the supplier to confirm they can load it now, and emails you the time it's due." },
  { title: `${EXPRESS.prepMinutes} minutes' prep, then the clock`, body: `The supplier gets ${EXPRESS.prepMinutes} minutes to load, then the ${EXPRESS.promiseMinutes}-minute delivery clock starts.` },
];

/** AA 60/120 — express delivery of everyday building materials (docs/express-delivery.md). */
export default function ExpressDeliveryPage() {
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / AA 60/120
          </nav>
          <p className="mt-6 inline-block rounded-sm bg-ochre-gold px-2 py-1 font-mono text-xs font-bold uppercase tracking-widest text-basalt">AA 60/120 · Express</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Building materials on site within two hours</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            Ran short of cement mid-pour? A pallet of bricks or a roll of DPC holding up the job? AA 60/120 delivers everyday building materials within{" "}
            {EXPRESS.promiseMinutes} minutes when your site is within {EXPRESS.radiusKm} km of one of our partner suppliers.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Delivered within", value: `${EXPRESS.promiseMinutes} min` },
              { label: "Express fee", value: `+${formatZAR(EXPRESS.fee)}` },
              { label: "Radius", value: `${EXPRESS.radiusKm} km` },
              { label: "Order by", value: `${EXPRESS.cutoff}, Mon–Sat` },
            ].map((s) => (
              <div key={s.label} className="rounded-sm border border-limestone/15 p-3">
                <dt className="font-mono text-[10px] uppercase tracking-wide text-limestone/60">{s.label}</dt>
                <dd className="mt-1 font-display text-xl font-bold text-ochre-gold">{s.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/buy-online" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Shop priced products
            </Link>
            <a href="#check" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Check your site is in range
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">How it works</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-sm border border-basalt/10 bg-white p-5">
              <p className="font-mono text-xs text-ochre-gold">0{i + 1}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-basalt">{s.title}</h3>
              <p className="mt-1 font-body text-sm text-slate">{s.body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-14 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-display text-2xl font-bold text-basalt">What qualifies</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {EXPRESS_MATERIALS.map((m) => (
                <li key={m.name}>
                  <Link href={m.href} className="block h-full rounded-sm border border-basalt/10 bg-white p-4 transition-colors hover:border-seam-blue">
                    <span className="font-body text-sm font-semibold text-basalt">{m.name}</span>
                    <span className="mt-1 block font-body text-xs text-slate">{m.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-body text-xs text-slate">
              <span className="font-semibold text-basalt">Not on AA 60/120:</span> {EXPRESS_EXCLUDED} Every item in the order must qualify, the order must be
              priced online (not a quote), and the load has to fit one truck — about {EXPRESS.maxLoadTonnes} tonnes, so up to a thousand maxi bricks or a hundred
              50 kg bags of cement.
            </p>
          </div>
          <aside className="rounded-sm border border-ochre-gold bg-ochre-gold/10 p-5 font-body text-sm text-basalt">
            <h2 className="font-display text-lg font-bold">Our promise</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <strong>Due within {EXPRESS.promiseMinutes} minutes</strong> of the clock starting — {EXPRESS.prepMinutes} minutes after our sales team confirms the
                supplier.
              </li>
              <li>
                <strong>More than an hour late?</strong> If we deliver more than {EXPRESS.refundAfterMinutes / 60} hours after the clock starts, we refund the{" "}
                {formatZAR(EXPRESS.fee)} express fee in full.
              </li>
              <li>
                <strong>Can&apos;t take it on?</strong> If no supplier can load it in time, we tell you straight away, your order comes by standard delivery, and the
                express fee is refunded in full.
              </li>
              <li>
                <strong>Card or PayFast only</strong>, so the clock isn&apos;t held up waiting for a transfer to clear.
              </li>
            </ul>
            <p className="mt-4 text-xs text-slate">
              The {formatZAR(EXPRESS.fee)} fee is VAT-inclusive and comes on top of the normal delivery charge. Full terms:{" "}
              <Link href="/legal/shipping-delivery#aa-60-120-express-delivery" className="text-seam-blue underline">Shipping &amp; Delivery policy</Link>.
            </p>
          </aside>
        </section>
      </div>

      <section id="check" className="scroll-mt-24 border-y border-basalt/10 bg-seam-blue/5 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-2xl font-bold text-basalt">Is your site within {EXPRESS.radiusKm} km?</h2>
          <p className="mt-1 max-w-2xl font-body text-sm text-slate">
            Find your nearest partner supplier for the material you need. Checkout measures from your exact pin to the nearest supplier of every material in the
            order.
          </p>
          <div className="mt-5">
            <DeliveryBand bare />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">Questions</h2>
        <dl className="mt-5 grid gap-5 font-body text-sm md:grid-cols-2">
          {[
            { q: "When does the 120 minutes start?", a: `Once you've paid and our sales team has confirmed a supplier can load it, the supplier has ${EXPRESS.prepMinutes} minutes' prep, then the clock starts. We email you the time it's due.` },
            { q: "What if I order after 15:00?", a: `AA 60/120 orders are taken ${EXPRESS.hours}. After the cut-off, or on a Sunday, check out with standard delivery instead.` },
            { q: "Can I add a bulk load or timber?", a: "Not to an AA 60/120 order — order those separately with standard delivery. Checkout tells you which item is holding it up." },
            { q: "Does it work everywhere in South Africa?", a: `Wherever your site is within ${EXPRESS.radiusKm} km of a partner supplier for every material in the order — the network keeps growing. Checkout tells you if your site qualifies.` },
          ].map((f) => (
            <div key={f.q} className="rounded-sm border border-basalt/10 bg-white p-5">
              <dt className="font-semibold text-basalt">{f.q}</dt>
              <dd className="mt-1 text-slate">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
