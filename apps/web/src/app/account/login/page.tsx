import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field, SubmitButton } from "@/components/account/Forms";
import { getSession, safeReturnPath } from "@/lib/session";
import { login } from "../actions";

export const metadata: Metadata = { title: "Sign In", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeReturnPath(searchParams.next);
  if (await getSession()) redirect(next);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-basalt">Sign in</h1>
      <p className="mt-1 font-body text-sm text-slate">Track quotes, manage delivery addresses and see your trade pricing.</p>
      <div className="mt-8 rounded-sm border border-basalt/10 bg-white p-6">
        <ActionForm action={login}>
          <input type="hidden" name="next" value={next} />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
          <SubmitButton>Sign in</SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-4 font-body text-sm text-slate">
        New here?{" "}
        <Link href={`/account/register?next=${encodeURIComponent(next)}`} className="text-seam-blue hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
