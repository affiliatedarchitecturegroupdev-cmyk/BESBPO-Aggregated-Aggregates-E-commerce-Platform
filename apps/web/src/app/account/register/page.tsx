import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field, MobileField, SubmitButton } from "@/components/account/Forms";
import { NewPasswordFields } from "@/components/account/NewPasswordFields";
import { OrDivider, SocialSignIn } from "@/components/account/SocialSignIn";
import { getSession, safeReturnPath } from "@/lib/session";
import { register } from "../actions";

export const metadata: Metadata = { title: "Create an Account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = safeReturnPath(searchParams.next);
  if (await getSession()) redirect(next);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-basalt">Create an account</h1>
      <p className="mt-1 font-body text-sm text-slate">
        Anyone can buy at list price. Contractors and civil buyers can apply for a trade account once signed in.
      </p>
      {searchParams.error && (
        <p role="alert" className="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800">
          {searchParams.error.slice(0, 300)}
        </p>
      )}
      <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6">
        <SocialSignIn next={next} />
        <OrDivider />
        <ActionForm action={register}>
          <input type="hidden" name="next" value={next} />
          <Field label="Full name" name="name" autoComplete="name" />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <MobileField required />
          <NewPasswordFields />
          <SubmitButton>Create account</SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-4 font-body text-sm text-slate">
        Already registered?{" "}
        <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="text-seam-blue hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
