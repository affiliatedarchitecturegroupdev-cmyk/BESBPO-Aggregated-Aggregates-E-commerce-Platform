import { deleteMedia, deletePromotion, savePromotion, uploadMedia } from "@/app/account/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { CATEGORIES } from "@/data/categories";
import { INDUSTRIES } from "@/data/industries";
import { HERO_SLIDESHOW_IMAGES } from "@/data/media";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { PROMOTION_SLOTS, resolveImage, type PromotionSlotKey } from "@/lib/promotions";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Promotions" };

type StoredPromotion = {
  id: string;
  slot: PromotionSlotKey;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
  categorySlug: string | null;
  industrySlug: string | null;
};

type MediaAsset = { id: string; label: string; contentType: string; sizeBytes: number; createdAt: string };

type Stats = {
  since: string;
  days: number;
  promotions: {
    id: string;
    slot: PromotionSlotKey;
    title: string;
    isActive: boolean;
    categorySlug: string | null;
    industrySlug: string | null;
    impressions: number;
    clicks: number;
    clickThroughRate: number | null;
    daily: { day: string; impressions: number; clicks: number }[];
  }[];
};

const label = "font-mono text-[10px] uppercase text-slate";
/** A stored UTC instant as the South African calendar day, for date inputs. */
const saDay = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 2 * 3600_000).toISOString().slice(0, 10) : "");
const SLOT_LABEL = Object.fromEntries(PROMOTION_SLOTS.map((s) => [s.slot, s.label]));

function targetLabel(p: { categorySlug: string | null; industrySlug: string | null }) {
  if (p.categorySlug) return `Category: ${CATEGORIES.find((c) => c.slug === p.categorySlug)?.name ?? p.categorySlug}`;
  if (p.industrySlug) return `Industry: ${INDUSTRIES.find((i) => i.slug === p.industrySlug)?.name ?? p.industrySlug}`;
  return null;
}

function PromotionForm({ promotion, slot }: { promotion?: StoredPromotion; slot: PromotionSlotKey }) {
  const image = resolveImage(promotion?.imageUrl);
  const target = promotion?.categorySlug ? `category:${promotion.categorySlug}` : promotion?.industrySlug ? `industry:${promotion.industrySlug}` : "";
  return (
    <ActionForm action={savePromotion} className="space-y-3">
      {promotion && <input type="hidden" name="id" value={promotion.id} />}
      <input type="hidden" name="slot" value={promotion?.slot ?? slot} />
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- creative preview
          <img src={image.src} alt="" className="h-20 w-full rounded-sm bg-basalt object-cover" />
        ) : (
          <span className="flex h-20 items-center justify-center rounded-sm bg-limestone font-mono text-[9px] text-slate">NEW</span>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={label}>Headline *</span>
            <input name="title" required minLength={3} maxLength={100} defaultValue={promotion?.title} className={inputClass} />
          </label>
          <label className="block">
            <span className={label}>Image — library, upload or https URL *</span>
            <input name="imageUrl" required list="promo-images" defaultValue={promotion?.imageUrl ?? ""} placeholder="media:road-paving" className={inputClass} />
          </label>
          <label className="block">
            <span className={label}>Link (/path or https://)</span>
            <input name="linkUrl" defaultValue={promotion?.linkUrl ?? ""} placeholder="/products?category=…" className={inputClass} />
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(promotion?.slot ?? slot) === "CATEGORY_TOP_BANNER" && (
          <label className="col-span-2 block">
            <span className={label}>Show on</span>
            <select name="target" defaultValue={target} className={inputClass}>
              <option value="">Every category and industry listing</option>
              <optgroup label="One category">
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={`category:${c.slug}`}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="One industry">
                {INDUSTRIES.map((i) => (
                  <option key={i.slug} value={`industry:${i.slug}`}>{i.name}</option>
                ))}
              </optgroup>
            </select>
          </label>
        )}
        <label className="block">
          <span className={label}>Starts (optional)</span>
          <input name="startsAt" type="date" defaultValue={saDay(promotion?.startsAt ?? null)} className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Ends (optional)</span>
          <input name="endsAt" type="date" defaultValue={saDay(promotion?.endsAt ?? null)} className={inputClass} />
        </label>
        <label className="block">
          <span className={label}>Order in slot</span>
          <input name="sortOrder" type="number" min={0} max={999} defaultValue={promotion?.sortOrder ?? 0} className={inputClass} />
        </label>
        <label className="flex items-end gap-2 pb-2 font-body text-sm text-basalt">
          <input type="checkbox" name="isActive" defaultChecked={promotion?.isActive ?? true} className="h-4 w-4" /> Active
        </label>
      </div>
      <SubmitButton>{promotion ? "Save" : "Add promotion"}</SubmitButton>
    </ActionForm>
  );
}

/**
 * The ad system: four banner slots. Each shows its active promotion with the
 * lowest order number (the newest on a tie) inside its dates. The category
 * banner can target one category or industry; targeted creative beats
 * untargeted on that listing. Impressions and clicks are counted per day.
 */
