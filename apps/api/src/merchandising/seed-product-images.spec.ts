import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { readManifest, SEED_IMAGE_DIR, seedImagePath } from "./seed-product-images";

const framework = JSON.parse(readFileSync(join(__dirname, "../../../../services/pricing/data/pricing_framework.json"), "utf8")) as {
  products: { sku: string }[];
};

describe("sourced product image set", () => {
  const manifest = readManifest();
  const files = new Set(manifest.images.map((i) => i.file));

  it("only maps plain hashed WebP names to files — no path tricks", () => {
    expect(seedImagePath("0123456789ab.webp")).toBe(join(SEED_IMAGE_DIR, "0123456789ab.webp"));
    for (const bad of ["../manifest.json", "0123456789ab.png", "/etc/passwd", "0123456789ab.webp/..", "ABCDEF123456.webp", ""]) {
      expect(seedImagePath(bad)).toBeNull();
    }
  });

  it("has every file it lists, as real, web-sized WebP, and nothing unlisted", () => {
    for (const image of manifest.images) {
      const path = seedImagePath(image.file);
      expect(path && existsSync(path)).toBeTruthy();
      const bytes = readFileSync(path!);
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
      expect(bytes.length).toBe(image.bytes);
      expect(bytes.length).toBeLessThan(700 * 1024);
      expect(Math.max(image.width, image.height)).toBeLessThanOrEqual(1600);
      expect(image.source).toBeTruthy();
    }
    const onDisk = readdirSync(SEED_IMAGE_DIR).filter((f) => f.endsWith(".webp"));
    expect(new Set(onDisk)).toEqual(files);
    expect(onDisk.reduce((n, f) => n + statSync(join(SEED_IMAGE_DIR, f)).size, 0)).toBeLessThan(15 * 1024 * 1024);
  });

  it("assigns photos only to real catalogue SKUs, at most five each, all from the set", () => {
    const skus = new Set(framework.products.map((p) => p.sku));
    for (const [sku, list] of Object.entries(manifest.products)) {
      expect(skus.has(sku)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      expect(list.length).toBeLessThanOrEqual(5);
      expect(new Set(list).size).toBe(list.length);
      for (const file of list) expect(files.has(file)).toBe(true);
    }
    // Every photo in the set is used somewhere.
    expect(new Set(Object.values(manifest.products).flat())).toEqual(files);
  });

  it("publishes only photos whose licence allows commercial use, with the credit it requires", () => {
    const open = manifest.images.filter((i) => i.openLicence);
    for (const image of open) {
      const licence = image.openLicence!;
      // Commercial-use licences only — no NC (non-commercial) or ND (no-derivatives) variants.
      expect(licence.name).toMatch(/^(CC0|Public domain|CC BY(-SA)? [1-4]\.0( [A-Z]{2})?)$/);
      expect(image.sourcePage).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(licence.author.trim()).toBeTruthy();
      if (licence.name.startsWith("CC BY")) {
        expect(licence.url).toMatch(/^https:\/\/creativecommons\.org\/licenses\/by(-sa)?\/[1-4]\.0\/?/);
        expect(licence.credit).toContain(licence.author);
      } else {
        expect(licence.credit).toBeNull();
      }
    }
  });
});
