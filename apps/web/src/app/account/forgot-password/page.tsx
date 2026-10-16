import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "@/components/account/Forms";
import { forgotPassword } from "../actions";

export const metadata: Metadata = { title: "Forgot Your Password", robots: { index: false } };

/** Step 1 of a password reset: we email a one-time link (the answer never says whether the account exists). */
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-basalt">Forgot your password?</h1>
      <p className="mt-1 font-body text-sm text-slate">Enter the email address you sign in with and we&apos;ll email you a link to choose a new password.</p>
      <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6">
        <ActionForm action={forgotPassword}>
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <SubmitButton>Email me a reset link</SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-4 font-body text-sm text-slate">
        Signed up with Google, Microsoft, Facebook, X or Instagram? You can use that button on the{" "}
        <Link href="/account/login" className="text-seam-blue hover:underline">sign-in page</Link> — or set a password here too.
      </p>
    </div>
  );
}
