import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/account/Forms";
import { ChartCard, DataTable, Unavailable } from "@/components/insights/Parts";
import { api } from "@/lib/api";
import { formatDay } from "@/lib/insights";
import { getSession, sessionToken } from "@/lib/session";
import { sendDigestToMe } from "../actions";

export const metadata = { title: "Weekly email" };

type Preview = {
  week: { from: string; to: string };
  recipients: string[];
  subject: string;
  html: string;
  history: { weekStart: string; claimedAt: string; sentAt: string | null; recipients: number; error: string | null }[];
};

/**
 * Admin-only: the Monday summary email — what last week's will say, who gets
 * it (every admin), and when it was sent. It carries cost and profit, so it
 * never goes to the staff notification inboxes.
 */
export default async function WeeklyEmailPage() {
  const user = await getSession();
  if (user?.role !== "ADMIN") notFound();
  const res = await api<Preview>("/insights/digest", { token: sessionToken() });
  if (!res.ok) return <Unavailable message={res.message} />;
  const p = res.data;
  const when = (iso: string) => new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });

  return (
    <div className="space-y-4">
      <section className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-basalt">
        <h3 className="font-display text-base font-semibold">Monday summary email</h3>
        <p className="mt-1 max-w-3xl text-slate">
          Every Monday from 07:00 (South African time), each admin gets last week&apos;s figures against the week before: sales, profit, best sellers, provinces, the
          pipeline, and anything that makes the profit figures incomplete. It includes cost and profit, so it only goes to admins — not to the staff notification
          inboxes. Switch it off under <Link href="/admin/notifications" className="text-seam-blue underline">Notifications</Link> (&ldquo;Weekly sales &amp; profit summary&rdquo;).
        </p>
        <p className="mt-3">
          <span className="text-slate">Goes to: </span>
          {p.recipients.length ? p.recipients.join(", ") : "no admins yet"}
        </p>
        <div className="mt-3">
          <ActionForm action={sendDigestToMe} className="space-y-2">
            <SubmitButton variant="subtle">Send last week&apos;s email to me now</SubmitButton>
          </ActionForm>
        </div>
      </section>
      <ChartCard title={p.subject} subtitle={`Preview for ${formatDay(p.week.from)} – ${formatDay(p.week.to)}, as it will be sent`}>
        <iframe title="Weekly email preview" srcDoc={p.html} sandbox="" className="h-[900px] w-full rounded-sm border border-basalt/10 bg-limestone" />
      </ChartCard>
      <ChartCard title="Sent">
        <DataTable
          rows={p.history}
          empty="Not sent yet — the first one goes out next Monday at 07:00."
          columns={[
            { key: "w", label: "Week of", render: (h) => formatDay(h.weekStart.slice(0, 10)) },
            { key: "s", label: "Sent", render: (h) => (h.sentAt ? when(h.sentAt) : h.error ? "Failed" : "Sending…") },
            { key: "r", label: "Admins", numeric: true, render: (h) => String(h.recipients) },
            { key: "e", label: "Problem", render: (h) => h.error ?? "" },
          ]}
        />
      </ChartCard>
    </div>
  );
}
