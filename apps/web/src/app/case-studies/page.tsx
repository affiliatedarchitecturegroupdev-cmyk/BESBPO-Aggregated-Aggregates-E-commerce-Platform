import Link from "next/link";
import { CASE_STUDIES } from "@/data/case-studies";

export const metadata = {
  title: "Case Studies",
  description: "How trade and Volume/Civil Bulk accounts use Aggregated Aggregates — illustrative examples.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Case Studies
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Case Studies</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-slate">
        How Trade and Volume/Civil Bulk accounts use Aggregated Aggregates. These are illustrative scenarios, not named
        client projects — real case studies are added here as projects complete.
      </p>

      <div className="mt-10 space-y-8">
        {CASE_STUDIES.map((study) => (
          <div key={study.slug} className="rounded-sm border border-basalt/10 bg-white p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">{study.industry}</span>
              <span className="rounded-sm bg-ochre-gold/20 px-2 py-0.5 font-mono text-[9px] uppercase text-basalt">Illustrative example</span>
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-basalt">{study.title}</h2>
            <p className="mt-3 font-body text-sm text-slate">{study.summary}</p>
            <div className="mt-4 flex flex-wrap gap-6">
              {study.stats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-lg font-bold text-basalt">{stat.value}</p>
                  <p className="font-mono text-[10px] uppercase text-slate">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
