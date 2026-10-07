import Link from "next/link";
import { createBooking } from "@/app/admin/bookings/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { PLANT, SERVICES, COMMISSION_PERCENT } from "@/data/plant-services";
import { api } from "@/lib/api";
import type { HirePartner } from "@/lib/admin-bookings";
import { BASIS_OPTIONS } from "@/lib/bookings";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Price a booking" };

const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"];
const label = "font-mono text-[10px] uppercase text-slate";

type Enquiry = { id: string; reference: string; sku: string | null; contactEmail: string; province: string | null; siteAddress: string | null; subject: string; details: Record<string, string | number | boolean> };

/**
 * Turn a partner's written quote into a booking the customer can accept and
 * pay. The customer price is the partner's amount plus the fixed commission —
 * never typed in — and the quote's source is recorded.
 */
export default async function NewBookingPage({ searchParams }: { searchParams: { enquiry?: string } }) {
  const token = sessionToken();
  const [partners, enquiries] = await Promise.all([
    api<HirePartner[]>("/bookings/admin/partners", { token }),
    searchParams.enquiry ? api<{ enquiries: Enquiry[] }>("/enquiries/admin", { token }) : Promise.resolve(null),
  ]);
  const enquiry = enquiries?.ok ? (enquiries.data.enquiries.find((e) => e.id === searchParams.enquiry) ?? null) : null;
  const active = partners.ok ? partners.data.filter((p) => p.status === "ACTIVE") : [];
  const start = typeof enquiry?.details["Start date"] === "string" ? String(enquiry.details["Start date"]) : "";
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/bookings" className="font-mono text-xs text-slate hover:text-seam-blue">← Bookings</Link>
      <h2 className="font-display text-xl font-bold text-basalt">Price a booking</h2>
      <p className="font-body text-sm text-slate">
        Enter the partner&apos;s written quote for the whole job. The customer pays that plus our {COMMISSION_PERCENT}% commission, and is emailed the quote to accept.
        The customer needs an account with this email.
      </p>
      {enquiry && (
        <p className="rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-3 font-body text-sm text-basalt">
          From enquiry <strong>{enquiry.reference}</strong>: {enquiry.subject}
          {Object.keys(enquiry.details).length > 0 && <span className="block text-xs text-slate">{Object.entries(enquiry.details).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>}
        </p>
      )}
      <ActionForm action={createBooking} className="grid gap-4 rounded-sm border border-basalt/10 bg-white p-5 sm:grid-cols-2">
        {enquiry && <input type="hidden" name="enquiryId" value={enquiry.id} />}
        <label className="block sm:col-span-2">
          <span className={label}>Customer email *</span>
          <input name="customerEmail" type="email" required defaultValue={enquiry?.contactEmail} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Machine or service *</span>
          <select name="sku" required defaultValue={enquiry?.sku ?? ""} className={inputClass}>
            <option value="" disabled>Choose…</option>
            <optgroup label="Plant hire (wet)">
              {PLANT.map((p) => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
            </optgroup>
            <optgroup label="Site services">
              {SERVICES.map((s) => <option key={s.sku} value={s.sku}>{s.name} ({s.sku})</option>)}
            </optgroup>
          </select>
        </label>
        <label className="block">
          <span className={label}>Charged *</span>
          <select name="basis" required defaultValue="DAY" className={inputClass}>
            {BASIS_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={label}>Quantity *</span>
          <input name="quantity" type="number" min={1} required defaultValue={typeof enquiry?.details.Duration === "string" ? enquiry.details.Duration : "1"} className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>First day *</span>
          <input name="startDate" type="date" required defaultValue={start} className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Last day *</span>
          <input name="endDate" type="date" required className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Province *</span>
          <select name="province" required defaultValue={enquiry?.province ?? ""} className={inputClass}>
            <option value="" disabled>Choose…</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={label}>Site address *</span>
          <input name="siteAddress" required minLength={3} maxLength={300} defaultValue={enquiry?.siteAddress ?? ""} className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Site notes (shown to the partner)</span>
          <textarea name="siteNotes" rows={2} maxLength={1000} className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Partner&apos;s quote for the job (R) *</span>
          <input name="partnerAmount" type="number" step="0.01" min="1" required className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Quote valid until</span>
          <input name="quoteValidUntil" type="date" className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Where the written quote is on record *</span>
          <input name="quoteSource" required minLength={3} maxLength={300} placeholder="e.g. Highveld Plant email, 9 Oct 2026, ref Q-118" className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Quoting partner (offered the job first)</span>
          <select name="preferredPartnerId" defaultValue="" className={inputClass}>
            <option value="">None — rank all eligible partners</option>
            {active.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.province})</option>)}
          </select>
        </label>
        <div className="sm:col-span-2">
          <SubmitButton>Create booking and email the quote</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}
