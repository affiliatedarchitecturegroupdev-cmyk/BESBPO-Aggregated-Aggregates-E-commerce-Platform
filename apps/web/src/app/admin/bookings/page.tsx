import Link from "next/link";
import { markPayoutPaid, reviewFlag, scanFlags } from "@/app/admin/bookings/actions";
import { ActionForm, SubmitButton } from "@/components/account/Forms";
import { StatusPill } from "@/components/bookings/BookingParts";
import { api } from "@/lib/api";
import type { AdminBookingRow, AdminPayout, Flag } from "@/lib/admin-bookings";
import { BOOKING_STATUS_LABEL, bookingDate, dateRange, dateTime, PAYOUT_STATUS_LABEL, type BookingStatus } from "@/lib/bookings";
import { formatZAR } from "@/lib/pricing";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Bookings" };

const VIEWS = [
  { key: "bookings", label: "Bookings" },
  { key: "payouts", label: "Partner payouts" },
  { key: "flags", label: "Review flags" },
] as const;
const input = "rounded-sm border border-basalt/20 bg-white px-2 py-1 font-body text-xs";

/**
 * Plant-hire and site-service bookings (Phase C). Price a booking from a
 * partner's written quote, confirm the customer's EFT to start dispatch,
 * resolve disputes, pay partners when their payout is due and review
 * possible off-platform contact.
 */
export default async function AdminBookingsPage({ searchParams }: { searchParams: { view?: string; status?: string } }) {
  const view = VIEWS.find((v) => v.key === searchParams.view)?.key ?? "bookings";
  const token = sessionToken();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-basalt">Hire & service bookings</h2>
        <div className="flex gap-2 font-body text-sm">
          <Link href="/admin/hire-partners" className="rounded-sm border border-basalt/20 bg-white px-3 py-1.5 text-basalt hover:border-seam-blue">Partners & fleet</Link>
          <Link href="/admin/bookings/new" className="rounded-sm bg-seam-blue px-3 py-1.5 text-limestone hover:bg-basalt">Price a booking</Link>
        </div>
      </div>
      <nav className="flex gap-2 font-body text-sm" aria-label="Bookings views">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/admin/bookings?view=${v.key}`} className={`rounded-sm px-3 py-1 ${v.key === view ? "bg-basalt text-limestone" : "border border-basalt/20 bg-white text-basalt"}`}>
            {v.label}
          </Link>
        ))}
      </nav>
      {view === "bookings" && <Bookings token={token} status={searchParams.status} />}
      {view === "payouts" && <Payouts token={token} />}
      {view === "flags" && <Flags token={token} />}
    </div>
  );
}

async function Bookings({ token, status }: { token: string | null; status?: string }) {
  const result = await api<AdminBookingRow[]>(`/bookings/admin${status ? `?status=${encodeURIComponent(status)}` : ""}`, { token });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  return (
    <>
      <div className="flex flex-wrap gap-2 font-mono text-[11px]">
        <Link href="/admin/bookings" className={`rounded-sm border px-2 py-1 ${!status ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 bg-white"}`}>All</Link>
        {(Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[]).map((s) => (
          <Link key={s} href={`/admin/bookings?status=${s}`} className={`rounded-sm border px-2 py-1 ${status === s ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 bg-white"}`}>
            {BOOKING_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>
      {result.data.length === 0 && <p className="font-body text-sm text-slate">No bookings here. Price one from an enquiry with “Price a booking”.</p>}
      <ul className="space-y-2">
        {result.data.map((b) => (
          <li key={b.id}>
            <Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-basalt/10 bg-white p-3 font-body text-sm hover:border-seam-blue">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-slate">{b.reference} · {dateRange(b.startDate, b.endDate)} · {b.province}</p>
                <p className="font-semibold text-basalt">{b.itemName}</p>
                <p className="text-xs text-slate">{b.user.name ?? b.user.email}{b.assignedPartner ? ` → ${b.assignedPartner.name}` : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                {b.disputes.length > 0 && <span className="font-mono text-[10px] uppercase text-red-700">Open dispute</span>}
                <span className="text-right text-xs text-slate">{formatZAR(Number(b.customerTotal))}<br />partner {formatZAR(Number(b.partnerAmount))}</span>
                <StatusPill status={b.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

async function Payouts({ token }: { token: string | null }) {
  const result = await api<AdminPayout[]>("/bookings/admin/payouts", { token });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  return (
    <>
      <p className="font-body text-xs text-slate">
        A payout becomes due 48 hours after sign-off with no open dispute. Pay it by EFT to the partner&apos;s confirmed account, then record the reference here.
        Automatic split payouts need gateway credentials and aren&apos;t live.
      </p>
      {result.data.length === 0 && <p className="font-body text-sm text-slate">No payouts yet.</p>}
      <ul className="space-y-2">
        {result.data.map((p) => (
          <li key={p.id} className="rounded-sm border border-basalt/10 bg-white p-3 font-body text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/admin/bookings/${p.booking.id}`} className="font-mono text-[11px] text-seam-blue hover:underline">{p.booking.reference}</Link>
                <p className="font-semibold text-basalt">{formatZAR(Number(p.amount))} to {p.partner.name}</p>
                <p className="text-xs text-slate">
                  {PAYOUT_STATUS_LABEL[p.status]}
                  {p.status === "HELD" && p.releaseAfter ? ` until ${dateTime(p.releaseAfter)}` : ""}
                  {p.paidAt ? ` · paid ${bookingDate(p.paidAt)} (${p.paidReference})` : ""}
                  {!p.partner.payoutDetailsConfirmed && p.status !== "PAID" ? " · bank letter not on file" : ""}
                </p>
              </div>
              {p.status === "DUE" && (
                <ActionForm action={markPayoutPaid} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="paidReference" required minLength={3} placeholder="EFT reference" className={input} />
                  <SubmitButton>Mark paid</SubmitButton>
                </ActionForm>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

async function Flags({ token }: { token: string | null }) {
  const result = await api<Flag[]>("/bookings/admin/flags", { token });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl font-body text-xs text-slate">
          Possible attempts to take work off the platform: contact details caught in chat or job cards, and customer–partner pairs that booked repeatedly and then
          stopped. These are prompts for a conversation, never automatic penalties.
        </p>
        <ActionForm action={scanFlags} className="flex items-center gap-2">
          <SubmitButton variant="subtle">Scan for stopped pairs</SubmitButton>
        </ActionForm>
      </div>
      {result.data.length === 0 && <p className="font-body text-sm text-slate">Nothing to review.</p>}
      <ul className="space-y-2">
        {result.data.map((f) => (
          <li key={f.id} className="rounded-sm border border-basalt/10 bg-white p-3 font-body text-sm">
            <p className="font-mono text-[11px] text-slate">{f.signal === "REDACTION_HIT" ? "Contact details removed" : "Repeat pair stopped"} · {dateTime(f.createdAt)}</p>
            <p className="mt-1 text-basalt">{f.detail}</p>
            {f.bookingId && <Link href={`/admin/bookings/${f.bookingId}`} className="text-xs text-seam-blue hover:underline">Open booking</Link>}
            <form action={reviewFlag} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={f.id} />
              <input name="reviewNote" placeholder="Note (optional)" maxLength={1000} className={`${input} min-w-[14rem] flex-1`} />
              <button name="status" value="DISMISSED" className="rounded-sm border border-basalt/20 px-3 py-1 text-xs">Dismiss</button>
              <button name="status" value="ACTIONED" className="rounded-sm bg-basalt px-3 py-1 text-xs text-limestone">Actioned</button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
