import Link from "next/link";
import { TIMBER_FINISHES, TIMBER_GRADES, TIMBER_SECTIONS, TIMBER_TREATMENTS, timberVariant, type RoofingProduct } from "@/data/roofing";

const HINTS: Record<string, string> = {
  S5: "Standard roof grade",
  S7: "Stronger — when specified",
  H2: "Under cover · budget",
  H3: "Exposed to weather",
  Sized: "Planed to size",
  "Rough-sawn": "Off the saw",
};

function Option({ href, active, label }: { href: string | null; active: boolean; label: string }) {
  const body = (
    <>
      <span className="block font-semibold">{label}</span>
      {HINTS[label] && <span className={`block text-[10px] ${active ? "text-limestone/80" : "text-slate"}`}>{HINTS[label]}</span>}
    </>
  );
  const cls = "rounded-sm border px-3 py-1.5 text-left font-body text-xs";
  if (active) return <span className={`${cls} border-seam-blue bg-seam-blue text-limestone`} aria-current="true">{body}</span>;
  if (!href) return null;
  return (
    <Link href={href} className={`${cls} border-basalt/20 bg-white text-basalt hover:border-seam-blue`}>
      {body}
    </Link>
  );
}

/**
 * Switches between the timber products that share a section: each choice is
 * its own product page (SKU), so the links swap one attribute and keep the rest.
 */
export function TimberVariantPicker({ product }: { product: RoofingProduct }) {
  const { section, timberGrade: grade, timberTreatment: treatment, timberFinish: finish } = product;
  if (!section || !grade || !treatment || !finish) return null;
  const href = (s: string, g: string, t: string, f: string) => {
    const match = timberVariant(s, g, t, f);
    return match ? `/products/${match.slug}` : null;
  };

  return (
    <div className="space-y-3 rounded-sm border border-basalt/10 bg-white p-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Section (thickness × width)</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TIMBER_SECTIONS.map((s) => (
            <Option key={s} label={s} active={s === section} href={href(s, grade, treatment, finish)} />
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Strength grade</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TIMBER_GRADES.map((g) => (
              <Option key={g} label={g} active={g === grade} href={href(section, g, treatment, finish)} />
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Treatment</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TIMBER_TREATMENTS.map((t) => (
              <Option key={t} label={t} active={t === treatment} href={href(section, grade, t, finish)} />
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Profile</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TIMBER_FINISHES.map((f) => (
              <Option key={f} label={f} active={f === finish} href={href(section, grade, treatment, f)} />
            ))}
          </div>
        </div>
      </div>
      <p className="font-body text-[11px] text-slate">
        Not sure? <Link href="/roofing#roof-timber" className="text-seam-blue underline">The roof timber guide</Link> explains sizes, grades and treatment.
      </p>
    </div>
  );
}
