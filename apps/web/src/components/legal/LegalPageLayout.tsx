import type { ReactNode } from "react";

export function LegalPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-4 font-body text-xs text-basalt">
        <strong>Drafting template.</strong> This page follows South African e-commerce and POPIA norms but has not
        been reviewed by Besbpo Group&apos;s legal counsel. Do not treat it as final legal advice — see
        AGENTIC_RULES.md rule 5.
      </div>
      <article
        className="prose-legal mt-8 space-y-4 font-body text-sm leading-relaxed text-basalt
        [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-basalt
        [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-basalt
        [&_p]:mt-3 [&_p]:text-slate
        [&_em]:font-mono [&_em]:text-xs [&_em]:not-italic [&_em]:text-slate
        [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5
        [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5
        [&_table]:mt-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left
        [&_th]:border-b [&_th]:border-basalt/20 [&_th]:py-2 [&_th]:font-semibold
        [&_td]:border-b [&_td]:border-basalt/10 [&_td]:py-2
        [&_a]:text-seam-blue [&_a]:underline"
      >
        {children}
      </article>
    </div>
  );
}
