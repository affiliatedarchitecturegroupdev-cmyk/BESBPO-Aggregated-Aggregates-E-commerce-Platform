/** Tests for product families (run with `pnpm --filter web test`). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFamilies, familyParts, groupForListing, MIN_FAMILY } from "./product-families";

test("splits a name into what it is and which size it is", () => {
  assert.deepEqual(familyParts("CCA Treated Pole 100–125 mm × 3.0 m"), { title: "CCA Treated Pole", variant: "100–125 mm × 3.0 m" });
  assert.deepEqual(familyParts("Masonry Drill Bit 6 mm"), { title: "Masonry Drill Bit", variant: "6 mm" });
  assert.deepEqual(familyParts("Diamond Blade, Turbo (Concrete & Brick) 230 mm"), { title: "Diamond Blade, Turbo (Concrete & Brick)", variant: "230 mm" });
  assert.deepEqual(familyParts("Metal Grinding Disc 115 mm (pack of 10)"), { title: "Metal Grinding Disc", variant: "115 mm (pack of 10)" });
  assert.deepEqual(familyParts("Agricultural Shade Net 40%, 3 m Wide"), { title: "Agricultural Shade Net", variant: "40%, 3 m Wide" });
  assert.deepEqual(familyParts("High-Tensile Bolt & Nut M12 × 40 mm, Grade 8.8"), { title: "High-Tensile Bolt & Nut", variant: "M12 × 40 mm, Grade 8.8" });
  assert.deepEqual(familyParts("Kikuyu Instant Lawn"), { title: "Kikuyu Instant Lawn", variant: "" });
});

test("a formulation ratio is part of what the product is, not its size", () => {
  assert.equal(familyParts("Fertiliser 2:3:2 (22) 5 kg").title, "Fertiliser 2:3:2");
  assert.notEqual(familyParts("Fertiliser 2:3:2 (22) 5 kg").title, familyParts("Fertiliser 3:1:5 (26) 5 kg").title);
});

const p = (sku: string, name: string, categorySlug = "c") => ({ sku, name, categorySlug });

test("groups only same-category products that differ purely in size, and only four or more", () => {
  const products = [
    ...["1.8", "2.4", "3.0", "3.6", "4.2"].map((l, i) => p(`POLE-${i}`, `CCA Treated Pole 75–100 mm × ${l} m`)),
    // Three sizes isn't enough to group.
    ...["100", "150", "200"].map((s, i) => p(`FAN-${i}`, `Ceiling Extractor Fan ${s} mm`)),
    // Same words, different category: never one family.
    p("POLE-X", "CCA Treated Pole 75–100 mm × 6.0 m", "other"),
    // Colours or types differ: separate products.
    p("SAIL-1", "Shade Sail Triangle, Charcoal"),
    p("SAIL-2", "Shade Sail Triangle, Sand"),
  ];
  const { families, familyOf } = buildFamilies(products);
  assert.equal(families.size, 1);
  const [family] = families.values();
  assert.equal(family.title, "CCA Treated Pole");
  assert.equal(family.members.length, 5);
  assert.equal(familyOf.get("FAN-0"), undefined);
  assert.equal(familyOf.get("POLE-X"), undefined);
  assert.ok(MIN_FAMILY >= 4);
});

test("listing cards: a family appears once where its best match was; one match shows as the product itself", () => {
  const products = ["1.8", "2.4", "3.0", "3.6"].map((l, i) => p(`P${i}`, `Treated Lath 38 × 19 mm × ${l} m`));
  const other = p("X", "Garden Rake 12-Tooth");
  const { families, familyOf } = buildFamilies([...products, other]);
  const cards = groupForListing([products[2], other, products[0], products[3]], families, familyOf);
  assert.deepEqual(cards.map((c) => c.kind), ["family", "product"]);
  assert.deepEqual(cards[0].kind === "family" && cards[0].shown.map((s) => s.sku), ["P2", "P0", "P3"]);
  const single = groupForListing([products[1]], families, familyOf);
  assert.deepEqual(single.map((c) => c.kind), ["product"]);
});
