import Link from "next/link";
import type { PromoContent } from "@/lib/cms";

export function PromoStrip({ content }: { content: PromoContent }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col items-center justify-between gap-4 rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-6 sm:flex-row">
        <div>
          <p className="font-body text-sm font-semibold text-basalt">{content.title}</p>
          <p className="mt-1 font-body text-xs text-slate">{content.body}</p>
        </div>
        <Link
          href={content.cta.href}
          className="whitespace-nowrap rounded-sm bg-basalt px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-seam-blue"
        >
          {content.cta.label}
        </Link>
      </div>
    </section>
  );
}