export default async function PromotionsPage({ searchParams }: { searchParams: { days?: string } }) {
  const token = sessionToken();
  const days = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
  const [result, media, stats] = await Promise.all([
    api<StoredPromotion[]>("/promotions", { token }),
    api<MediaAsset[]>("/media", { token }),
    api<Stats>(`/promotions/stats?days=${days}`, { token }),
  ]);
  const promotions = result.ok ? result.data : [];
  const uploads = media.ok ? media.data : [];
  return (
    <div className="space-y-8">
      <datalist id="promo-images">
        {uploads.map((m) => (
          <option key={m.id} value={`upload:${m.id}`}>{m.label} (upload)</option>
        ))}
        {HERO_SLIDESHOW_IMAGES.map((img) => (
          <option key={img.id} value={`media:${img.id}`}>{img.alt}</option>
        ))}
      </datalist>

      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-body text-sm font-semibold text-basalt">Performance</h2>
          <div className="flex gap-2 font-mono text-[11px]">
            {[7, 30, 90].map((d) => (
              <a key={d} href={`/admin/promotions?days=${d}`} className={`rounded-sm px-2.5 py-1 ${d === days ? "bg-basalt text-limestone" : "bg-limestone text-slate"}`}>
                {d} days
              </a>
            ))}
          </div>
        </div>
        <p className="font-body text-xs text-slate">
          An impression is a banner at least half on screen, counted once per visit; crawlers and link previews aren&apos;t
          counted. Counts only — nothing about the visitor is stored.
        </p>
        {!stats.ok ? (
          <p className="mt-3 font-body text-sm text-slate">{stats.message}</p>
        ) : (
          <table className="mt-3 w-full text-left font-body text-sm">
            <thead>
              <tr className="border-b border-basalt/10 text-xs text-slate">
                <th className="py-2">Promotion</th>
                <th>Slot</th>
                <th className="text-right">Impressions</th>
                <th className="text-right">Clicks</th>
                <th className="text-right">Click-through</th>
              </tr>
            </thead>
            <tbody>
              {stats.data.promotions.map((p) => (
                <tr key={p.id} className="border-b border-basalt/5">
                  <td className="py-2 pr-2">
                    {p.title}
                    {!p.isActive && <span className="ml-2 font-mono text-[10px] text-slate">(off)</span>}
                    {targetLabel(p) && <span className="block font-mono text-[10px] text-slate">{targetLabel(p)}</span>}
                  </td>
                  <td className="text-xs text-slate">{SLOT_LABEL[p.slot]}</td>
                  <td className="text-right tabular-nums">{p.impressions.toLocaleString("en-US")}</td>
                  <td className="text-right tabular-nums">{p.clicks.toLocaleString("en-US")}</td>
                  <td className="text-right tabular-nums">{p.clickThroughRate === null ? "—" : `${p.clickThroughRate.toFixed(2)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Image library</h2>
        <p className="font-body text-xs text-slate">
          Upload campaign creative (PNG, JPEG or WebP, up to 5MB), then pick it in any promotion or blog cover as{" "}
          <code>upload:…</code>. Wide images (about 3:1) suit the banners.
        </p>
        <ActionForm action={uploadMedia} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className={label}>Name *</span>
            <input name="label" required maxLength={120} placeholder="e.g. Spring stone special" className={inputClass} />
          </label>
          <label className="block">
            <span className={label}>Image *</span>
            <input name="file" type="file" required accept="image/png,image/jpeg,image/webp" className="mt-1 block w-full font-body text-sm" />
          </label>
          <SubmitButton>Upload</SubmitButton>
        </ActionForm>
        {uploads.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {uploads.map((m) => (
              <li key={m.id} className="rounded-sm border border-basalt/10 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded creative */}
                <img src={`/api/media/${m.id}`} alt="" className="h-20 w-full rounded-sm bg-basalt object-cover" />
                <p className="mt-1 truncate font-body text-xs text-basalt">{m.label}</p>
                <p className="font-mono text-[10px] text-slate">upload:{m.id}</p>
                <p className="font-mono text-[10px] text-slate">{formatDate(m.createdAt)}</p>
                <form action={deleteMedia}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="font-body text-[11px] text-slate hover:text-red-700">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="font-body text-sm text-slate">
        Each slot shows its active promotion with the lowest order number (the newest on a tie) inside its dates; changes
        go live within a minute.
      </p>
      {!result.ok && <p className="font-body text-sm text-red-800">{result.message}</p>}
      {PROMOTION_SLOTS.map((slot) => {
        const inSlot = promotions.filter((p) => p.slot === slot.slot);
        return (
          <section key={slot.slot} className="rounded-sm border border-basalt/10 bg-white p-5">
            <h2 className="font-body text-sm font-semibold text-basalt">{slot.label}</h2>
            <p className="font-body text-xs text-slate">{slot.where}</p>
            <div className="mt-4 space-y-6">
              {inSlot.map((promotion) => (
                <div key={promotion.id} className="border-t border-basalt/5 pt-4">
                  <PromotionForm promotion={promotion} slot={slot.slot} />
                  <form action={deletePromotion} className="mt-2">
                    <input type="hidden" name="id" value={promotion.id} />
                    <button className="font-body text-xs text-slate hover:text-red-700">Delete</button>
                  </form>
                </div>
              ))}
              <details className="border-t border-basalt/5 pt-4">
                <summary className="cursor-pointer font-body text-sm font-semibold text-seam-blue">+ Add a promotion to this slot</summary>
                <div className="mt-3">
                  <PromotionForm slot={slot.slot} />
                </div>
              </details>
            </div>
          </section>
        );
      })}
    </div>
  );
}
