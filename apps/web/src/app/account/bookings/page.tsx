import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";
import { StatusPill } from "@/components/bookings/BookingParts";
import { api } from "@/lib/api";
import { dateRange, type BookingSummary } from "@/lib/bookings";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "My Bookings", robots: { index: false } };

export default async function BookingsPage() {
  await requireSession("/account/bookings");
  const result = await api<BookingSummary[]>("/bookings/mine", { token: sessionToken() });
  const bookings = result.ok ? result.data : [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-basalt">Plant hire & service bookings</h1>
      <AccountNav current="/account/bookings" />
      {!result.ok && <p className="mt-6 font-body text-sm text-slate">{result.message}</p>}
      {result.ok && bookings.length === 0 && (
        <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6 font-body text-sm text-slate">
          <p>No bookings yet. When we quote a hire or service request, it appears here for you to accept and pay.</p>
          <p className="mt-3">
            <Link href="/plant-hire" className="font-semibold text-seam-blue hover:underline">Hire a machine</Link> ·{" "}
            <Link href="/services" className="font-semibold text-seam-blue hover:underline">Request a service</Link>
          </p>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {bookings.map((b) => (
          <li key={b.id}>
            <Link href={`/account/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-basalt/10 bg-white p-4 hover:border-seam-blue">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-slate">{b.reference} · {dateRange(b.startDate, b.endDate)} · {b.province}</p>
                <p className="mt-1 font-display text-base font-semibold text-basalt">{b.itemName}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-body text-sm font-semibold text-basalt">{formatZAR(Number(b.customerTotal))}</span>
                <StatusPill status={b.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
