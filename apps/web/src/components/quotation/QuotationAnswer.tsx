"use client";

import { useFormState, useFormStatus } from "react-dom";
import { acceptQuotation, declineQuotation } from "@/app/quotation/[token]/actions";

function Submit({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        primary
          ? "rounded-sm bg-seam-blue px-5 py-3 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-50"
          : "rounded-sm border border-basalt/20 bg-white px-5 py-3 font-body text-sm font-semibold text-basalt hover:border-seam-blue disabled:opacity-50"
      }
    >
      {pending ? "One moment…" : children}
    </button>
  );
}

/** Accept and pay, or decline — the client's answer to a sales quotation. */
export function QuotationAnswer({ token, total, canDecline }: { token: string; total: string; canDecline: boolean }) {
  const [accepted, accept] = useFormState(acceptQuotation, null);
  const [declined, decline] = useFormState(declineQuotation, null);
  if (declined?.declined) return <p className="font-body text-sm text-slate">Thanks for letting us know — we&apos;ve told our sales team. Contact us any time if you&apos;d like an updated quotation.</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <form action={accept}>
          <input type="hidden" name="token" value={token} />
          <Submit primary>Accept and pay {total}</Submit>
        </form>
        {canDecline && (
          <form action={decline}>
            <input type="hidden" name="token" value={token} />
            <Submit>Decline</Submit>
          </form>
        )}
      </div>
      {(accepted?.error || declined?.error) && (
        <p role="alert" className="font-body text-sm text-red-800">
          {accepted?.error ?? declined?.error}
        </p>
      )}
      <p className="font-body text-xs text-slate">Accepting places your order at these prices. You choose how to pay on the next page — card, instant EFT and more — or pay by EFT later.</p>
    </div>
  );
}
