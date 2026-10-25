/**
 * Whether the business is VAT-registered (ROADMAP 0.10, docs/vat.md). Until SARS registers it we may not charge
 * VAT or show it, so every customer-facing label, PDF and email is VAT-neutral ("Total amount payable", no VAT
 * lines). Setting GROUP_VAT_NUMBER to a valid South African VAT number is the one switch that brings the
 * VAT-inclusive labels and breakdowns back.
 */

export const VAT_RATE_PERCENT = 15; // South African standard rate

/** The Group's VAT number when it is set to a valid one (ten digits starting with 4), else null. */
export function groupVatNumber(env: string | undefined = process.env.GROUP_VAT_NUMBER): string | null {
  const vat = (env ?? "").replace(/\s/g, "");
  return /^4\d{9}$/.test(vat) ? vat : null;
}

/** True once GROUP_VAT_NUMBER holds a valid VAT number. */
export const vatRegistered = (env?: string) => groupVatNumber(env ?? process.env.GROUP_VAT_NUMBER) !== null;

/** Customer-facing wording for each mode. */
export function taxWording(registered = vatRegistered()) {
  return registered
    ? {
        total: "Total (VAT inclusive)",
        priceNote: `Prices include VAT at ${VAT_RATE_PERCENT}%.`,
        notInvoice: "This is not a tax invoice",
        invoice: "tax invoice",
        invoiceTitle: "Tax invoice",
      }
    : {
        total: "Total amount payable",
        priceNote: "",
        notInvoice: "This is not an invoice",
        invoice: "invoice",
        invoiceTitle: "Invoice",
      };
}
