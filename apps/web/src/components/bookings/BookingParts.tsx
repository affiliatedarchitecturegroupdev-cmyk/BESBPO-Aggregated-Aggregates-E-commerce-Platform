import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import type { FormState } from "@/app/account/actions";
import { BOOKING_STATUS_LABEL, bookingDate, dateTime, statusTone, type BookingStatus, type DisputeRecord, type JobCard, type Message } from "@/lib/bookings";

export function StatusPill({ status }: { status: BookingStatus }) {
  return <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase ${statusTone(status)}`}>{BOOKING_STATUS_LABEL[status]}</span>;
}

export const panel = "rounded-sm border border-basalt/10 bg-white p-5";
export const label = "font-mono text-[10px] uppercase text-slate";

const SENDER: Record<Message["sender"], string> = { CUSTOMER: "Customer", PARTNER: "Partner", STAFF: "Aggregated Aggregates" };

/** In-platform chat. Contact details are removed by the API before anything is stored. */
export function Chat({
  messages,
  me,
  open,
  bookingId,
  action,
}: {
  messages: Message[];
  me: Message["sender"];
  open: boolean;
  bookingId: string;
  action: (prev: FormState, form: FormData) => Promise<FormState>;
}) {
  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-semibold text-basalt">Messages</h2>
      <p className="mt-1 font-body text-xs text-slate">Keep all messages here so we can help if anything goes wrong. Phone numbers, emails and links are removed automatically.</p>
      {messages.length === 0 ? (
        <p className="mt-4 font-body text-sm text-slate">No messages yet.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {messages.map((m) => (
            <li key={m.id} className={`max-w-[85%] rounded-sm p-3 font-body text-sm ${m.sender === me ? "ml-auto bg-seam-blue/10" : m.sender === "STAFF" ? "bg-ochre-gold/10" : "bg-limestone"}`}>
              <p className="font-mono text-[10px] uppercase text-slate">
                {m.sender === me ? "You" : SENDER[m.sender]} · {dateTime(m.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-line text-basalt">{m.body}</p>
            </li>
          ))}
        </ol>
      )}
      {open ? (
        <ActionForm action={action} className="mt-4 space-y-2">
          <input type="hidden" name="id" value={bookingId} />
          <label className="block">
            <span className="sr-only">Message</span>
            <textarea name="body" required maxLength={2000} rows={2} placeholder="Write a message…" className={inputClass} />
          </label>
          <SubmitButton variant="subtle">Send</SubmitButton>
        </ActionForm>
      ) : (
        <p className="mt-4 font-body text-xs text-slate">Chat opens once a partner is assigned.</p>
      )}
    </section>
  );
}

export function JobCards({ cards }: { cards: JobCard[] }) {
  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-semibold text-basalt">Job cards</h2>
      {cards.length === 0 ? (
        <p className="mt-2 font-body text-sm text-slate">The partner records hours, hour-meter readings or loads here each day.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] font-body text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase text-slate">
                <th className="py-1 pr-3">Date</th>
                <th className="py-1 pr-3">Hours</th>
                <th className="py-1 pr-3">Hour meter</th>
                <th className="py-1 pr-3">Loads</th>
                <th className="py-1">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-basalt/10">
              {cards.map((c) => (
                <tr key={c.id} className="align-top text-basalt">
                  <td className="py-2 pr-3">{bookingDate(c.workDate)}</td>
                  <td className="py-2 pr-3">{c.hoursWorked ?? "—"}</td>
                  <td className="py-2 pr-3">{c.startHourMeter !== null && c.endHourMeter !== null ? `${c.startHourMeter} → ${c.endHourMeter}` : "—"}</td>
                  <td className="py-2 pr-3">{c.loads ?? "—"}</td>
                  <td className="py-2 text-xs text-slate">{c.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function Disputes({ disputes }: { disputes: DisputeRecord[] }) {
  if (disputes.length === 0) return null;
  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-semibold text-basalt">Disputes</h2>
      <ul className="mt-3 space-y-3 font-body text-sm">
        {disputes.map((d) => (
          <li key={d.id} className="rounded-sm bg-limestone/60 p-3">
            <p className="font-mono text-[10px] uppercase text-slate">
              Raised by {d.raisedBy.toLowerCase()} · {dateTime(d.createdAt)} · {d.status === "OPEN" ? "Open" : d.outcome === "PAY_PARTNER" ? "Resolved — partner paid" : "Resolved — customer refunded"}
            </p>
            <p className="mt-1 text-basalt">{d.reason}</p>
            {d.resolution && <p className="mt-2 text-xs text-slate">Resolution: {d.resolution}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
