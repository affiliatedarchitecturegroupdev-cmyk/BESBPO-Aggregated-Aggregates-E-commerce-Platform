import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { saveSiteContent } from "@/app/account/actions";
import { savedContent } from "@/lib/admin-data";
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
