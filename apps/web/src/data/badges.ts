/**
 * Responsible Sourcing badges: the regulatory, statutory and industry bodies
 * whose standards, registrations and credentials we expect our partner
 * suppliers to hold where they apply. Shown for due diligence and customer
 * education — each badge belongs to its body and is never presented as an
 * Aggregated Aggregates certification. Provenance: RESPONSIBLE_SOURCING.md.
 *
 * Adapted from the AggregateTrust responsible-sourcing prototype (Manus, Oct
 * 2026) for Aggregated Aggregates.
 */
export type SourcingBadge = {
  key: string;
  name: string;
  fullName: string;
  eyebrow: string;
  description: string;
  /** What we ask our partner suppliers for. */
  expect: string;
  /** How we use this badge on the store. */
  rule: string;
  /** Path under /public, or null while the official file is still to come (a text tile is shown). */
  logo: string | null;
  source: string;
  sourceLabel: string;
  /** Background of the badge's colour panel in the carousel. */
  accent: string;
  /** Background behind the logo (white-on-transparent marks need their own colour). */
  logoShell: string;
  scope: string;
};

export const SOURCING_BADGES: SourcingBadge[] = [
  {
    key: "aspasa",
    name: "ASPASA",
    fullName: "Aggregate and Sand Producers Association of Southern Africa",
    eyebrow: "Aggregate + sand producers",
    description:
      "ASPASA represents the quarries and sand producers behind South Africa's aggregate supply, and promotes health, safety, environmental and legal compliance across members' operations.",
    expect: "Producer identity, quarry or pit location, mining right or permit, the material source and, where they're members, current ASPASA membership.",
    rule: "We use ASPASA to explain what a well-run producer looks like. Membership tells you about the operation — it isn't a certificate for every load or grading.",
    logo: "/badges/aspasa.png",
    source: "https://aspasa.co.za/",
    sourceLabel: "Visit ASPASA",
    accent: "#bf6425",
    logoShell: "#ffffff",
    scope: "Source + producer context",
  },
  {
    key: "sabs",
    name: "SABS / SANS",
    fullName: "South African Bureau of Standards",
    eyebrow: "Standards + conformity evidence",
    description:
      "SABS develops the South African National Standards our materials are graded against — SANS 1083 for concrete aggregate and SANS 1200 for sub-base and base course — and offers testing and certification.",
    expect: "The applicable SANS reference, plus a test report, certificate or declaration for the specific material, with the issuer, date and exact scope.",
    rule: "Every graded product shows its reference standard. We never call the store \"SABS-approved\" or suggest every load is certified — a certificate covers what it names.",
    logo: "/badges/sabs.png",
    source: "https://www.sabs.co.za/sabs-standards",
    sourceLabel: "Visit SABS",
    accent: "#a91e32",
    logoShell: "#ffffff",
    scope: "Standards + test context",
  },
  {
    key: "sanas",
    name: "SANAS",
    fullName: "South African National Accreditation System",
    eyebrow: "Accreditation infrastructure",
    description:
      "SANAS accredits the laboratories and certification bodies that test materials. It lets you trace who tested a material, and whether they're accredited for that test.",
    expect: "Test results from a SANAS-accredited laboratory where a test report is supplied: the laboratory, its accreditation scope and the report number.",
    rule: "SANAS is part of the verification chain behind a test report. It's never shown as a product approval or as our own badge.",
    logo: null,
    source: "https://www.sanas.co.za/",
    sourceLabel: "Visit SANAS",
    accent: "#165c78",
    logoShell: "#ffffff",
    scope: "Accredited-laboratory context",
  },
  {
    key: "concrete-society",
    name: "Concrete Society SA",
    fullName: "Concrete Society of Southern Africa",
    eyebrow: "Cement + concrete education",
    description:
      "The Concrete Society of Southern Africa shares technical knowledge on cement and concrete practice — including the difference between a cement type and a concrete mix.",
    expect: "For cement: the cement type and strength class (such as CEM II 42.5N), the supplier's declaration or certificate, the SANS 50197 reference, and storage and shelf-life guidance.",
    rule: "Technical guidance helps you read a cement document. It doesn't certify a particular bag, batch or supplier.",
    logo: "/badges/concrete-society-sa.png",
    source: "https://concretesocietysa.org.za/faq/cement/",
    sourceLabel: "Read cement guidance",
    accent: "#235d8e",
    logoShell: "#ffffff",
    scope: "Cement education",
  },
  {
    key: "sarf",
    name: "SARF",
    fullName: "South African Road Federation",
    eyebrow: "Roads + pavement context",
    description:
      "The South African Road Federation brings together road engineering and pavement practice. Its context frames how G-grade sub-base and road-building materials are specified and used.",
    expect: "The declared grading and material class (G1–G10), test results, the intended layer, and the project's specification (TRH14 / COLTO) where you've supplied it.",
    rule: "Road-sector context doesn't make a G5 or G6 universally approved. Your engineer's project specification still decides what's suitable.",
    logo: "/badges/sarf.jpg",
    source: "https://www.sarf.org.za/",
    sourceLabel: "Visit SARF",
    accent: "#275d72",
    logoShell: "#ffffff",
    scope: "Roads + pavement context",
  },
  {
    key: "nhbrc",
    name: "NHBRC",
    fullName: "National Home Builders Registration Council",
    eyebrow: "Home-builder registration",
    description:
      "NHBRC registration applies to businesses that build homes — not to every supplier of aggregates, sub-base or cement. We include it so home-builders know what to ask their contractor.",
    expect: "Current registration from any service partner that actually performs home-building work on your project.",
    rule: "Shown for education. It's never used as a material-quality badge or as approval of a supplier.",
    logo: "/badges/nhbrc.svg",
    source: "https://www.nhbrc.org.za/registration-process/",
    sourceLabel: "Visit NHBRC",
    accent: "#234c70",
    logoShell: "#234c70",
    scope: "Builder context only",
  },
  {
    key: "cidb",
    name: "cidb",
    fullName: "Construction Industry Development Board",
    eyebrow: "Contractor registration",
    description:
      "cidb registration and grading apply to contractors and construction work. They don't certify a load of stone or a bag of cement.",
    expect: "Current cidb registration and grading for any partner acting as a contractor on your project — for example in our Group's building work.",
    rule: "We keep contractor credentials apart from material evidence, and never borrow a contractor's grading to sell a product.",
    logo: "/badges/cidb.svg",
    source: "https://www.cidb.org.za/contractors/",
    sourceLabel: "Visit cidb",
    accent: "#126873",
    logoShell: "#126873",
    scope: "Contractor context only",
  },
  {
    key: "bbbee",
    name: "B-BBEE Commission",
    fullName: "Broad-Based Black Economic Empowerment Commission",
    eyebrow: "Supplier + tender context",
    description:
      "B-BBEE credentials matter for trade accounts, tenders and procurement scoring, but they're separate from how a material performs.",
    expect: "A current B-BBEE certificate or sworn affidavit for the supplying entity: the issuer, level and validity period.",
    rule: "We name the entity and the validity date. A supplier credential is never offered as proof of strength, grading or quality.",
    logo: "/badges/bbbee-commission.png",
    source: "https://www.bbbeecommission.co.za/",
    sourceLabel: "Visit the B-BBEE Commission",
    accent: "#334c63",
    logoShell: "#ffffff",
    scope: "Supplier entity context",
  },
];
