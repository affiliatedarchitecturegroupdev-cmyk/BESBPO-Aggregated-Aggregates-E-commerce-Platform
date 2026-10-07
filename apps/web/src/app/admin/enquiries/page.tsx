import Link from "next/link";
import { eraseEnquiry, updateEnquiry } from "@/app/admin/enquiries/actions";
import { api } from "@/lib/api";
import { getSession, sessionToken } from "@/lib/session";

export const metadata = { title: "Enquiries" };

type EnquiryStatus = "NEW" | "IN_PROGRESS" | "QUOTED" | "WON" | "LOST" | "CLOSED";
type EnquiryKind = "PLANT_HIRE" | "SITE_SERVICE" | "BUSINESS_LINE" | "JOB_PACK" | "ESTIMATE" | "PARTNER_APPLICATION";

type Enquiry = {
  id: string;
  reference: string;
  kind: EnquiryKind;
  subject: string;
  sku: string | null;
  details: Record<string, string | number | boolean>;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  province: string | null;
  siteAddress: string | null;
  message: string | null;
  status: EnquiryStatus;
  staffNotes: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  QUOTED: "Quoted",
  WON: "Won",
  LOST: "Lost",
  CLOSED: "Closed",
};

const KIND_LABELS: Record<EnquiryKind, string> = {
  PLANT_HIRE: "Plant hire",
  SITE_SERVICE: "Site service",
  BUSINESS_LINE: "Further line",
  JOB_PACK: "Job pack",
  ESTIMATE: "Estimator",
  PARTNER_APPLICATION: "Partner application",
};

const select = "rounded-sm border border-basalt/20 bg-white px-2 py-1 font-body text-xs";

/**
 * Requests from the plant-hire, services, job-pack, estimator, further-line
 * and partner pages. These lines are quoted until partner rate cards are in
 * (PLANT_HIRE_CATALOGUE.md): price them with partners, reply to the customer
 * by email quoting the reference, and move the status along.
 */
export default async function EnquiriesPage({ searchParams }: { searchParams: { status?: string; kind?: string } }) {
  const token = sessionToken();
  const query = new URLSearchParams();
  if (searchParams.status) query.set("status", searchParams.status);
  if (searchParams.kind) query.set("kind", searchParams.kind);
  const [user, result] = await Promise.all([getSession(), api<{ enquiries: Enquiry[]; counts: Partial<Record<EnquiryStatus, number>> }>(`/enquiries/admin?${query}`, { token })]);
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const { enquiries, counts } = result.data;
  const isAdmin = user?.role === "ADMIN";
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">Enquiries</h2>
        <p className="mt-1 font-body text-xs text-slate">
          Plant hire, site services, job packs, estimates, further lines and partner applications. These are quoted until written partner rates exist — reply
          by email quoting the reference. Customers&apos; contact details stay with us; share only the job details with partners.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 font-mono text-[11px]">
        {(Object.keys(STATUS_LABELS) as EnquiryStatus[]).map((s) => (
          <Link
            key={s}
            href={`/admin/enquiries?status=${s}`}
            className={`rounded-sm border px-2 py-1 ${searchParams.status === s ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 bg-white text-basalt hover:border-seam-blue"}`}
          >
            {STATUS_LABELS[s]} · {counts[s] ?? 0}
          </Link>
        ))}
        <Link href="/admin/enquiries" className="rounded-sm border border-basalt/20 bg-white px-2 py-1 text-slate hover:border-seam-blue">
          All
        </Link>
      </div>
      <form className="flex flex-wrap items-end gap-3 rounded-sm border border-basalt/10 bg-white p-3 font-body text-xs">
        {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        <label>
          <span className="block font-mono text-[10px] uppercase text-slate">Type</span>
          <select name="kind" defaultValue={searchParams.kind ?? ""} className={select}>
            <option value="">All types</option>
            {Object.entries(KIND_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-sm bg-basalt px-3 py-1.5 text-limestone">Filter</button>
      </form>
      {enquiries.length === 0 && <p className="font-body text-sm text-slate">No enquiries here yet.</p>}
      <ul className="space-y-3">
        {enquiries.map((e) => (
          <li key={e.id} className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-slate">
                  {e.reference} · {KIND_LABELS[e.kind]} · {new Date(e.createdAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p className="mt-1 font-semibold text-basalt">
                  {e.subject}
                  {e.sku && <span className="ml-2 font-mono text-[11px] font-normal text-slate">{e.sku}</span>}
                </p>
                <p className="text-xs text-slate">
                  {e.contactName}
                  {e.companyName && ` (${e.companyName})`} · <a href={`mailto:${e.contactEmail}?subject=${encodeURIComponent(`Your request ${e.reference}`)}`} className="text-seam-blue hover:underline">{e.contactEmail}</a>
                  {e.contactPhone && (
                    <>
                      {" "}· <a href={`tel:${e.contactPhone}`} className="hover:underline">{e.contactPhone}</a>
                    </>
                  )}
                  {(e.siteAddress || e.province) && ` · ${[e.siteAddress, e.province].filter(Boolean).join(", ")}`}
                </p>
              </div>
              <span className="rounded-sm bg-limestone px-2 py-0.5 font-mono text-[10px] uppercase text-basalt">{STATUS_LABELS[e.status]}</span>
            </div>
            {Object.keys(e.details).length > 0 && (
              <dl className="mt-3 grid gap-x-6 gap-y-1 rounded-sm bg-limestone/60 p-3 text-xs sm:grid-cols-2">
                {Object.entries(e.details).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-slate">{k}:</dt>
                    <dd className="text-basalt">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {e.message && <p className="mt-3 whitespace-pre-line text-xs text-basalt">{e.message}</p>}
            {(e.kind === "PLANT_HIRE" || e.kind === "SITE_SERVICE" || e.kind === "JOB_PACK" || e.kind === "ESTIMATE") && (
              <Link href={`/admin/bookings/new?enquiry=${e.id}`} className="mt-3 inline-block font-body text-xs font-semibold text-seam-blue hover:underline">
                Price as a booking from a partner&apos;s quote →
              </Link>
            )}
            {e.kind === "PARTNER_APPLICATION" && (
              <Link href="/admin/hire-partners" className="mt-3 inline-block font-body text-xs font-semibold text-seam-blue hover:underline">
                Add as a hire partner →
              </Link>
            )}
            <form action={updateEnquiry} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={e.id} />
              <select name="status" defaultValue={e.status} className={select} aria-label="Status">
                {Object.entries(STATUS_LABELS).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
              <input name="staffNotes" defaultValue={e.staffNotes ?? ""} placeholder="Notes (staff only)" maxLength={4000} className={`${select} min-w-[16rem] flex-1`} />
              <button className="rounded-sm bg-seam-blue px-3 py-1 font-body text-xs text-limestone hover:bg-basalt">Save</button>
            </form>
            {isAdmin && (
              <form action={eraseEnquiry} className="mt-2">
                <input type="hidden" name="id" value={e.id} />
                <button className="font-body text-[11px] text-slate hover:text-red-700">Delete enquiry (POPIA)</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
