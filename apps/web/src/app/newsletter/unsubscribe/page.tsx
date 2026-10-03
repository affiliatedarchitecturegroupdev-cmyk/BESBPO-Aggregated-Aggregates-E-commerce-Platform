import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/account/Forms";
import { unsubscribeFromNewsletter } from "../actions";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

/**
 * The link at the bottom of every newsletter email. Unsubscribing takes a
 * click on this page (not the link itself), so email scanners that open
 * links can't unsubscribe anyone by accident.
 */
export default function UnsubscribePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = (searchParams.token ?? "").slice(0, 100);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-basalt">Unsubscribe from our newsletter</h1>
      {token ? (
        <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6">
          <p className="mb-4 font-body text-sm text-slate">Click below and we&apos;ll stop sending you the newsletter. Order and delivery emails aren&apos;t affected.</p>
          <ActionForm action={unsubscribeFromNewsletter}>
            <input type="hidden" name="token" value={token} />
            <SubmitButton>Unsubscribe me</SubmitButton>
          </ActionForm>
        </div>
      ) : (
        <p className="mt-4 font-body text-sm text-slate">Use the unsubscribe link at the bottom of any newsletter email.</p>
      )}
    </div>
  );
}
