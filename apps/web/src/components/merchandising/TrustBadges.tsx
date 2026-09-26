const BADGES = [
  { label: "SANS 1200 / 1083 Graded", detail: "Compliance documents attached per product" },
  { label: "KZN + Gauteng Network", detail: "~50 approved partner suppliers, expanding to 7 provinces" },
  { label: "Trade Accounts Available", detail: "Retail, Contractor/Trade, and Volume/Civil Bulk tiers" },
  { label: "Besbpo Group Division", detail: "Backed by Besbpo Group's built-environment ecosystem" },
];

export function TrustBadges() {
  return (
    <section className="border-y border-basalt/10 bg-basalt">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {BADGES.map((badge) => (
          <div key={badge.label}>
            <p className="font-body text-sm font-semibold text-ochre-gold">{badge.label}</p>
            <p className="mt-1 font-body text-xs text-limestone/70">{badge.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
