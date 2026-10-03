import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/careers/ApplicationForm";
import { CORPORATE_EMAILS } from "@/data/corporate-contact";
import { DEPARTMENTS, EMPLOYMENT_LABELS, formatClosing, getOpenVacancies, WORKPLACE_LABELS } from "@/lib/careers";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join Aggregated Aggregates, Besbpo Group's online marketplace for aggregates and building materials, delivered across South Africa. See open vacancies and apply online.",
};

const WHY = [
  { title: "Build something new", text: "We've just launched nationally. The people who join now shape how South Africa buys aggregates online." },
  { title: "Learn a real industry", text: "Quarries, haulage, construction and e-commerce in one business — you'll understand how materials get from the face to the site." },
  { title: "Own your work", text: "A small team means real responsibility early, clear goals, and work that customers notice." },
  { title: "Part of a group", text: "Aggregated Aggregates is a division of Besbpo Group, alongside companies in building, finishes and construction supply." },
];

const STEPS = [
  { title: "Apply online", text: "Send your CV for a role below, or join the talent pool. It takes about five minutes." },
  { title: "We review", text: "The hiring manager reads every application against the role's requirements." },
  { title: "Interviews", text: "Shortlisted people are invited to an interview — by video call or in person — and sometimes a practical task." },
  { title: "Offer", text: "We check references and qualifications, then make an offer in writing." },
];

const FAQ = [
  { q: "Do I need construction experience?", a: "Not for every role. Each advert lists what's essential; for many roles attitude, reliability and willingness to learn matter more." },
  { q: "Can I apply for more than one role?", a: "Yes — apply for each role separately. If nothing fits right now, join the talent pool and we'll contact you when a suitable role opens." },
  { q: "Will I hear back?", a: "We contact everyone who's shortlisted. If you haven't heard from us within three weeks of a role's closing date, your application wasn't successful this time." },
  { q: "Do you charge a fee to apply or for training?", a: "Never. Besbpo Group doesn't ask applicants for money at any stage. If anyone does, it's a scam — please report it to us." },
];

/** Careers: why join, the teams we hire for, open vacancies, how we hire, and the talent pool. */
export default async function CareersPage({ searchParams }: { searchParams: { team?: string } }) {
  const vacancies = await getOpenVacancies();
  const teams = [...new Set(vacancies.map((v) => v.department))].sort();
  const team = teams.includes(searchParams.team ?? "") ? searchParams.team : undefined;
  const shown = team ? vacancies.filter((v) => v.department === team) : vacancies;

  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="font-mono text-xs uppercase text-ochre-gold">Careers</p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold sm:text-4xl">Help build how South Africa buys the materials it builds with.</h1>
          <p className="mt-4 max-w-2xl font-body text-limestone/80">
            Aggregated Aggregates sells sub-base, crushed stone, sand, ballast and more online, delivered from partner quarries across all nine provinces. We&apos;re growing, and we&apos;re hiring.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#vacancies" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              See open roles ({vacancies.length})
            </a>
            <a href="#talent-pool" className="rounded-sm border border-limestone/40 px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-limestone/10">
              Join the talent pool
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-bold text-basalt">Why work with us</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((item) => (
            <div key={item.title} className="rounded-sm border border-basalt/10 bg-white p-5">
              <h3 className="font-body font-semibold text-basalt">{item.title}</h3>
              <p className="mt-2 font-body text-sm text-slate">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="vacancies" className="scroll-mt-24 border-y border-basalt/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-basalt">Open vacancies</h2>
              <p className="mt-1 font-body text-sm text-slate">
                {vacancies.length === 0 ? "No roles are open right now." : `${vacancies.length} open ${vacancies.length === 1 ? "role" : "roles"}.`}
              </p>
            </div>
            {teams.length > 1 && (
              <nav aria-label="Filter by team" className="flex flex-wrap gap-2 font-mono text-[11px]">
                <Link href="/careers#vacancies" aria-current={!team ? "page" : undefined} className={`rounded-sm px-2.5 py-1 ${!team ? "bg-basalt text-limestone" : "bg-limestone text-slate"}`}>
                  All teams
                </Link>
                {teams.map((t) => (
                  <Link
                    key={t}
                    href={`/careers?team=${encodeURIComponent(t)}#vacancies`}
                    aria-current={team === t ? "page" : undefined}
                    className={`rounded-sm px-2.5 py-1 ${team === t ? "bg-basalt text-limestone" : "bg-limestone text-slate"}`}
                  >
                    {t}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          {shown.length === 0 ? (
            <div className="mt-6 rounded-sm border border-dashed border-basalt/20 p-6 font-body text-sm text-slate">
              New roles are posted here as we grow. <a href="#talent-pool" className="text-seam-blue hover:underline">Join the talent pool</a> and we&apos;ll contact you when one suits you.
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-basalt/10 rounded-sm border border-basalt/10">
              {shown.map((v) => (
                <li key={v.id}>
                  <Link href={`/careers/${v.slug}`} className="flex flex-wrap items-start justify-between gap-3 p-5 hover:bg-limestone/40">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] uppercase text-seam-blue">{v.department}</p>
                      <h3 className="mt-1 font-body text-base font-semibold text-basalt">{v.title}</h3>
                      <p className="mt-1 max-w-2xl font-body text-sm text-slate">{v.summary}</p>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[11px] text-slate">
                      <p>{v.location}</p>
                      <p>{EMPLOYMENT_LABELS[v.employmentType]} · {WORKPLACE_LABELS[v.workplace]}</p>
                      <p className="mt-1 text-ochre-gold">{formatClosing(v.closingDate)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-2xl font-bold text-basalt">Teams we hire for</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <div key={d.name} className="rounded-sm border border-basalt/10 bg-white p-5">
              <h3 className="font-body font-semibold text-basalt">{d.name}</h3>
              <p className="mt-2 font-body text-sm text-slate">{d.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-limestone/60">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl font-bold text-basalt">How we hire</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-sm border border-basalt/10 bg-white p-5">
                <span className="font-mono text-xs text-ochre-gold">Step {i + 1}</span>
                <h3 className="mt-1 font-body font-semibold text-basalt">{s.title}</h3>
                <p className="mt-2 font-body text-sm text-slate">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="talent-pool" className="mx-auto grid max-w-6xl scroll-mt-24 gap-8 px-4 py-14 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="font-display text-2xl font-bold text-basalt">Join the talent pool</h2>
          <p className="mt-2 font-body text-sm text-slate">
            Don&apos;t see the right role? Send us your CV and tell us what you&apos;re looking for. When a suitable role opens in your province, we&apos;ll get in touch first.
          </p>
          <div className="mt-6 space-y-3 font-body text-xs text-slate">
            <p>
              <strong className="text-basalt">Equal opportunity.</strong> We welcome applications from everyone and make appointments in line with the Employment Equity Act. People with disabilities are encouraged to apply — tell us if you need any adjustments to the process.
            </p>
            <p>
              <strong className="text-basalt">Your information.</strong> We use your application only for recruitment, keep it for up to 12 months, and delete it sooner if you ask (email {CORPORATE_EMAILS.sales}).
            </p>
            <p>
              <strong className="text-basalt">Beware of scams.</strong> We never ask for money to apply, for training or for equipment.
            </p>
          </div>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-6">
          <ApplicationForm />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="font-display text-2xl font-bold text-basalt">Questions</h2>
        <div className="mt-4 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none font-body text-sm font-semibold text-basalt">
                <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
                {f.q}
              </summary>
              <p className="mt-2 pl-4 font-body text-sm text-slate">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
