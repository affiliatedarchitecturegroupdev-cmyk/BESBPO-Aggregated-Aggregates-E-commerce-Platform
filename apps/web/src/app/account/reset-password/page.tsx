import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "@/components/account/Forms";
import { resetPassword } from "../actions";

export const metadata: Metadata = { title: "Choose a New Password", robots: { index: false } };

/** Step 2 of a password reset: the page the emailed link opens. */
export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = (searchParams.token ?? "").slice(0, 200);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-basalt">Choose a new password</h1>
      {token ? (
        <>
          <p className="mt-1 font-body text-sm text-slate">Use at least 10 characters. Choosing a new password signs you out on every other device.</p>
          <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6">
            <ActionForm action={resetPassword}>
              <input type="hidden" name="token" value={token} />
              <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
              <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required />
              <SubmitButton>Save and sign in</SubmitButton>
            </ActionForm>
          </div>
        </>
      ) : (
        <p className="mt-4 font-body text-sm text-slate">
          Open this page from the link in your reset email, or <Link href="/account/forgot-password" className="text-seam-blue hover:underline">ask for a new link</Link>.
        </p>
      )}
    </div>
  );
}
