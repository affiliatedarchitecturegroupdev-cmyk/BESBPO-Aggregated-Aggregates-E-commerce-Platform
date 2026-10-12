import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * The storefront's catalogue JSON is bundled into pages every visitor
 * downloads, so it must not carry internal pricing research: competitor
 * names and prices, benchmark prices, costs or cost bases. Regenerate the
 * files with scripts/public-catalogues.py rather than copying them by hand.
 */
const WEB_DATA = join(__dirname, "../../../web/src/data");
const PRIVATE = ["source_note", "market_benchmark_price", "cost_basis_percent", "cost_per_unit", "base_cost_per_ton", "benchmark_sources"];
const COMPETITORS = /cashbuild|buco|builders warehouse|leroy merlin|chamberlain|hinterland|build it|brights|timbercity/i;

function keysOf(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => keysOf(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keysOf(v, out);
    }
  }
  return out;
}

describe("storefront catalogues", () => {
  const files = readdirSync(WEB_DATA).filter((f) => f.endsWith(".json"));

  it.each(files)("%s carries no internal pricing research", (file) => {
    const raw = readFileSync(join(WEB_DATA, file), "utf8");
    const keys = keysOf(JSON.parse(raw));
    for (const key of PRIVATE) expect(keys.has(key)).toBe(false);
    expect(raw).not.toMatch(COMPETITORS);
  });
});
