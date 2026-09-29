import Link from "next/link";
import {
  addNotificationRecipient,
  removeNotificationRecipient,
  resendNotification,
  sendTestEmail,
  updateNotificationSetting,
} from "@/app/account/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { getSession, sessionToken } from "@/lib/session";

export const metadata = { title: "Notifications" };

type Channels = { customerEmail: boolean; customerWhatsApp: boolean; staffEmail: boolean };
type Setting = Channels & { event: string; label: string; available: Channels };
type Status = {
  email: { provider: string | null; live: boolean; missingEnvVars: string[]; from: string | null };
  whatsapp: { live: boolean; missingEnvVars: string[]; language: string };
  staffRecipientCount: number;
  failed: number;
  logged: number;
};
type Recipients = { recipients: string[]; fromEnv: string[] };
type LogEntry = {
  id: string;
  event: string;
  channel: "EMAIL" | "WHATSAPP";
  audience: "CUSTOMER" | "STAFF";
  recipient: string;
  subject: string | null;
  body: string;
  templateName: string | null;
  status: "PENDING" | "SENT" | "LOGGED" | "FAILED";
  error: string | null;
  attempts: number;
  orderId: string | null;
  quoteId: string | null;
  createdAt: string;
  sentAt: string | null;
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "FAILED", label: "Failed" },
  { key: "LOGGED", label: "Logged (not sent)" },
  { key: "SENT", label: "Sent" },
] as const;

const STATUS_STYLE: Record<LogEntry["status"], string> = {
  SENT: "bg-seam-blue/10 text-seam-blue",
  LOGGED: "bg-limestone text-slate",
  FAILED: "bg-red-50 text-red-800",
  PENDING: "bg-ochre-gold/10 text-basalt",
};

