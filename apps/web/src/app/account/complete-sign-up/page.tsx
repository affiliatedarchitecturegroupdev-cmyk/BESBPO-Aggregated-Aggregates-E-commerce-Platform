import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field, SubmitButton } from "@/components/account/Forms";
import { isProvider, LABELS, PENDING_COOKIE } from "@/lib/oauth";
import { getSession, safeReturnPath } from "@/lib/session";
import { completeOAuthSignUp } from "../actions";

export const metadata: Metadata = { title: "Finish signing up", robots: { index: false } };

/** Instagram (and some X accounts) don't share an email address, so the person adds one here. */
export default async function CompleteSignUpPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeReturnPath(searchParams.next);
  if (await getSession()) redirect(next);
  let pending: { provider?: string; name?: string | null } | null = null;
  try {
    pending = JSON.parse(cookies().get(PENDING_COOKIE)?.value ?? "null");
  } catch {
    pending = null;
  }
  if (!pending?.provider || !isProvider(pending.provider)) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  const label = LABELS[pending.provider];
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-basalt">Finish signing up</h1>
      <p className="mt-1 font-body text-sm text-slate">
        {label} didn&apos;t share an email address with us. Add the one you&apos;d like your quotes, order confirmations and invoices sent to.
      </p>
      <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6">
        <ActionForm action={completeOAuthSignUp}>
          <input type="hidden" name="next" value={next} />
          <Field label="Full name" name="name" autoComplete="name" defaultValue={pending.name ?? ""} />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <SubmitButton>Create my account</SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-4 font-body text-sm text-slate">
        Changed your mind?{" "}
        <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="text-seam-blue hover:underline">
          Sign in another way
        </Link>
      </p>
    </div>
  );
}
