const SAMPLE_SUPPLIERS = [
  { name: "Pinetown Partner Yard", province: "KwaZulu-Natal", city: "Pinetown" },
  { name: "Cato Ridge Aggregates Partner", province: "KwaZulu-Natal", city: "Cato Ridge" },
  { name: "Pietermaritzburg Quarry Partner", province: "KwaZulu-Natal", city: "Pietermaritzburg" },
  { name: "Germiston Aggregates Partner", province: "Gauteng", city: "Germiston" },
  { name: "Centurion Quarry Partner", province: "Gauteng", city: "Centurion" },
  { name: "Vereeniging Aggregates Partner", province: "Gauteng", city: "Vereeniging" },
];

/**
 * Module 6: Supplier & Delivery-Point Locator. Surfaces the ~50-strong
 * approved partner-supplier network the delivery calculator measures
 * distance from — a broker model with no owned yards.
 */
export default function SuppliersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-basalt">Delivery Areas & Partner Network</h1>
      <p className="mt-2 font-body text-sm text-slate">
        Aggregated Aggregates sources stock from an approved partner-supplier network — roughly 50 suppliers across
        South Africa — rather than holding its own inventory. Launching across KZN and Gauteng, expanding to the
        Group&apos;s standard 7-province footprint as the network grows. A sample of the network is shown below.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SAMPLE_SUPPLIERS.map((s) => (
          <div key={s.name} className="rounded-sm border border-basalt/10 bg-white p-4">
            <p className="font-body text-sm font-semibold text-basalt">{s.name}</p>
            <p className="font-body text-xs text-slate">{s.city}, {s.province}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 font-mono text-xs text-slate">
        Delivery: 0–30km from the nearest partner-supplier location included · 30–60km / 60–100km flat add-ons by load
        size · beyond 100km quoted individually.
      </p>
    </div>
  );
}
