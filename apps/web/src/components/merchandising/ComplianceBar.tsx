const STANDARDS = [
  { code: "SANS 1200-G", label: "Sub-base & base course grading (G1–G10)" },
  { code: "SANS 1083", label: "Concrete aggregate" },
  { code: "COLTO / TRH14", label: "Road-building material" },
];

// Trust bar — doubles as a credibility signal for B2B buyers scanning the
// homepage for compliance proof before they'll even open a product page.
export function ComplianceBar() {
  return (
    <section className="border-t border-limestone/10 bg-basalt px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {STANDARDS.map((standard) => (
          <div key={standard.code} className="flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold text-ochre-gold">{standard.code}</span>
            <span className="font-body text-xs text-limestone/80">{standard.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
