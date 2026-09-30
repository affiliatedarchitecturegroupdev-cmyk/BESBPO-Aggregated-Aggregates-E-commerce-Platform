import Link from "next/link";
import { setSourceLicence } from "@/app/account/actions";
import { ActionForm, SubmitButton } from "@/components/account/Forms";
import { CORPORATE_EMAILS } from "@/data/corporate-contact";
import { api } from "@/lib/api";
import { getSession, sessionToken } from "@/lib/session";

export const metadata = { title: "Image permissions" };

type Source = {
  sourceName: string;
  sourceUrls: string[];
  notes: string[];
  products: { sku: string; name: string }[];
  imageIds: string[];
  cleared: number;
  pending: number;
};

const FILTERS = [
  { key: "pending", label: "Awaiting permission" },
  { key: "live", label: "Live" },
  { key: "all", label: "All" },
] as const;

function requestEmail(source: Source) {
  const products = source.products.map((p) => p.name).join(", ");
  return `Subject: Permission to use your product photos on aggregates.store

Hello ${source.sourceName.replace(/\s*\(.*\)$/, "")} team,

Aggregated Aggregates (a division of Besbpo Group (Pty) Ltd) is launching an online store for aggregates and building materials at aggregates.store.

We'd like your permission to use ${source.imageIds.length === 1 ? "a photo" : `${source.imageIds.length} photos`} from your website on our product pages for: ${products}.
${source.sourceUrls.length ? `\nThe photo${source.imageIds.length === 1 ? " is" : "s are"} from:\n${source.sourceUrls.map((u) => `- ${u}`).join("\n")}\n` : ""}
We're happy to credit you on the page, or to use different photos you'd prefer. If you'd rather we didn't use them, just let us know and we won't.

Kind regards,
Aggregated Aggregates
${CORPORATE_EMAILS.sales} · 087 265 2505`;
}

/**
 * Sourced product photography waits here until its owner agrees. Recording
 * permission for a source publishes all of its photos at once; withdrawing
 * hides them again. Staff uploads (our own photos) never appear here.
 */
export default async function ImagePermissionsPage({ searchParams }: { searchParams: { show?: string } }) {
  const [user, result] = await Promise.all([getSession(), api<Source[]>("/merchandising/image-sources", { token: sessionToken() })]);
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const isAdmin = user?.role === "ADMIN";
  const filter = FILTERS.find((f) => f.key === searchParams.show)?.key ?? "pending";
  const all = result.data;
  const shown = all.filter((s) => (filter === "pending" ? s.pending > 0 : filter === "live" ? s.cleared > 0 : true));
  const pendingPhotos = all.reduce((n, s) => n + s.pending, 0);
  const livePhotos = all.reduce((n, s) => n + s.cleared, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
        <h2 className="font-semibold text-basalt">Sourced product photos</h2>
        <p className="mt-1 text-xs text-slate">
          These photos were found on other companies&apos; websites. They&apos;re attached to products but stay hidden from
          the storefront until the owner agrees: email each source (a draft is on every card), then record their answer here.
          {isAdmin ? "" : " Only admins can record permission."} See PRODUCT_IMAGES.md for why each photo was chosen.
        </p>
        <p className="mt-3 font-mono text-[11px] text-slate">
          {all.length} sources · <span className="text-ochre-gold">{pendingPhotos} photos awaiting permission</span> · <span className="text-seam-blue">{livePhotos} live</span>
        </p>
      </section>

      <div className="flex flex-wrap gap-2 font-mono text-[11px]">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/image-permissions?show=${f.key}`}
            aria-current={f.key === filter ? "page" : undefined}
            className={`rounded-sm px-2.5 py-1 ${f.key === filter ? "bg-basalt text-limestone" : "bg-white text-slate"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="font-body text-sm text-slate">Nothing here.</p>
      ) : (
        <ul className="space-y-4">
          {shown.map((source) => (
            <li key={source.sourceName} className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-basalt">{source.sourceName}</h3>
                  <p className="font-mono text-[11px]">
                    {source.pending > 0 && <span className="text-ochre-gold">{source.pending} awaiting permission</span>}
                    {source.pending > 0 && source.cleared > 0 && " · "}
                    {source.cleared > 0 && <span className="text-seam-blue">{source.cleared} live</span>}
                  </p>
                </div>
                {isAdmin && (
                  <ActionForm action={setSourceLicence} className="flex flex-col items-end gap-2">
                    <input type="hidden" name="sourceName" value={source.sourceName} />
                    <input type="hidden" name="licence" value={source.pending > 0 ? "CLEARED" : "PERMISSION_PENDING"} />
                    <SubmitButton variant={source.pending > 0 ? "primary" : "subtle"}>
                      {source.pending > 0 ? `Permission received — publish ${source.pending}` : "Withdraw — hide these photos"}
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {source.imageIds.slice(0, 8).map((id) => (
                  // eslint-disable-next-line @next/next/no-img-element -- staff preview through the permission-aware image route
                  <img key={id} src={`/api/product-images/${id}`} alt="" className="h-16 w-24 rounded-sm bg-limestone object-cover" loading="lazy" />
                ))}
              </div>

              <p className="mt-3 text-xs text-slate">
                Used on:{" "}
                {source.products.map((p, i) => (
                  <span key={p.sku}>
                    {i > 0 && ", "}
                    <Link href={`/admin/products/${p.sku}`} className="text-seam-blue hover:underline">{p.name}</Link>
                  </span>
                ))}
              </p>
              {source.sourceUrls.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs">
                  {source.sourceUrls.map((url) => (
                    <li key={url} className="break-all">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-seam-blue hover:underline">{url}</a>
                    </li>
                  ))}
                </ul>
              )}
              {source.notes.length > 0 && <p className="mt-2 text-[11px] text-slate">{[...new Set(source.notes.flatMap((n) => n.split(" · ")))].join(" · ")}</p>}
              {source.pending > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-mono text-[11px] text-seam-blue">Permission request email (draft)</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-sm bg-limestone p-3 font-body text-xs text-basalt">{requestEmail(source)}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
