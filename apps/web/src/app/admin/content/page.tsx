import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { saveSiteContent } from "@/app/account/actions";
import { savedContent } from "@/lib/admin-data";
import { HERO_SLIDESHOW_IMAGES, MEDIA_BY_ID } from "@/data/media";
import { DEFAULT_CONTENT, type Link } from "@/lib/cms";

export const metadata = { title: "Site content" };

const card = "rounded-sm border border-basalt/10 bg-white p-5";

function TextField({ label, name, value, max, long = false }: { label: string; name: string; value: string; max: number; long?: boolean }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase text-slate">{label}</span>
      {long ? (
        <textarea name={name} rows={3} maxLength={max} defaultValue={value} className={inputClass} />
      ) : (
        <input name={name} maxLength={max} defaultValue={value} className={inputClass} />
      )}
    </label>
  );
}

function LinkFields({ prefix, label, value, required = true }: { prefix: string; label: string; value?: Link; required?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="font-mono text-[10px] uppercase text-slate">{label} text</span>
        <input name={`${prefix}Label`} maxLength={40} required={required} defaultValue={value?.label ?? ""} className={inputClass} />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase text-slate">{label} link (/path or https://)</span>
        <input name={`${prefix}Href`} maxLength={300} required={required} defaultValue={value?.href ?? ""} className={inputClass} />
      </label>
    </div>
  );
}

export default async function ContentPage() {
  const saved = await savedContent();
  const content = { ...DEFAULT_CONTENT, ...(saved ?? {}) };
  return (
    <div className="space-y-6">
      <p className="font-body text-sm text-slate">Changes go live on the storefront within a minute. Blocks never saved show the built-in copy.</p>

      <section className={card}>
        <h2 className="font-body text-sm font-semibold text-basalt">Announcement bar</h2>
        <p className="font-body text-xs text-slate">A strip above the header on every page — e.g. holiday delivery cut-offs.</p>
        <ActionForm action={saveSiteContent} className="mt-4 space-y-3">
          <input type="hidden" name="key" value="announcement" />
          <label className="flex items-center gap-2 font-body text-sm text-basalt">
            <input type="checkbox" name="enabled" defaultChecked={content.announcement.enabled} className="h-4 w-4" /> Show the announcement
          </label>
          <TextField label="Message" name="message" value={content.announcement.message} max={200} />
          <LinkFields prefix="link" label="Optional link" value={content.announcement.link} required={false} />
          <SubmitButton>Publish</SubmitButton>
        </ActionForm>
      </section>

      <section className={card}>
        <h2 className="font-body text-sm font-semibold text-basalt">Homepage hero</h2>
        <ActionForm action={saveSiteContent} className="mt-4 space-y-3">
          <input type="hidden" name="key" value="hero" />
          <TextField label="Eyebrow" name="eyebrow" value={content.hero.eyebrow} max={40} />
          <TextField label="Headline" name="headline" value={content.hero.headline} max={80} />
          <TextField label="Body" name="body" value={content.hero.body} max={400} long />
          <LinkFields prefix="primary" label="Primary button" value={content.hero.primaryCta} />
          <LinkFields prefix="secondary" label="Secondary button" value={content.hero.secondaryCta} />
          <SubmitButton>Publish</SubmitButton>
        </ActionForm>
      </section>

      <section className={card}>
        <h2 className="font-body text-sm font-semibold text-basalt">Homepage slideshow</h2>
        <p className="font-body text-xs text-slate">
          The photo slideshow below the hero. Photos come from the licensed media library; untick a slide to hide it,
          change the numbers to reorder, or use the empty row to add one. Clear a caption to remove a slide.
        </p>
        <ActionForm action={saveSiteContent} className="mt-4 space-y-3">
          <input type="hidden" name="key" value="slideshow" />
          <div className="flex flex-wrap items-end gap-6">
            <label className="flex items-center gap-2 font-body text-sm text-basalt">
              <input type="checkbox" name="enabled" defaultChecked={content.slideshow.enabled} className="h-4 w-4" /> Show the slideshow
            </label>
            <label className="block w-40">
              <span className="font-mono text-[10px] uppercase text-slate">Seconds per slide</span>
              <input name="intervalSeconds" type="number" min={4} max={15} required defaultValue={content.slideshow.intervalSeconds} className={inputClass} />
            </label>
          </div>
          <div className="divide-y divide-basalt/5 rounded-sm border border-basalt/10">
            {[...content.slideshow.slides, { imageId: "", caption: "", href: "", enabled: true }].map((slide, i) => {
              const image = MEDIA_BY_ID.get(slide.imageId);
              return (
                <div key={i} className="grid items-end gap-3 p-3 sm:grid-cols-[64px_56px_1.2fr_2fr_1.4fr_auto]">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- media-library thumbnail
                    <img src={image.url.replace("w=1600", "w=160")} alt="" className="h-12 w-16 rounded-sm bg-basalt object-cover" />
                  ) : (
                    <span className="flex h-12 w-16 items-center justify-center rounded-sm bg-limestone font-mono text-[9px] text-slate">NEW</span>
                  )}
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase text-slate">Order</span>
                    <input name="slideOrder" type="number" defaultValue={i + 1} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase text-slate">Photo</span>
                    <select name="slideImage" defaultValue={slide.imageId} className={inputClass}>
                      <option value="">—</option>
                      {HERO_SLIDESHOW_IMAGES.map((img) => (
                        <option key={img.id} value={img.id}>{img.alt.slice(0, 48)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase text-slate">Caption</span>
                    <input name="slideCaption" maxLength={90} defaultValue={slide.caption} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase text-slate">Link (optional)</span>
                    <input name="slideHref" maxLength={300} defaultValue={slide.href ?? ""} placeholder="/products?category=…" className={inputClass} />
                  </label>
                  <label className="flex items-center gap-2 pb-2 font-body text-xs text-basalt">
                    <input type="checkbox" name="slideEnabled" value={i} defaultChecked={slide.enabled} className="h-4 w-4" /> Show
                  </label>
                </div>
              );
            })}
          </div>
          <SubmitButton>Publish</SubmitButton>
        </ActionForm>
      </section>

      <section className={card}>
        <h2 className="font-body text-sm font-semibold text-basalt">Trade account promo</h2>
        <ActionForm action={saveSiteContent} className="mt-4 space-y-3">
          <input type="hidden" name="key" value="promo" />
          <TextField label="Title" name="title" value={content.promo.title} max={80} />
          <TextField label="Body" name="body" value={content.promo.body} max={300} long />
          <LinkFields prefix="cta" label="Button" value={content.promo.cta} />
          <SubmitButton>Publish</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
