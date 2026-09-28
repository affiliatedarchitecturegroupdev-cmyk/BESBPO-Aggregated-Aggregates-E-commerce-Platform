import { closeWhatsAppConversation } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "WhatsApp orders" };

type Conversation = {
  id: string;
  phoneNumber: string;
  state: "CART_DRAFT" | "HANDED_TO_SALES" | "PAYMENT_LINK_SENT";
  draftCartJson: { requests?: string[] } | null;
  lastInboundText: string | null;
  lastMessageAt: string;
};

const STATE_LABEL: Record<Conversation["state"], string> = {
  CART_DRAFT: "Started an order",
  HANDED_TO_SALES: "Waiting for sales",
  PAYMENT_LINK_SENT: "Payment link sent",
};

/**
 * Open WhatsApp Commerce chats: what each customer asked for, ready for sales
 * to price with the normal pricing (Retail, bagged and small orders only).
 */
export default async function WhatsAppPage() {
  const result = await api<Conversation[]>("/channels/whatsapp/conversations", { token: sessionToken() });
  return (
    <div className="space-y-4">
      <p className="font-body text-sm text-slate">
        Chats arrive here once the WhatsApp Business webhook is connected (see the Render deployment guide). Reply in the
        WhatsApp Business app, then mark the chat done.
      </p>
      {!result.ok ? (
        <p className="font-body text-sm text-slate">{result.message}</p>
      ) : result.data.length === 0 ? (
        <p className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm text-slate">No open WhatsApp orders.</p>
      ) : (
        <ul className="space-y-3">
          {result.data.map((c) => (
            <li key={c.id} className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                {/^\d{6,15}$/.test(c.phoneNumber) ? (
                  <a href={`https://wa.me/${c.phoneNumber}`} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-seam-blue hover:underline">
                    +{c.phoneNumber}
                  </a>
                ) : (
                  <span className="font-mono font-semibold">{c.phoneNumber}</span>
                )}
                <span className="font-mono text-[11px] text-slate">
                  {STATE_LABEL[c.state]} · {new Date(c.lastMessageAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}
                </span>
              </div>
              <ul className="mt-2 list-disc pl-5 text-basalt">
                {(c.draftCartJson?.requests ?? [c.lastInboundText ?? ""]).filter(Boolean).map((request, i) => (
                  <li key={i}>{request}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-3">
                {(["PAID", "ABANDONED"] as const).map((state) => (
                  <form key={state} action={closeWhatsAppConversation}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="state" value={state} />
                    <button className="rounded-sm border border-basalt/20 px-3 py-1 text-xs text-basalt hover:bg-limestone">
                      {state === "PAID" ? "Mark done (paid)" : "Close (no order)"}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