const COLUMNS: { key: keyof Channels; label: string }[] = [
  { key: "customerEmail", label: "Customer email" },
  { key: "customerWhatsApp", label: "Customer WhatsApp" },
  { key: "staffEmail", label: "Staff email" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * What customers and staff are told, and when. Staff see the log and can
 * resend; admins choose the channels per event, the staff inboxes, and test
 * the email provider. Nothing here changes an order, quote or account.
 */
export default async function NotificationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const token = sessionToken();
  const filter = FILTERS.find((f) => f.key === searchParams.status)?.key ?? "";
  const [user, status, settings, recipients, log] = await Promise.all([
    getSession(),
    api<Status>("/notifications/status", { token }),
    api<Setting[]>("/notifications/settings", { token }),
    api<Recipients>("/notifications/recipients", { token }),
    api<LogEntry[]>(`/notifications?take=100${filter ? `&status=${filter}` : ""}`, { token }),
  ]);
  const isAdmin = user?.role === "ADMIN";
  if (!status.ok) return <p className="font-body text-sm text-slate">{status.message}</p>;
  const s = status.data;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Delivery status">
        <StatusCard
          title="Email"
          live={s.email.live}
          detail={s.email.live ? `Sending via ${s.email.provider} from ${s.email.from}` : "Not configured — emails are logged below, not sent."}
          needs={s.email.missingEnvVars}
        />
        <StatusCard
          title="WhatsApp"
          live={s.whatsapp.live}
          detail={s.whatsapp.live ? "Cloud API connected. Switch an event on below once Meta approves its template." : "Not configured — messages are logged, not sent."}
          needs={s.whatsapp.missingEnvVars}
        />
        <div className="rounded-sm border border-basalt/10 bg-white p-4">
          <p className="font-body text-sm font-semibold text-basalt">Needs attention</p>
          <p className="mt-1 font-body text-sm">
            <Link href="/admin/notifications?status=FAILED" className="text-seam-blue hover:underline">{s.failed} failed</Link> ·{" "}
            <Link href="/admin/notifications?status=LOGGED" className="text-seam-blue hover:underline">{s.logged} logged</Link>
          </p>
          <p className={`mt-1 font-mono text-[11px] ${s.staffRecipientCount ? "text-slate" : "text-ochre-gold"}`}>
            {s.staffRecipientCount ? s.staffRecipientCount === 1 ? "1 staff inbox gets alerts" : `${s.staffRecipientCount} staff inboxes get alerts` : "No staff inbox — alerts go nowhere"}
          </p>
        </div>
      </section>

      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">What gets sent</h2>
        <p className="font-body text-xs text-slate">
          Customer WhatsApp messages only go to buyers who ticked &ldquo;send me updates on WhatsApp&rdquo;, and only once
          Meta has approved the message template (see docs/notifications.md).{!isAdmin && " Only admins can change these."}
        </p>
        {settings.ok ? (
          <div className="mt-3 divide-y divide-basalt/5">
            <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-3 pb-2 font-mono text-[10px] uppercase text-slate md:grid">
              <span>Event</span>
              {COLUMNS.map((c) => (
                <span key={c.key}>{c.label}</span>
              ))}
              <span />
            </div>
            {settings.data.map((setting) => (
              <ActionForm key={setting.event} action={updateNotificationSetting} className="py-2">
                <div className="grid items-center gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
                <input type="hidden" name="event" value={setting.event} />
                <p className="font-body text-sm text-basalt">{setting.label}</p>
                {COLUMNS.map((c) =>
                  setting.available[c.key] ? (
                    <label key={c.key} className="flex items-center gap-2 font-body text-sm text-basalt">
                      <input type="hidden" name="available" value={c.key} />
                      <input type="checkbox" name={c.key} defaultChecked={setting[c.key]} disabled={!isAdmin} />
                      <span className="md:sr-only">{c.label}</span>
                    </label>
                  ) : (
                    <span key={c.key} className="hidden font-mono text-[11px] text-slate/60 md:inline" aria-label={`${c.label}: not used for this event`}>
                      —
                    </span>
                  ),
                )}
                {isAdmin ? <SubmitButton variant="subtle">Save</SubmitButton> : <span />}
                </div>
              </ActionForm>
            ))}
          </div>
        ) : (
          <p className="mt-3 font-body text-sm text-slate">{settings.message}</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">Staff inboxes</h2>
          <p className="font-body text-xs text-slate">New orders, quote requests and responses, and trade applications are emailed here.</p>
          {recipients.ok && (
            <ul className="mt-3 space-y-1 font-body text-sm">
              {recipients.data.recipients.map((email) => (
                <li key={email} className="flex items-center justify-between gap-3">
                  <span className="break-all">{email}</span>
                  {isAdmin && (
                    <form action={removeNotificationRecipient}>
                      <input type="hidden" name="email" value={email} />
                      <button type="submit" className="font-mono text-[11px] text-red-800 hover:underline">Remove</button>
                    </form>
                  )}
                </li>
              ))}
              {recipients.data.recipients.length === 0 &&
                (recipients.data.fromEnv.length ? (
                  <li className="text-slate">From STAFF_NOTIFICATION_EMAILS: {recipients.data.fromEnv.join(", ")}</li>
                ) : (
                  <li className="text-ochre-gold">None yet.</li>
                ))}
            </ul>
          )}
          {isAdmin && (
            <ActionForm action={addNotificationRecipient} className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block flex-1">
                <span className="font-mono text-[10px] uppercase text-slate">Add inbox</span>
                <input name="email" type="email" required placeholder="sales@besbpo.co.za" className={inputClass} />
              </label>
              <SubmitButton variant="subtle">Add</SubmitButton>
            </ActionForm>
          )}
        </section>

        {isAdmin && (
          <section className="rounded-sm border border-basalt/10 bg-white p-5">
            <h2 className="font-body text-sm font-semibold text-basalt">Test the email set-up</h2>
            <p className="font-body text-xs text-slate">
              Set EMAIL_PROVIDER (resend, postmark or sendgrid), EMAIL_API_KEY and EMAIL_FROM on the API service, then send
              yourself a test. Once it arrives, resend anything logged below.
            </p>
            <ActionForm action={sendTestEmail} className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block flex-1">
                <span className="font-mono text-[10px] uppercase text-slate">Send a test to</span>
                <input name="email" type="email" required defaultValue={user?.email} className={inputClass} />
              </label>
              <SubmitButton variant="subtle">Send test</SubmitButton>
            </ActionForm>
          </section>
        )}
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-body text-sm font-semibold text-basalt">Recent messages</h2>
          <div className="flex flex-wrap gap-2 font-mono text-[11px]">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key ? `/admin/notifications?status=${f.key}` : "/admin/notifications"}
                className={`rounded-sm px-2.5 py-1 ${f.key === filter ? "bg-basalt text-limestone" : "bg-white text-slate"}`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
        {!log.ok ? (
          <p className="mt-3 font-body text-sm text-slate">{log.message}</p>
        ) : log.data.length === 0 ? (
          <p className="mt-3 font-body text-sm text-slate">No messages here.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {log.data.map((n) => (
              <li key={n.id} className="rounded-sm border border-basalt/10 bg-white p-3 font-body text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 text-basalt">
                    <span className={`mr-2 rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${STATUS_STYLE[n.status]}`}>{n.status}</span>
                    <span className="font-semibold">{n.subject ?? n.templateName}</span>
                  </p>
                  <p className="font-mono text-[11px] text-slate">{when(n.createdAt)}</p>
                </div>
                <p className="mt-1 break-all font-mono text-[11px] text-slate">
                  {n.channel === "EMAIL" ? "Email" : "WhatsApp"} to {n.audience === "STAFF" ? "staff" : "customer"} · {n.recipient}
                  {n.attempts > 1 && ` · ${n.attempts} attempts`}
                  {n.orderId && (
                    <>
                      {" · "}
                      <Link href={`/orders/${n.orderId}/confirmation`} className="text-seam-blue hover:underline">order</Link>
                    </>
                  )}
                </p>
                {n.error && <p className="mt-1 break-words font-mono text-[11px] text-red-800">{n.error}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <details className="min-w-0 flex-1">
                    <summary className="cursor-pointer font-mono text-[11px] text-seam-blue">Show message</summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-sm bg-limestone p-3 font-body text-xs text-basalt">{n.body}</pre>
                  </details>
                  {(n.status === "FAILED" || n.status === "LOGGED") && (
                    <form action={resendNotification}>
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="rounded-sm border border-basalt/20 px-3 py-1 font-mono text-[11px] text-basalt hover:border-seam-blue">
                        Resend
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusCard({ title, live, detail, needs }: { title: string; live: boolean; detail: string; needs: string[] }) {
  return (
    <div className="rounded-sm border border-basalt/10 bg-white p-4">
      <p className="font-body text-sm font-semibold text-basalt">{title}</p>
      <p className={`font-mono text-[11px] ${live ? "text-seam-blue" : "text-ochre-gold"}`}>{live ? "Live" : "Not configured"}</p>
      <p className="mt-1 font-body text-xs text-slate">{detail}</p>
      {needs.length > 0 && <p className="mt-1 break-words font-mono text-[10px] text-slate">Needs: {needs.join(", ")}</p>}
    </div>
  );
}
