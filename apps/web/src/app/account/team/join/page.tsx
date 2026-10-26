import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvite } from "@/app/account/team/actions";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Join your company's account", robots: { index: false } };

type Preview = { companyName: string; email: string; roleLabel: string; invitedBy: string | null; expiresAt: string };

/** The link in a company-account invitation (docs/company-accounts.md): sign in with the invited email, then accept. */
export default async function JoinTeamPage({ searchParams }: { searchParams: { token?: string; error?: string } }) {
  const token = searchParams.token ?? "";
  const [preview, user] = await Promise.all([api<Preview>(`/company/invites/preview?token=${encodeURIComponent(token)}`), getSession()]);
  const here = `/account/team/join?token=${encodeURIComponent(token)}`;
  return (
    <div className="mx-auto max-w-xl px-4 py-12 font-body text-sm text-basalt">
      <h1 className="font-display text-2xl font-bold">Join your company&apos;s account</h1>
      {!preview.ok ? (
        <p className="mt-4 rounded-sm border border-red-700/30 bg-red-50 p-3 text-red-800">{preview.message}</p>
      ) : (
        <div className="mt-4 space-y-4 rounded-sm border border-basalt/10 bg-white p-5">
          <p>
            {preview.data.invitedBy ?? "Your colleague"} invited <strong>{preview.data.email}</strong> to <strong>{preview.data.companyName}</strong>&apos;s trade account as{" "}
            {preview.data.roleLabel.toLowerCase()}.
          </p>
          {searchParams.error && (
            <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 text-red-800">
              {searchParams.error}
            </p>
          )}
          {!user ? (
            <p>
              <Link href={`/account/login?next=${encodeURIComponent(here)}`} className="font-semibold text-seam-blue hover:underline">
                Sign in
              </Link>{" "}
              or{" "}
              <Link href={`/account/register?next=${encodeURIComponent(here)}`} className="font-semibold text-seam-blue hover:underline">
                create your account
              </Link>{" "}
              with {preview.data.email} to accept.
            </p>
          ) : user.email.toLowerCase() !== preview.data.email.toLowerCase() ? (
            <p>
              You&apos;re signed in as {user.email}. Sign out and sign in with {preview.data.email} to accept this invitation.
            </p>
          ) : (
            <form action={acceptInvite}>
              <input type="hidden" name="token" value={token} />
              <button className="rounded-sm bg-seam-blue px-4 py-2 font-semibold text-limestone hover:bg-basalt">Join {preview.data.companyName}</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
