import Link from "next/link";
import { ExpressCountdown } from "@/components/orders/ExpressCountdown";
import { formatTimeZA, type OrderRecord } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";

/** The buyer's view of an AA 60/120 order: what happens next, or how it went. */
export function ExpressStatusCard({ order }: { order: OrderRecord }) {
  const x = order.express;
  if (!x) return null;
  const fee = formatZAR(Number(order.expressFee ?? 0) || 1000);
  const message: Record<typeof x.outcome, React.ReactNode> = {
    AWAITING_PAYMENT: <>Pay by card or PayFast below. Once payment is in, our sales team confirms a supplier, then there&apos;s 20 minutes&apos; loading prep and the 120-minute clock starts.</>,
    AWAITING_ACCEPTANCE: <>Payment received — our sales team is confirming a supplier now. We&apos;ll email you the time it&apos;s due as soon as the clock starts.</>,
    IN_PROGRESS:
      x.clockStartsAt && x.dueAt && x.refundAfter ? (
        <>
          <ExpressCountdown clockStartsAt={x.clockStartsAt} dueAt={x.dueAt} refundAfter={x.refundAfter} />. Please have someone on site to receive it.
        </>
      ) : null,
    ON_TIME: <>Delivered on time{x.dueAt ? ` (due by ${formatTimeZA(x.dueAt)})` : ""}. Thank you for using AA 60/120.</>,
    LATE: <>Delivered a little after the 120 minutes, within the hour&apos;s grace — we&apos;re sorry for the wait.</>,
    REFUND_DUE: <>We were more than an hour late — we&apos;re refunding the {fee} express fee in full to the card or account you paid from.</>,
    DECLINED:
      Number(order.expressFee) > 0 ? (
        <>We couldn&apos;t take this order on AA 60/120{order.expressNote ? ` — ${order.expressNote}` : ""}. It comes by standard delivery and the {fee} express fee is being refunded in full.</>
      ) : (
        <>We couldn&apos;t take this order on AA 60/120{order.expressNote ? ` — ${order.expressNote}` : ""}. It comes by standard delivery, and the express fee has been taken off your total.</>
      ),
    CANCELLED: <>This order was cancelled.</>,
  };
  return (
    <section className="mt-6 rounded-sm border border-ochre-gold bg-ochre-gold/10 p-4 font-body text-sm text-basalt" aria-label="AA 60/120 express delivery">
      <p className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm bg-ochre-gold px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">AA 60/120</span>
        <span className="font-semibold">Express delivery</span>
      </p>
      <p className="mt-2">{message[x.outcome]}</p>
      {x.outcome === "IN_PROGRESS" && order.expressNote && <p className="mt-1 text-xs text-slate">{order.expressNote}</p>}
      <p className="mt-2 text-xs text-slate">
        <Link href="/aa-60-120" className="text-seam-blue hover:underline">How AA 60/120 works</Link> ·{" "}
        <Link href="/legal/shipping-delivery#aa-60-120-express-delivery" className="text-seam-blue hover:underline">Express delivery terms</Link>
      </p>
    </section>
  );
}
