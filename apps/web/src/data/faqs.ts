/**
 * The general FAQ, shown on /faq and used by the shopping assistant
 * (SHOPPING_ASSISTANT.md) — one source, so the assistant never says more than
 * the published answer.
 */
import { CUSTOMER_TIERS, DELIVERY_RULES } from "@/data/catalogue";
import { formatZAR } from "@/lib/pricing";

const pct = (name: string) => Math.round((CUSTOMER_TIERS.find((t) => t.name === name)?.discount ?? 0) * 100);
const [included, ...bands] = DELIVERY_RULES.bands;

export const FAQS: { question: string; answer: string }[] = [
  {
    question: "Do you deliver, or do I collect?",
    answer: `We deliver from our approved partner-supplier network — quarries and plants across South Africa; we hold no stock of our own. Full tipper loads are included within ${included.maxKm}km of the nearest partner supplier, carry a flat fee by load size from ${bands[0].minKm}–${bands[bands.length - 1].maxKm}km, and are quoted individually beyond ${DELIVERY_RULES.quoteOverKm}km.`,
  },
  {
    question: "What's the difference between buying by ton, m³ or bag?",
    answer:
      "Bulk aggregates convert live between tons and m³ using each material's bulk density, so a ton price and an m³ price describe the same rate. Bagged units carry a small premium over the bulk rate to cover bagging and handling — handy for smaller, DIY-scale orders.",
  },
  {
    question: "What are the Retail, Contractor/Trade and Volume/Civil Bulk tiers?",
    answer: `Retail is standard list pricing. Contractor/Trade is an approved trade account: ${pct("CONTRACTOR_TRADE")}% off aggregates, 4% off bagged cement and 2% off ready-mix. Volume/Civil Bulk gets up to ${pct("VOLUME_CIVIL_BULK")}% off aggregates with purchase-order invoicing; its cement and ready-mix, and any order of 10m³ or more, are quoted with delivered pricing rather than priced online. No discount ever takes a price below our minimum margin, so on low-margin materials the saving can be a little smaller.`,
  },
  {
    question: "Why do some products say “Price on request”?",
    answer:
      "A few Bulk & Infrastructure lines — bulk-bag and tanker cement, 52.5N cement, road-capping binder and concrete admixtures — have no public market benchmark yet. Rather than guess, we confirm a supplier-backed price with you directly.",
  },
  {
    question: "Can I order through WhatsApp?",
    answer:
      "Yes — for bagged and smaller Retail orders. Message us what you need and our team confirms price and delivery in the same chat. Bulk tonnage and Volume/Civil Bulk orders go through the quote request for accurate delivered pricing.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "Card, instant EFT, Capitec Pay, digital wallets, SnapScan and Zapper, SCode (pay in store with a barcode), buy-now-pay-later options, and — for approved trade accounts — Lulapay trade credit or EFT / purchase-order invoicing. The Ways to Pay page lists every method and its terms.",
  },
  {
    question: "Do you supply compliance documentation?",
    answer:
      "Yes. Graded products carry their reference standard (SANS 1200-G, SANS 1083 or COLTO/TRH14). Reference documents are published on the product page, and batch-specific Certificates of Analysis are attached to your order record.",
  },
  {
    question: "Which provinces do you deliver to?",
    answer:
      "Yes — we deliver across all nine provinces, from the approved partner supplier nearest your site. Check your town on our Where We Deliver page (/coverage); if it isn't listed, request a quote and we'll confirm.",
  },
  {
    question: "How far is my site from your nearest supplier?",
    answer: `Use “Use my location” on the Delivery Areas page or any product calculator. It gives a straight-line estimate; road distance is confirmed when you order. Bagged delivery is priced within ${DELIVERY_RULES.baggedMaxKm}km (${formatZAR(DELIVERY_RULES.baggedFee)}, free from ${DELIVERY_RULES.baggedFreeFromKg / 1000} ton).`,
  },
];

/** Trade, projects and deliveries — the project tools, as the Terms (sections 4A and 5) describe them. */
export const PROJECT_FAQS: { question: string; answer: string }[] = [
  {
    question: "Can my company buy on credit?",
    answer:
      "Yes, once your trade account is approved. Your company's account administrator applies from My account → Trade credit with the limit and terms you need (7, 14, 30 or 60 days) and two trade references. We tell you our decision by email. Approved orders go on account at checkout — confirmed and delivered now, paid by the due date on your confirmation — while what you owe stays within your limit and nothing is overdue. AA 60/120 express orders can't go on account.",
  },
  {
    question: "Can I send you my bill of quantities?",
    answer:
      "Yes. Upload it as an Excel workbook (.xlsx) or CSV on the BOQ upload page. We match each line to the catalogue and suggest a product; you confirm the matches, units and quantities, and send it as one quote request with your file attached. Lines we can't match are quoted as written. For a PDF bill of quantities, request a quote and email the PDF to our sales team.",
  },
  {
    question: "Can you deliver my order in stages?",
    answer:
      "Yes. From your order's tracking page, choose Deliver in stages and split the order into deliveries on the dates you need them. The dates are requests: we confirm each one with the partner supplier. Each delivery leaves once what you've paid covers it and the ones before it, or straight away on a trade account. Additional deliveries may carry a delivery charge, which we agree with you first.",
  },
  {
    question: "How do I know my delivery arrived?",
    answer:
      "The person receiving on site may be asked to sign for it on the driver's phone, give their name and note any shortage or damage; a photo of the delivery may be taken with it. We email you when a delivery is signed for, and it's kept with your order as the proof of delivery.",
  },
  {
    question: "Can I pay a deposit, or pay later?",
    answer:
      "On larger orders you can pay a deposit to confirm the order at its prices and the balance before delivery. Lay-by spreads the cost before delivery, and for quoted and site orders our team can send a secure payment link with a proforma invoice. The Ways to Pay page has every option and its terms.",
  },
  {
    question: "How long will my order take?",
    answer:
      "Where our partner suppliers have confirmed a usual lead time for a category, it shows on the product page, in your cart and at checkout. Lead times are estimates, not guaranteed delivery dates. For delivery within 2 hours on eligible orders, see AA 60/120.",
  },
  {
    question: "I'm a supplier to Aggregated Aggregates — where do I see my orders?",
    answer:
      "In the supplier portal. Once our team links your login to your yard, you see the orders assigned to you to load — products, quantities, delivery area and dates — and confirm whether you can load them. The portal never shows customers' prices or contact details.",
  },
];
