import assert from "node:assert/strict";
import { test } from "node:test";
import { applyLivePrices, LIVE_PRICE_STATUS, liveKey, livePriceMap } from "./live-prices";

const live = [{ sku: "AA-POLE", unit: "EACH", prices: { RETAIL: 48.6, CONTRACTOR_TRADE: 46.66, VOLUME_CIVIL_BULK: null } }];

test("an approved supplier price takes the place of a quote-only unit", () => {
  const product = { sku: "AA-POLE", units: [{ unit: "EACH", pricingStatus: "Quote-only", prices: null }, { unit: "PACK", pricingStatus: "Quote-only", prices: null }] };
  const priced = applyLivePrices(product, livePriceMap(live));
  assert.deepEqual(priced.units[0], { unit: "EACH", pricingStatus: LIVE_PRICE_STATUS, prices: live[0].prices });
  assert.equal(priced.units[1].prices, null);
  assert.equal(product.units[0].prices, null, "the catalogue itself is never changed");
});

test("products without live prices are returned as they are", () => {
  const product = { sku: "AA-OTHER", units: [{ unit: "EACH", pricingStatus: "Ready", prices: { RETAIL: 10, CONTRACTOR_TRADE: 9.6, VOLUME_CIVIL_BULK: null } }] };
  assert.equal(applyLivePrices(product, livePriceMap(live)), product);
});

test("bad rows are ignored and the key changes only with the prices", () => {
  const map = livePriceMap([...live, { sku: "AA-BAD", unit: "EACH", prices: { RETAIL: 0, CONTRACTOR_TRADE: null, VOLUME_CIVIL_BULK: null } }]);
  assert.equal(map.size, 1);
  assert.equal(liveKey([]), "");
  assert.notEqual(liveKey(live), liveKey([{ ...live[0], prices: { ...live[0].prices, RETAIL: 50 } }]));
});
