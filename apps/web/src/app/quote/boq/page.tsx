import type { Metadata } from "next";
import Link from "next/link";
import { BoqUpload } from "@/components/quote/BoqUpload";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Upload a Bill of Quantities",
  description: "Upload your BOQ as Excel or CSV — we match each line to our catalogue and quote delivered pricing within one business day.",
};

export default async function BoqPage() {
  const user = await getSession();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/quote" className="hover:text-seam-blue">Request a quote</Link> / Bill of quantities
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt">Upload a bill of quantities</h1>
      <p className="mt-2 max-w-3xl font-body text-sm text-slate">
        Got a BOQ from your QS or engineer? Upload it and we&apos;ll match each line to our catalogue. You check the matches, and our sales team quotes
        the lot — delivered, from the partner suppliers nearest your site. For a PDF BOQ, use the <Link href="/quote" className="text-seam-blue hover:underline">quote form</Link> and email the PDF to sales.
      </p>
      <div className="mt-6">
        <BoqUpload signedIn={Boolean(user)} email={user?.email} name={user?.name} />
      </div>
    </div>
  );
}
