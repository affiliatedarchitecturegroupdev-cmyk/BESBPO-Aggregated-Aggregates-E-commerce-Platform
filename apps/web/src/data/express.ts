/**
 * AA 60/120 express delivery — storefront copy. The rules themselves live in
 * the API (apps/api/src/orders/express.ts), which decides every cart; keep
 * these figures in step with it.
 */
export const EXPRESS = {
  name: "AA 60/120",
  fee: 1000,
  prepMinutes: 20,
  promiseMinutes: 120,
  refundAfterMinutes: 180,
  radiusKm: 30,
  maxLoadTonnes: 5,
  hours: "Monday to Saturday, 07:00 to 15:00",
  cutoff: "15:00",
} as const;

/** What qualifies, in shoppers' words, with where to buy it. */
export const EXPRESS_MATERIALS = [
  { name: "Cement in bags", detail: "25 kg and 50 kg bags — general-purpose, masonry and more", href: "/cement" },
  { name: "Bagged sand and stone", detail: "Plaster and building sand, stone and decorative aggregate in bags", href: "/products?group=core" },
  { name: "Bricks", detail: "Clay and cement stock, face and maxi bricks", href: "/bricks-blocks" },
  { name: "Blocks", detail: "90, 140 and 190 mm concrete blocks", href: "/bricks-blocks" },
  { name: "Lintels, DPC and air bricks", detail: "Prestressed lintels 1.2–3.6 m, damp-proof course rolls", href: "/products?category=lintels-dpc-wall-accessories" },
  { name: "Small steel", detail: "6 m rebar, brickforce rolls, tie wire and fixing accessories", href: "/reinforcing-steel" },
  { name: "Roofing", detail: "Roof sheets in standard lengths, tiles, flashings, insulation and gutters", href: "/roofing" },
] as const;

export const EXPRESS_EXCLUDED =
  "Bulk loads by the tonne or cube, cement in bulk bags or tankers, drums, steel by the tonne, 12 m bars, mesh sheets and structural steel, cut-to-length roof sheet, ready-mix concrete and timber.";
