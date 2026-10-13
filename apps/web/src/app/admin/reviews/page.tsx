import Link from "next/link";
import { Stars } from "@/components/reviews/Stars";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";
import { moderateReview } from "./actions";

export const metadata = { title: "Reviews" };

type StaffReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: "PUBLISHED" | "HIDDEN";
  hiddenReason: string | null;
  createdAt: string;
  updatedAt: string;
  product: { sku: string; name: string; slug: string };
  reviewer: { display: string; name: string | null; email: string };
  orderNumber: string | null;
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "PUBLISHED", label: "Published" },
  { key: "HIDDEN", label: "Hidden" },
] as const;

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

/**
 * Staff: every rating and review, newest first (PRODUCT_REVIEWS.md). Reviews
 * publish straight away (contact details are stripped automatically); hide one
 * that's abusive, off-topic or about something other than the product.
 */
export default async function AdminReviewsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = FILTERS.find((f) => f.key === searchParams.status)?.key ?? "ALL";
  const result = await api<StaffReview[]>(`/reviews/staff?status=${status}`, { token: sessionToken() });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const reviews = result.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-basalt">Ratings &amp; reviews</h2>
          <p className="font-body text-sm text-slate">
            Any signed-in customer can rate; written reviews need a paid order of the product. Reviews go live straight away with contact details removed —
            hide any that are abusive or not about the product.
          </p>
        </div>
        <nav className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/reviews?status=${f.key}`}
              className={`rounded-sm border px-3 py-1.5 font-body text-xs ${f.key === status ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-basalt hover:border-seam-blue"}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      {reviews.length === 0 ? (
        <p className="font-body text-sm text-slate">No reviews here yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className={`rounded-sm border bg-white p-4 ${r.status === "HIDDEN" ? "border-amber-300" : "border-basalt/10"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/products/${r.product.slug}#reviews`} className="font-body text-sm font-semibold text-seam-blue hover:underline">
                    {r.product.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 font-body text-xs text-slate">
                    <Stars rating={r.rating} />
                    <span>
                      {r.reviewer.display} ({r.reviewer.email}) · {day(r.createdAt)}
                      {r.orderNumber ? ` · order ${r.orderNumber}` : " · rating only"}
                    </span>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${r.status === "HIDDEN" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                  {r.status === "HIDDEN" ? "Hidden" : "Published"}
                </span>
              </div>
              {r.title && <p className="mt-2 font-body text-sm font-semibold text-basalt">{r.title}</p>}
              {r.body && <p className="mt-1 whitespace-pre-line font-body text-sm text-basalt">{r.body}</p>}
              {r.hiddenReason && <p className="mt-2 font-body text-xs text-amber-800">Hidden: {r.hiddenReason}</p>}
              <form action={moderateReview} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                {r.status === "PUBLISHED" ? (
                  <>
                    <input type="hidden" name="status" value="HIDDEN" />
                    <input name="reason" placeholder="Reason shown to the customer" maxLength={300} className="w-72 rounded-sm border border-basalt/20 px-2 py-1 font-body text-xs" />
                    <button className="rounded-sm border border-amber-600 px-3 py-1 font-body text-xs font-semibold text-amber-800 hover:bg-amber-50">Hide</button>
                  </>
                ) : (
                  <>
                    <input type="hidden" name="status" value="PUBLISHED" />
                    <button className="rounded-sm border border-seam-blue px-3 py-1 font-body text-xs font-semibold text-seam-blue hover:bg-seam-blue hover:text-limestone">Publish again</button>
                  </>
                )}
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
