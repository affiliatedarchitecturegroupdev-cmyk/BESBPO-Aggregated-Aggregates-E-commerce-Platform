import Link from "next/link";

export function PromoStrip() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col items-center justify-between gap-4 rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-6 sm:flex-row">
        <div>
          <p className="font-body text-sm font-semibold text-basalt">Contractor or civil buyer?</p>
          <p className="mt-1 font-body text-xs text-slate">
            Register a trade account for 8% (Contractor/Trade) or 15% (Volume/Civil Bulk) off list pricing, plus standing delivery
            addresses and PO-based billing.
          </p>
        </div>
        <Link
          href="/account/apply"
          className="whitespace-nowrap rounded-sm bg-basalt px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-seam-blue"
        >
          Open a Trade Account
        </Link>
      </div>
    </section>
  );
}
