import { availability, roundKm } from "./availability";

const durban = { latitude: -29.8587, longitude: 31.0218 };
const pinetown = { id: "a", city: "Pinetown", province: "KwaZulu-Natal", latitude: -29.8167, longitude: 30.85 };
const pmb = { id: "b", city: "Pietermaritzburg", province: "KwaZulu-Natal", latitude: -29.6006, longitude: 30.3794 };
const joburg = { id: "c", city: "Johannesburg", province: "Gauteng", latitude: -26.2023, longitude: 28.0436 };
const noPin = { id: "d", city: "Unknown", province: "Limpopo", latitude: null, longitude: null };

describe("Available near you", () => {
  it("names the nearest town that lists the product, with a rounded distance", () => {
    const a = availability([pmb, joburg], [pinetown, pmb, joburg], durban);
    expect(a).toMatchObject({ listed: 2, range: 3, listedProvinces: ["Gauteng", "KwaZulu-Natal"] });
    expect(a.nearestListed).toEqual({ town: "Pietermaritzburg", province: "KwaZulu-Natal", distanceKm: 70 });
    // The nearest that carries the range can be closer than the nearest that lists it.
    expect(a.nearestRange).toEqual({ town: "Pinetown", province: "KwaZulu-Natal", distanceKm: 17 });
    expect(JSON.stringify(a)).not.toMatch(/"id"/);
  });

  it("gives counts and provinces only when there's no location, and skips suppliers without a pin", () => {
    const a = availability([noPin], [noPin, pinetown], null);
    expect(a).toEqual({ listed: 1, range: 2, listedProvinces: ["Limpopo"], nearestListed: null, nearestRange: null });
    expect(availability([noPin], [], durban).nearestListed).toBeNull();
  });

  it("rounds distances", () => {
    expect(roundKm(0.2)).toBe(1);
    expect(roundKm(12.4)).toBe(12);
    expect(roundKm(73)).toBe(75);
  });
});
