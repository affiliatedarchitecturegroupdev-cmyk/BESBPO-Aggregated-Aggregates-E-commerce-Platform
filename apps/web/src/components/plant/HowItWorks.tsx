const STEPS = [
  { n: "01", title: "Tell us the job", text: "Machine or service, province, site and dates. It takes a couple of minutes." },
  { n: "02", title: "Accept a written quote", text: "Priced from a vetted partner's written quote. Accept it in your account — nothing is booked until you pay." },
  { n: "03", title: "Pay, and we confirm a partner", text: "Pay by EFT. The job then goes to vetted partners near you, and we name the one who accepts." },
  { n: "04", title: "Start with your code, pay on sign-off", text: "The crew starts with your arrival code. The partner is paid only after you sign off, with 48 hours to raise a problem." },
]

/** The booking flow (PLANT_HIRE_CATALOGUE.md): quote → EFT → partner accepts → arrival code → sign-off → partner paid. */
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
