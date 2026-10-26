import { getDeliveryRates } from "@/lib/cms";
import { FLATBED_BANDS, FLATBED_LINE_LABEL, type FlatbedLine } from "@/lib/delivery-rates";
import { formatZAR } from "@/lib/pricing";

/**
 * The flatbed delivery fee for a product line, once the owner has set it in Admin → Delivery rates
 * (docs/delivery-rates.md). Until then nothing shows — the charge is confirmed before dispatch, as the page says.
 */
export async function FlatbedFeeNote({ line }: { line: FlatbedLine }) {
  const rate = (await getDeliveryRates()).flatbed[line];
  if (!rate) return null;
  return (
    <p className="mt-3 rounded-sm border border-seam-blue/20 bg-limestone/60 p-3 font-body text-sm text-basalt">
      <strong>Delivery fee, shown at checkout:</strong>{" "}
      {rate.fees.map((fee, i) => `${fee === 0 ? "free" : formatZAR(fee)} ${i === 0 ? "within 30 km" : FLATBED_BANDS[i]}`).join(" · ")}
      {rate.freeFrom !== null && ` · free on ${formatZAR(rate.freeFrom)} or more of ${FLATBED_LINE_LABEL[line].toLowerCase()}`}. Beyond 100 km we quote it. One delivery fee
      covers an order&apos;s main supply point; collections from other suppliers are covered by the delivery premium.
    </p>
  );
}
