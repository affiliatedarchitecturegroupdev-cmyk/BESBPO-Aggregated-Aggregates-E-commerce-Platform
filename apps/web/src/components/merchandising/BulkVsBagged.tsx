import { DELIVERY_RULES } from "@/data/catalogue";

// Explains the core pricing mechanic up front: bulk density converts
// tons <-> m³, and bagged lines carry a bagging premium. Buyers coming from
// big-box retail may not know why one material has more than one price.
export function BulkVsBagged() {
  return (
    <section className="bg-limestone px-4 py-14">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-seam-blue">How We Price</span>
          <h2 className="mt-2 font-display text-2xl font-bold text-basalt">Bulk or Bagged — Your Call</h2>
          <p className="mt-3 font-body text-sm text-slate">
            Each material is priced the way it&apos;s sold — per ton, per m³, per bag, or a mix — so you can order exactly
            the way your project measures it.
          </p>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-5">
          <h3 className="font-display text-sm font-semibold text-basalt">Per Ton / Per m³</h3>
          <p className="mt-2 font-body text-sm text-slate">
            Bulk tipper loads from {DELIVERY_RULES.minBulkM3}m³ or {DELIVERY_RULES.minBulkTons} tons. We convert between
            tons and m³ using each material&apos;s own bulk density, so the numbers match the load on the truck.
          </p>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-5">
          <h3 className="font-display text-sm font-semibold text-basalt">Per Bag</h3>
          <p className="mt-2 font-body text-sm text-slate">
            Small-order and DIY-friendly. Bagged prices carry a per-category premium over the bulk rate to cover bagging
            and handling — shown up front, never a hidden markup.
          </p>
        </div>
      </div>
    </section>
  );
}
