import { deletePromotion, savePromotion } from "@/app/account/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { HERO_SLIDESHOW_IMAGES } from "@/data/media";
import { api } from "@/lib/api";
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
};

const label = "font-mono text-[10px] uppercase text-slate";
/** A stored UTC instant as the South African calendar day, for date inputs. */
const saDay = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 2 * 3600_000).toISOString().slice(0, 10) : "");

function PromotionForm({ promotion, slot }: { promotion?: StoredPromotion; slot?: PromotionSlotKey }) {
  const image = resolveImage(promotion?.imageUrl);
  return (
    <ActionForm action={savePromotion} className="space-y-3">
      {promotion && <input type="hidden" name="id" value={promotion.id} />}
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- creative preview
          <img src={image.src} alt="" className="h-20 w-full rounded-sm bg-basalt object-cover" />
        ) : (
          <span className="flex h-20 items-center justify-center rounded-sm bg-limestone font-mono text-[9px] text-slate">NEW</span>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Slot</span>
            <select name="slot" defaultValue={promotion?.slot ?? slot} className={inputClass}>
              {PROMOTION_SLOTS.map((s) => (
                <option key={s.slot} value={s.slot}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Headline *</span>
            <input name="title" required minLength={3} maxLength={100} defaultValue={promotion?.title} className={inputClass} />
          </label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Image — library photo or https URL *</span>
          <input
            name="imageUrl"
            required
            list="media-library"
            defaultValue={promotion?.imageUrl ?? ""}
            placeholder="media:road-paving"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={label}>Link (/path or https://)</span>
          <input name="linkUrl" defaultValue={promotion?.linkUrl ?? ""} placeholder="/products?category=…" className={inputClass} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
 * The ad system: four banner slots. Each shows its first active promotion
 * (lowest order number) inside its date window; queue more to rotate them
 * by date.
 */
export default async function PromotionsPage() {
  const result = await api<StoredPromotion[]>("/promotions", { token: sessionToken() });
  const promotions = result.ok ? result.data : [];
  return (
    <div className="space-y-8">
      <datalist id="media-library">
        {HERO_SLIDESHOW_IMAGES.map((img) => (
          <option key={img.id} value={`media:${img.id}`}>{img.alt}</option>
        ))}
      </datalist>
      <p className="font-body text-sm text-slate">
        Creative is a photo from the licensed media library (start typing <code>media:</code>) or an https image URL. Each
        slot shows its active promotion with the lowest order number (the newest on a tie) inside its dates; changes go live
        within a minute.
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
                  <PromotionForm promotion={promotion} />
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
