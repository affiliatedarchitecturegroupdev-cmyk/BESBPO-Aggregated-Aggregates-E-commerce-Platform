const BADGES = [
  { label: "SANS 1200 / 1083 Graded", detail: "Reference standard shown on every graded product" },
  { label: "KZN + Gauteng Network", detail: "~50 approved partner suppliers, expanding to 7 provinces" },
  { label: "Trade Accounts Available", detail: "Contractor/Trade 8% and Volume/Civil Bulk 15% off list" },
  { label: "Besbpo Group Division", detail: "Delivered by Besfleet and 15+ tipper-truck partners" },
];

export function TrustBadges() {
  return (
    <section className="border-y border-basalt/10 bg-basalt">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {BADGES.map((badge) => (
          <div key={badge.label} className="flex gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ochre-gold" aria-hidden="true" />
            <div>
              <p className="font-body text-sm font-semibold text-limestone">{badge.label}</p>
              <p className="mt-1 font-body text-xs text-limestone/70">{badge.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
