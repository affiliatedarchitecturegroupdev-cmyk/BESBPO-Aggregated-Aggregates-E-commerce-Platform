const STEPS = [
  { n: "01", title: "Tell us the job", text: "Machine or service, province, site and dates. It takes a couple of minutes." },
  { n: "02", title: "We match a vetted partner", text: "We check availability with partners near your site and confirm transport to site." },
  { n: "03", title: "You get a written quote", text: "One price for the hire, operator, fuel and mobilisation. Nothing is booked until you accept." },
  { n: "04", title: "On site, on record", text: "Hours worked and tip or weighbridge slips are kept with your quote, so the invoice matches the job." },
];

/** The current (enquiry-led) flow. Online booking and payment come with Phase C, once partner rates are in place. */
export function HireHowItWorks({ dark = false }: { dark?: boolean }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s) => (
        <li key={s.n} className={`rounded-sm border p-5 ${dark ? "border-limestone/15" : "border-basalt/10 bg-white"}`}>
          <p className="font-mono text-xs text-ochre-gold">{s.n}</p>
          <h3 className={`mt-2 font-display text-base font-semibold ${dark ? "text-limestone" : "text-basalt"}`}>{s.title}</h3>
          <p className={`mt-1 font-body text-sm ${dark ? "text-limestone/75" : "text-slate"}`}>{s.text}</p>
        </li>
      ))}
    </ol>
  );
}
