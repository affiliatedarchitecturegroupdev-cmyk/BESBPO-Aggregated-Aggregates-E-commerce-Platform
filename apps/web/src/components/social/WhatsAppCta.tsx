import { WHATSAPP_NUMBER } from "@/data/social";

export function whatsAppLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * WhatsApp Commerce section: a parallel ordering path for Retail-tier
 * bagged and small orders (channels/whatsapp on the API). Bulk tonnage and
 * Volume/Civil Bulk orders still go through the quote flow.
 */
export function WhatsAppCta() {
  return (
    <section className="bg-[#25D366]/10 px-4 py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-[#128C7E]">Chat &amp; Order</span>
          <h2 className="mt-2 font-display text-2xl font-bold text-basalt">Order via WhatsApp</h2>
          <p className="mt-3 max-w-lg font-body text-sm text-slate">
            Tell us what you need and our team confirms price and delivery in the same chat. Best for smaller bagged
            orders; bulk tonnage and Volume/Civil Bulk orders go through our quote request for accurate delivered
            pricing.
          </p>
        </div>
        <a
          href={whatsAppLink("Hi Aggregated Aggregates, I'd like to place an order.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-2 rounded-sm bg-[#25D366] px-6 py-3 font-body text-sm font-semibold text-basalt hover:bg-[#128C7E] hover:text-white"
        >
          Chat on WhatsApp
        </a>
      </div>
    </section>
  );
}

/** Product-page quick action — bagged (Retail-scale) products only, per the channel rules. */
export function WhatsAppOrderButton({ productName }: { productName: string }) {
  return (
    <a
      href={whatsAppLink(`Hi, I'd like to order: ${productName}`)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-sm border border-[#25D366] px-4 py-2 font-body text-xs font-semibold text-[#128C7E] hover:bg-[#25D366]/10"
    >
      Order this on WhatsApp
    </a>
  );
}
