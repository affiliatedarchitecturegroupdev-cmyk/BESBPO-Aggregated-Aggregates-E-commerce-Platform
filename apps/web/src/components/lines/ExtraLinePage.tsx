import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { EXTRA_LINES, findExtraLine } from "@/data/extra-lines";

export function extraLineMetadata(slug: string): Metadata {
  const line = findExtraLine(slug);
  if (!line) return {};
  return { title: line.title, description: `${line.intro} Quoted per job.`, alternates: { canonical: line.path } };
}

/** The shared page for the quote-only further lines (data/extra-lines.ts). */
export function ExtraLinePage({ slug }: { slug: string }) {
  const line = findExtraLine(slug);
  if (!line) notFound();
  const others = EXTRA_LINES.filter((l) => l.slug !== slug);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/services" className="hover:text-seam-blue">Services</Link> / {line.title}
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">Quoted per job</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-basalt md:text-4xl">{line.title}</h1>
          <p className="mt-3 font-body text-base text-slate">{line.intro}</p>
          <div className="mt-8 grid gap-3">
            {line.items.map((i) => (
              <div key={i.name} className="rounded-sm border border-basalt/10 bg-white p-4">
                <h2 className="font-display text-base font-semibold text-basalt">{i.name}</h2>
                <p className="mt-1 font-body text-sm text-slate">{i.text}</p>
              </div>
            ))}
          </div>
          <h2 className="mt-8 font-display text-lg font-semibold text-basalt">How it works</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 font-body text-sm text-basalt">
            {line.howItWorks.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <ul className="mt-6 space-y-1 font-body text-xs text-slate">
            {line.notes.map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-5 md:p-6">
          <h2 className="font-display text-xl font-bold text-basalt">Request a quote</h2>
          <p className="mt-1 font-body text-sm text-slate">Tell us about the job and we&apos;ll come back with a written quote.</p>
          <div className="mt-5">
            <EnquiryForm kind="BUSINESS_LINE" subject={line.title} fields={line.fields.map((f) => ({ ...f }))} />
          </div>
        </div>
      </div>
      <section className="mt-14">
        <h2 className="font-display text-xl font-bold text-basalt">Also on the platform</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[...others.map((l) => ({ href: l.path, label: l.title })), { href: "/plant-hire", label: "Plant hire" }, { href: "/services", label: "Site services" }].map((l) => (
            <Link key={l.href} href={l.href} className="rounded-sm border border-basalt/15 bg-white px-3 py-1.5 font-body text-sm text-basalt hover:border-seam-blue">
              {l.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
