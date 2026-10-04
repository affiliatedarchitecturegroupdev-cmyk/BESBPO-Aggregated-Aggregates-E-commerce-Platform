import { CORPORATE_SITE_URL, GROUP_SITE_URL } from "@/data/social";

const corporateHost = new URL(CORPORATE_SITE_URL).host;

/**
 * The slim strip above every page linking to Aggregated Aggregates'
 * corporate website — the store is the shop; the corporate site is the
 * company. (The footer links to it too.)
 */
export function CorporateBar() {
  return (
    <div className="bg-basalt text-limestone">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5">
        <p className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-limestone/60">
          <span className="sm:hidden">A Besbpo Group company</span>
          <span className="hidden sm:inline">
            Aggregated Aggregates · a{" "}
            <a href={GROUP_SITE_URL} target="_blank" rel="noopener" className="underline-offset-2 hover:text-limestone hover:underline">
              Besbpo Group
            </a>{" "}
            company
          </span>
        </p>
        <a
          href={CORPORATE_SITE_URL}
          target="_blank"
          rel="noopener"
          data-corporate-link="bar"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ochre-gold/50 px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ochre-gold transition-colors hover:bg-ochre-gold hover:text-basalt"
        >
          Corporate website
          <span aria-hidden="true" className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px motion-reduce:transition-none">↗</span>
          <span className="sr-only">({corporateHost}, opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}
