import { normaliseDeliveryRates, pricingPayload, WORKBOOK_RATES } from "./delivery-rates";

describe("delivery rates", () => {
  it("keeps valid rates, rounded to the cent, and only the flatbed lines that are set", () => {
    const rates = normaliseDeliveryRates({ ...WORKBOOK_RATES, smallLoadFee: "375.555", flatbed: { steel: { fees: [300, "550", 900], freeFrom: "" }, masonry: null, aggregates: { fees: [1, 2, 3] } } });
    expect(rates.smallLoadFee).toBe(375.56);
    expect(rates.flatbed).toEqual({ steel: { fees: [300, 550, 900], freeFrom: null } });
    expect(normaliseDeliveryRates(WORKBOOK_RATES)).toEqual(WORKBOOK_RATES);
  });

  it("refuses missing, negative or silly amounts with a plain reason", () => {
    expect(() => normaliseDeliveryRates({ ...WORKBOOK_RATES, baggedFee: -1 })).toThrow("The bagged-goods fee must be an amount from R0 to R100,000.");
    expect(() => normaliseDeliveryRates({ ...WORKBOOK_RATES, bandFees: { BAND_30_60: { M3_6: 450 } } })).toThrow(/30–60 km fee for 10 m³/);
    expect(() => normaliseDeliveryRates({ ...WORKBOOK_RATES, minBulkM3: 0 })).toThrow(/full-load minimum/);
    expect(() => normaliseDeliveryRates({ ...WORKBOOK_RATES, flatbed: { steel: { fees: [1, 2] } } })).toThrow(/each distance band/);
    expect(() => normaliseDeliveryRates({ ...WORKBOOK_RATES, flatbed: { roofing: { fees: [1, "", 3] } } })).toThrow(/Roofing & timber, 30–60 km/);
  });

  it("is sent to the pricing service in its own names", () => {
    expect(pricingPayload({ ...WORKBOOK_RATES, flatbed: { supplies: { fees: [150, 250, 400], freeFrom: 2500 } } })).toEqual({
      band_fees: WORKBOOK_RATES.bandFees,
      small_load_fee: 350,
      bagged_fee: 350,
      bagged_free_from_kg: 1000,
      min_bulk_m3: 3,
      min_bulk_tons: 5,
      flatbed: { supplies: { fees: [150, 250, 400], free_from: 2500 } },
    });
  });
});
