import { policyDate, type PolicyVersion } from "@/lib/legal-content";

/**
 * The dates under a legal page's title: when it was last updated, when it
 * was updated before that, and the full change history — so a recent edit
 * doesn't make a long-standing policy look new.
 */
export function PolicyDates({ versions }: { versions: PolicyVersion[] }) {
  const [latest, previous] = versions;
  const first = versions[versions.length - 1];
  return (
    <div className="mt-3 rounded-sm border border-basalt/10 bg-white px-4 py-3 font-body text-xs text-slate">
      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        <div className="flex gap-1.5">
          <dt className="font-mono uppercase">{previous ? "Last updated" : "Published"}</dt>
          <dd className="font-semibold text-basalt">
            <time dateTime={latest.date}>{policyDate(latest.date)}</time>
          </dd>
        </div>
        {previous && (
          <div className="flex gap-1.5">
            <dt className="font-mono uppercase">Previously updated</dt>
            <dd className="text-basalt">
              <time dateTime={previous.date}>{policyDate(previous.date)}</time>
            </dd>
          </div>
        )}
        {versions.length > 2 && (
          <div className="flex gap-1.5">
            <dt className="font-mono uppercase">First published</dt>
            <dd className="text-basalt">
              <time dateTime={first.date}>{policyDate(first.date)}</time>
            </dd>
          </div>
        )}
        <div className="flex gap-1.5">
          <dt className="font-mono uppercase">Version</dt>
          <dd className="text-basalt">{versions.length}</dd>
        </div>
      </dl>
      {versions.length > 1 && (
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold text-seam-blue">What changed</summary>
          <ol className="!mt-2 !list-none !space-y-1.5 !pl-0">
            {versions.map((v, i) => (
              <li key={v.date} className="flex gap-3">
                <time dateTime={v.date} className="w-44 shrink-0 font-mono">
                  v{versions.length - i} · {policyDate(v.date)}
                </time>
                <span>{v.changes}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
