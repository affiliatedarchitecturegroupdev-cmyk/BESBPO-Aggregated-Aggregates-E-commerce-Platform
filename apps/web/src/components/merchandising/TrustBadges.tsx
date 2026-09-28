import { CUSTOMER_TIERS } from "@/data/catalogue";

const pct = (name: string) => Math.round((CUSTOMER_TIERS.find((t) => t.name === name)?.discount ?? 0) * 100);

export function TrustBadges({ partnerSuppliers, liveProvinces }: { partnerSuppliers: number | null; liveProvinces: string[] }) {
  const badges = [
    { label: "SANS 1200 / 1083 Graded", detail: "Reference standard shown on every graded product" },
    {
      label: `${liveProvinces.length > 0 ? liveProvinces.join(" + ") : "KZN + Gauteng"} Network`,
      detail: partnerSuppliers
        ? `${partnerSuppliers} approved partner suppliers, expanding province by province`
        : "Approved partner suppliers, expanding province by province",
    },
    { label: "Trade Accounts Available", detail: `Contractor/Trade ${pct("CONTRACTOR_TRADE")}% and Volume/Civil Bulk ${pct("VOLUME_CIVIL_BULK")}% off list` },
    { label: "Besbpo Group Division", detail: "Delivered by Besfleet and 15+ tipper-truck partners" },
  ];
  return (
    <section className="border-b border-basalt/10 bg-basalt">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((badge) => (
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
