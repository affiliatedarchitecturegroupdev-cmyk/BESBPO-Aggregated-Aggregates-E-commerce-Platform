import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/blog/MarkdownBody";
import { ApplicationForm } from "@/components/careers/ApplicationForm";
import { EMPLOYMENT_LABELS, formatClosing, getVacancy, WORKPLACE_LABELS } from "@/lib/careers";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const vacancy = await getVacancy(params.slug);
  return vacancy ? { title: `${vacancy.title} — Careers`, description: vacancy.summary } : { title: "Vacancy closed" };
}

const EMPLOYMENT_SCHEMA: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACTOR",
  TEMPORARY: "TEMPORARY",
  INTERNSHIP: "INTERN",
  LEARNERSHIP: "INTERN",
};

export default async function VacancyPage({ params }: { params: { slug: string } }) {
  const vacancy = await getVacancy(params.slug);
  if (!vacancy) notFound();
  // Google for Jobs: structured data for the advert.
  const jobPosting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: vacancy.title,
    description: vacancy.description,
    datePosted: vacancy.publishedAt ?? undefined,
    validThrough: vacancy.closingDate ?? undefined,
    employmentType: EMPLOYMENT_SCHEMA[vacancy.employmentType],
    hiringOrganization: { "@type": "Organization", name: "Aggregated Aggregates (Besbpo Group (Pty) Ltd)", sameAs: "https://aggregated.besbpo.co.za" },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: vacancy.location, addressCountry: "ZA" } },
    ...(vacancy.workplace === "REMOTE" ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "South Africa" } } : {}),
  };
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting).replace(/</g, "\\u003c") }} />
      <Link href="/careers#vacancies" className="font-mono text-xs text-slate hover:text-seam-blue">← All vacancies</Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <article>
          <p className="font-mono text-[11px] uppercase text-seam-blue">{vacancy.department}</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-basalt">{vacancy.title}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm sm:grid-cols-4">
            <div><dt className="font-mono text-[10px] uppercase text-slate">Location</dt><dd className="text-basalt">{vacancy.location}</dd></div>
            <div><dt className="font-mono text-[10px] uppercase text-slate">Type</dt><dd className="text-basalt">{EMPLOYMENT_LABELS[vacancy.employmentType]}</dd></div>
            <div><dt className="font-mono text-[10px] uppercase text-slate">Workplace</dt><dd className="text-basalt">{WORKPLACE_LABELS[vacancy.workplace]}</dd></div>
            <div><dt className="font-mono text-[10px] uppercase text-slate">Salary</dt><dd className="text-basalt">{vacancy.salary ?? "Market related"}</dd></div>
          </dl>
          <p className="mt-3 font-mono text-xs text-ochre-gold">{formatClosing(vacancy.closingDate)}</p>
          <p className="mt-6 font-body text-base text-basalt">{vacancy.summary}</p>
          <div className="mt-6">
            <MarkdownBody markdown={vacancy.description} />
          </div>
        </article>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-sm border border-basalt/10 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-basalt">Apply for this role</h2>
            <div className="mt-4">
              <ApplicationForm vacancyId={vacancy.id} roleTitle={vacancy.title} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
