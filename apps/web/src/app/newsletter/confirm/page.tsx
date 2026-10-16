import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/account/Forms";
import { confirmNewsletter } from "../actions";

export const metadata: Metadata = { title: "Confirm Your Subscription", robots: { index: false } };

/**
 * Double opt-in: the link in the newsletter confirmation email. Confirming
 * takes a click here, so email scanners that open links can't subscribe
 * anyone.
 */
export default function ConfirmSubscriptionPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = (searchParams.token ?? "").slice(0, 100);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-basalt">Confirm your subscription</h1>
      {token ? (
        <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6">
          <p className="mb-4 font-body text-sm text-slate">
            One click and you&apos;ll get the Aggregated Aggregates newsletter — price updates, new products and suppliers, delivery coverage and site-ready
            advice, about twice a month. Unsubscribe from any email.
          </p>
          <ActionForm action={confirmNewsletter}>
            <input type="hidden" name="token" value={token} />
            <SubmitButton>Yes, subscribe me</SubmitButton>
          </ActionForm>
        </div>
      ) : (
        <p className="mt-4 font-body text-sm text-slate">Use the link in the confirmation email we sent you.</p>
      )}
    </div>
  );
}
