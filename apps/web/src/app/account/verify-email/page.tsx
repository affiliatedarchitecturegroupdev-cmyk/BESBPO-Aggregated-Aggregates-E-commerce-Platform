import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/account/Forms";
import { verifyEmail } from "../actions";

export const metadata: Metadata = { title: "Confirm Your Email Address", robots: { index: false } };

/**
 * The link in the "confirm your email address" email. Confirming takes a
 * click here (not the link itself), so email scanners that open links can't
 * confirm an address for someone.
 */
export default function VerifyEmailPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = (searchParams.token ?? "").slice(0, 200);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-basalt">Confirm your email address</h1>
      {token ? (
        <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6">
          <p className="mb-4 font-body text-sm text-slate">So your order confirmations, receipts and invoices reach you — and so you can reset your password if you need to.</p>
          <ActionForm action={verifyEmail}>
            <input type="hidden" name="token" value={token} />
            <SubmitButton>Confirm my email address</SubmitButton>
          </ActionForm>
          <p className="mt-4 font-body text-xs text-slate">
            <Link href="/account/dashboard" className="text-seam-blue hover:underline">Go to your account →</Link>
          </p>
        </div>
      ) : (
        <p className="mt-4 font-body text-sm text-slate">
          Open this page from the link in your email. Need a new one? <Link href="/account/dashboard" className="text-seam-blue hover:underline">Sign in</Link> and we&apos;ll send it.
        </p>
      )}
    </div>
  );
}
