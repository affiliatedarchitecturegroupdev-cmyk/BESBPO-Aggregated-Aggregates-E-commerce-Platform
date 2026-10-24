import Link from "next/link";
import { CollectionForm, type CollectionValues } from "@/components/admin/CollectionForm";
import { CATEGORIES } from "@/data/categories";
import { DEPARTMENTS } from "@/data/departments";
import { api } from "@/lib/api";
import { resolveCollection, type Collection } from "@/lib/merchandising";
import { sessionToken } from "@/lib/session";
import { deleteCollection } from "./actions";

export const metadata = { title: "Collections" };

type StaffCollection = Collection & Required<Pick<CollectionValues, "id" | "isActive" | "sortOrder">> & { startsAt: string | null; endsAt: string | null };

function status(c: StaffCollection, now = new Date()) {
  if (!c.isActive) return { label: "Off", tone: "bg-basalt/10 text-basalt" };
  if (c.startsAt && new Date(c.startsAt) > now) return { label: "Scheduled", tone: "bg-ochre-gold/20 text-basalt" };
  if (c.endsAt && new Date(c.endsAt) <= now) return { label: "Ended", tone: "bg-basalt/10 text-slate" };
  return { label: "Live", tone: "bg-seam-blue/10 text-seam-blue" };
}
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" }) : null);
const placementLabel = (p: string) => (p === "HOMEPAGE" ? "Homepage" : (DEPARTMENTS.find((d) => `DEPARTMENT:${d.slug}` === p)?.name ?? p));

/**
 * Staff: Admin → Collections (ROADMAP 3.4, docs/merchandising.md). Curated product sets — hand-picked SKUs and/or
 * a rule over the catalogue — shown on the homepage, department pages and their own page between optional dates.
 */
export default async function AdminCollectionsPage({ searchParams }: { searchParams: { edit?: string } }) {
  const result = await api<StaffCollection[]>("/merchandising/staff/collections", { token: sessionToken() });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const collections = result.data;
  const editing = collections.find((c) => c.id === searchParams.edit);
  const departments = DEPARTMENTS.map((d) => ({ slug: d.slug, name: d.name }));
  const categories = CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <h2 className="font-display text-xl font-bold text-basalt">Collections</h2>
        <p className="mt-1 font-body text-sm text-slate">
          Build a campaign without code: pick products by SKU, or set a rule (search words, department, category, buy-online only, a price limit) — or both.
          Choose where it shows and, if it&apos;s seasonal, its dates. Hidden products never show, and a collection with no products shows nothing.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold text-basalt">{editing ? `Edit “${editing.title}”` : "New collection"}</h3>
        {editing && (
          <Link href="/admin/collections" className="font-body text-sm text-seam-blue hover:underline">
            ← New collection instead
          </Link>
        )}
        <CollectionForm key={editing?.id ?? "new"} values={editing ?? {}} departments={departments} categories={categories} />
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold text-basalt">All collections</h3>
        {collections.length === 0 ? (
          <p className="font-body text-sm text-slate">None yet.</p>
        ) : (
          <ul className="divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
            {collections.map((c) => {
              const s = status(c);
              const count = resolveCollection(c, new Set()).products.length;
              const dates = [date(c.startsAt), date(c.endsAt)];
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 font-body text-sm">
                  <div className="min-w-0">
                    <p>
                      <span className={`mr-2 rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${s.tone}`}>{s.label}</span>
                      <strong className="text-basalt">{c.title}</strong> <span className="font-mono text-[11px] text-slate">/collections/{c.slug}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate">
                      {count} product{count === 1 ? "" : "s"} · {c.placements.length ? c.placements.map(placementLabel).join(", ") : "Own page only"}
                      {(dates[0] || dates[1]) && ` · ${dates[0] ?? "now"} – ${dates[1] ?? "open-ended"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.label === "Live" && (
                      <Link href={`/collections/${c.slug}`} className="text-xs text-seam-blue hover:underline">
                        View
                      </Link>
                    )}
                    <Link href={`/admin/collections?edit=${c.id}`} className="text-xs font-semibold text-seam-blue hover:underline">
                      Edit
                    </Link>
                    <form action={deleteCollection}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-xs text-slate hover:text-basalt">Delete</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
