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
