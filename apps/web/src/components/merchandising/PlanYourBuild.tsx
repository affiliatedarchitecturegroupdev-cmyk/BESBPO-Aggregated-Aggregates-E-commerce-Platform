import Link from "next/link";
import { YourProjectCard } from "@/components/merchandising/YourProjectCard";

const STEPS = [
  { title: "Save by build stage", body: "From any product page, or a whole stage at once from Shop by Build Stage." },
  { title: "Add quantities as you go", body: "A running estimate at today's list prices, with the weight to deliver and the ready-mix volume." },
  { title: "Share it", body: "A read-only link for your builder, quantity surveyor or the client." },
  { title: "Order or quote the lot", body: "Priced lines to the cart in one click, or the whole list for one written quote." },
];

/**
 * Plan your build (PLAN_YOUR_BUILD.md): the homepage band for project
 * lists. The page itself stays the same for everyone (and cacheable); the
 * card on the right loads the signed-in customer's latest project in the
 * browser.
 */
export function PlanYourBuild() {
  return (
    <section aria-labelledby="plan-your-build" className="bg-basalt text-limestone">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ochre-gold">Project lists</p>
          <h2 id="plan-your-build" className="mt-2 font-display text-2xl font-bold md:text-3xl">
            Plan the whole build, then order it in one go
          </h2>
          <p className="mt-3 max-w-2xl font-body text-sm text-limestone/80">
            Keep every material for a job in one list, laid out the way the job is built — from site prep to landscaping.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ochre-gold/60 font-mono text-xs text-ochre-gold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-body text-sm font-semibold">{s.title}</p>
                  <p className="mt-0.5 font-body text-xs text-limestone/70">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/shop-by-stage" className="font-body text-sm font-semibold text-limestone underline-offset-4 hover:underline">
              Shop by build stage →
            </Link>
            <Link href="/calculators" className="font-body text-sm font-semibold text-limestone underline-offset-4 hover:underline">
              Size it with the calculators →
            </Link>
          </div>
        </div>
        <YourProjectCard />
      </div>
    </section>
  );
}
