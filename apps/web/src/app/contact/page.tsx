export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-basalt">Contact Us</h1>
      <p className="mt-2 font-body text-sm text-slate">
        For bulk orders, trade accounts, or supply partnerships, reach out below.
      </p>
      <form className="mt-8 space-y-4">
        <input placeholder="Full name" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
        <input placeholder="Email address" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
        <input placeholder="Company (optional)" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
        <textarea placeholder="Message" rows={5} className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
        <button type="submit" className="rounded-sm bg-basalt px-6 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-seam-blue">
          Send Message
        </button>
      </form>
      <div className="mt-8 font-body text-sm text-slate">
        <p>sales@aggregates.store</p>
        <p>partners@besbpo.co.za</p>
      </div>
    </div>
  );
}
