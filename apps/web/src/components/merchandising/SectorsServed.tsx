const SECTORS = [
  { name: "Civil", detail: "Road layers, bulk fill and rail ballast — quoted per project with PO billing." },
  { name: "Commercial", detail: "Concrete aggregate, screeds and drainage for site builds." },
  { name: "Industrial", detail: "Hydrated and agricultural lime, filter media, rip rap and gabion stone." },
  { name: "Residential", detail: "Bagged sand, stone and decorative pebble for homeowners and landscapers." },
];

export function SectorsServed() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-2xl font-bold text-basalt">Built for every sector</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTORS.map((sector) => (
          <div key={sector.name} className="rounded-sm border-l-4 border-seam-blue bg-white p-5">
            <p className="font-display text-base font-bold text-basalt">{sector.name}</p>
            <p className="mt-2 font-body text-sm text-slate">{sector.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
