"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { issueQuotation, type IssueResult } from "@/app/admin/quotations/actions";

/**
 * Sending a quotation (docs/sales-quotes.md): email it with the PDF, or get
 * the client's link to share on WhatsApp. Each send makes a fresh link —
 * earlier links stop working — so the link is shown here, once.
 */
export function QuotationSendPanel({ id, status, email, phone, linkActive }: { id: string; status: string; email: string | null; phone: string | null; linkActive: boolean }) {
  const router = useRouter();
  const [result, setResult] = useState<IssueResult | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const send = (byEmail: boolean) =>
    start(async () => {
      setCopied(false);
      const issued = await issueQuotation(id, byEmail);
      setResult(issued);
      // The number and status in the header come from the server.
      if (issued.ok) router.refresh();
    });
  const draft = status === "DRAFT";
  return (
    <section className="rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-4 font-body text-sm text-basalt">
      <p className="font-semibold">{draft ? "Ready to send?" : status === "EXPIRED" ? "This quotation has expired" : "Sent — send it again or share the link"}</p>
      <p className="mt-1 text-xs text-slate">
        {status === "EXPIRED"
          ? "Save it again (with a new validity) before sending."
          : draft
            ? "Sending gives it its quotation number. The client gets a private link to view it, download the PDF, and accept and pay online."
            : linkActive
              ? "The client's link is live. Sending again makes a new link and the old one stops working."
              : "Send it to give the client a link."}
      </p>
      {status !== "EXPIRED" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !email}
            onClick={() => send(true)}
            className="rounded-sm bg-seam-blue px-4 py-2 font-semibold text-limestone hover:bg-basalt disabled:opacity-50"
            title={email ? undefined : "Add the client's email address first"}
          >
            {pending ? "Sending…" : `Email it${email ? ` to ${email}` : ""}`}
          </button>
          <button type="button" disabled={pending} onClick={() => send(false)} className="rounded-sm border border-basalt/20 bg-white px-4 py-2 font-semibold text-basalt hover:border-seam-blue disabled:opacity-50">
            Get link for WhatsApp
          </button>
        </div>
      )}
      {result && !result.ok && (
        <p role="alert" className="mt-3 text-xs text-red-800">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <div className="mt-3 space-y-2 rounded-sm border border-basalt/10 bg-white p-3 text-xs">
          <p>
            <span className="font-semibold">{result.quoteNumber}</span>
            {result.emailedTo ? ` emailed to ${result.emailedTo} with the PDF.` : " is ready to share."}
          </p>
          <p className="break-all font-mono text-[11px] text-slate">{result.url}</p>
          <div className="flex flex-wrap gap-2">
            <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" className="rounded-sm bg-[#1f7a45] px-3 py-1.5 font-semibold text-white hover:opacity-90">
              {phone ? "Open WhatsApp to the client" : "Open WhatsApp"}
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(result.whatsappText).then(() => setCopied(true))}
              className="rounded-sm border border-basalt/20 px-3 py-1.5 font-semibold text-basalt hover:border-seam-blue"
            >
              {copied ? "Copied" : "Copy message"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
