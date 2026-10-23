import { RANGE_CATEGORIES } from "@/data/range-index";

/**
 * Stand-in product imagery until photography exists: a texture in the
 * material's colour, generated deterministically from the SKU so server and
 * client render the same picture.
 */
const PALETTES: Record<string, { base: string; grains: string[] }> = {
  "sub-base-base-course": { base: "#9C8466", grains: ["#7A6449", "#B8A283", "#5E4B37"] },
  "crushed-stone": { base: "#8C8A86", grains: ["#6E6C69", "#A9A7A2", "#55534F"] },
  "sand-fine-aggregates": { base: "#D6BE8E", grains: ["#C4A873", "#E6D3AC", "#B39461"] },
  "crusher-run-road-building": { base: "#8F887E", grains: ["#6F695F", "#ABA59B", "#5A544B"] },
  "ballast-rail": { base: "#5F5C58", grains: ["#46443F", "#7B7873", "#34322F"] },
  "drainage-filter": { base: "#9DA2A3", grains: ["#7F8586", "#BCC0C0", "#636869"] },
  "decorative-landscaping": { base: "#B9A58C", grains: ["#E3D6C3", "#8E7A63", "#CBB9A0"] },
  "agricultural-industrial": { base: "#ECE8DF", grains: ["#D9D3C6", "#F7F5F0", "#C8C1B2"] },
  "recycled-sustainable": { base: "#A08A78", grains: ["#7E6A5A", "#BCA797", "#8F8F8B"] },
  "cement-hydraulic-binders": { base: "#B7B5B0", grains: ["#9E9C97", "#CFCDC8", "#8A8883"] },
  "mortars-grouts-admixtures": { base: "#C9C4BA", grains: ["#B0AA9F", "#DEDAD2", "#2C4A5E"] },
  // Masonry: brick red and concrete-block grey.
  "bricks-blocks": { base: "#A4553A", grains: ["#8A4230", "#C06A4B", "#9C9890"] },
  "paving-kerbs-edging": { base: "#8D8780", grains: ["#6E6862", "#A9A39B", "#9A5A40"] },
  "retaining-erosion-control": { base: "#8A8172", grains: ["#6B6355", "#A89F8F", "#5F6B4E"] },
  "pipes-fittings": { base: "#8C7A62", grains: ["#E07A1F", "#6E5F4C", "#A8977F"] },
  "precast-drainage": { base: "#94918B", grains: ["#76736E", "#B0ADA7", "#5E6A70"] },
  "geosynthetics-membranes": { base: "#3B3D3F", grains: ["#55585B", "#2A2B2C", "#7B7F82"] },
  "lintels-dpc-wall-accessories": { base: "#8E8B85", grains: ["#6F6C67", "#ABA8A2", "#2B2B2B"] },
  // Roofing: galvanised and Zincalume silver, colour-coated brown and green, terracotta tiles.
  "roof-sheeting": { base: "#A9AEB1", grains: ["#C7CCCF", "#8C9295", "#6B4A3A"] },
  "roof-flashings-fixings": { base: "#9DA3A6", grains: ["#7E8487", "#BEC3C5", "#3E5E4A"] },
  "roof-insulation-rainwater": { base: "#E5D9A8", grains: ["#D3C48C", "#F1E9C6", "#F2F2F0"] },
  // Timber: pale SA pine with the green tint of CCA treatment; galvanised connectors.
  "structural-timber": { base: "#D8BE8C", grains: ["#C4A472", "#E6D2A8", "#9FAE7E"] },
  "timber-connectors": { base: "#B0B5B8", grains: ["#D8BE8C", "#8E9497", "#C9CED0"] },
  "concrete-roof-tiles": { base: "#9C4A32", grains: ["#7F3A26", "#B65E43", "#5C5A57"] },
  // Building supplies: timber doors and steel frames, galvanised wire, tank green, gypsum white, safety yellow, paint.
  "doors-frames": { base: "#B98F5E", grains: ["#9A7246", "#D2AE80", "#6B4F35"] },
  "windows-frames": { base: "#7A5446", grains: ["#9C6E5C", "#B9C7CF", "#5A3D33"] },
  "fencing-wire-posts": { base: "#9FA5A8", grains: ["#7F8588", "#C3C8CA", "#4A4F52"] },
  "gates-security": { base: "#8C9294", grains: ["#6C7275", "#F2F2F0", "#B0B6B8"] },
  "water-tanks-geysers": { base: "#4E6B4A", grains: ["#3D5739", "#6B8A66", "#E9ECEB"] },
  "water-supply-soil-pipe": { base: "#E4E1DA", grains: ["#B87333", "#C9C5BC", "#8E8A82"] },
  "ceilings-drywall": { base: "#EEEBE4", grains: ["#DAD5CB", "#F8F7F3", "#C4BEB2"] },
  "site-tools": { base: "#6E6A64", grains: ["#E07A1F", "#4F4C47", "#A39E96"] },
  "ppe-site-safety": { base: "#D9C531", grains: ["#E8B931", "#F2F2F0", "#E07A1F"] },
  "waterproofing-sealants": { base: "#3B3D3F", grains: ["#55585B", "#9C4A32", "#F2F2F0"] },
  "paint-coatings": { base: "#E6E1D6", grains: ["#2C4A5E", "#C08A34", "#9C4A32"] },
  // Services & fit-out: copper and cable colours, tile and timber, chrome and steel.
  "electrical-cable-conduit": { base: "#D9D4C8", grains: ["#B87333", "#C0392B", "#2F2F2F"] },
  "electrical-distribution": { base: "#E8E6E1", grains: ["#3A3A3A", "#2C4A5E", "#F2F2F0"] },
  "switches-sockets-lighting": { base: "#F2F0EB", grains: ["#E8B931", "#D8D4CB", "#9A958C"] },
  "solar-backup-power": { base: "#2A3440", grains: ["#3C5A78", "#1F2A36", "#C9CED4"] },
  "floor-wall-tiles": { base: "#E4DED2", grains: ["#C9BFAE", "#F4F1EA", "#A89E8C"] },
  "flooring-skirting": { base: "#B08A62", grains: ["#9A7552", "#C9A57E", "#7E5E40"] },
  "tiling-accessories": { base: "#CFCBC3", grains: ["#A8A49C", "#E9E6E0", "#7E7A73"] },
  "sanitaryware": { base: "#F4F3F0", grains: ["#E2E0DB", "#FFFFFF", "#C9C6BF"] },
  "taps-mixers-valves": { base: "#C8CBCE", grains: ["#E8EAEC", "#9DA1A5", "#B87333"] },
  "kitchen-sinks-waste": { base: "#B9BCBF", grains: ["#D9DBDD", "#8E9195", "#2F2F2F"] },
  "fasteners-fixings": { base: "#8D8F91", grains: ["#B5B7B9", "#6A6C6E", "#C9A227"] },
  "locks-ironmongery": { base: "#7A6A4F", grains: ["#B89B5E", "#4E4434", "#C8CBCE"] },
  "boards-sheets": { base: "#C9A878", grains: ["#B08F60", "#DCC29A", "#6B4F2E"] },
  "formwork-scaffolding": { base: "#7C7A76", grains: ["#E07A1F", "#5E5C58", "#A3A09A"] },
  "ready-mix-concrete": { base: "#A7A49E", grains: ["#8D8A84", "#C2BFB9", "#75726C"] },
  // Plant hire and site services: machine yellow and safety orange on site soil.
  "plant-hire": { base: "#8A7458", grains: ["#D9A521", "#6E5B44", "#E8B931"] },
  "site-services": { base: "#7E7468", grains: ["#E07A1F", "#5F574D", "#A0968A"] },
  // Steel: mill-scale greys with a hint of rust.
  "reinforcing-bar": { base: "#5B5550", grains: ["#3F3A36", "#7A716A", "#8A5A3C"] },
  "mesh-brickforce": { base: "#6B6762", grains: ["#4C4844", "#8C8781", "#7E5638"] },
  "steel-fixing-accessories": { base: "#77736E", grains: ["#55514D", "#99948E", "#2C4A5E"] },
  "structural-steel": { base: "#4E5357", grains: ["#383C3F", "#6D7276", "#7A5236"] },
};

/** Range-expansion categories (CAT-57 onwards) take their department's colours. */
const DEPARTMENT_PALETTES: Record<string, { base: string; grains: string[] }> = {
  timber: { base: "#C9A878", grains: ["#A88B5C", "#DCC29A", "#7E8F5E"] },
  "garden-landscaping": { base: "#6E8B4A", grains: ["#55703A", "#8FA866", "#5A4632"] },
  "outdoor-living": { base: "#8C6F55", grains: ["#3F6F8C", "#B08A66", "#2E2B28"] },
  "formwork-access": { base: "#7C7A76", grains: ["#E07A1F", "#5E5C58", "#A3A09A"] },
  "roads-civil": { base: "#3A3A3A", grains: ["#2A2A2A", "#F2F2F0", "#E8B931"] },
  "precast-concrete": { base: "#A7A49E", grains: ["#8D8A84", "#C2BFB9", "#75726C"] },
  "construction-chemicals": { base: "#9A9EA2", grains: ["#2C4A5E", "#C8CBCE", "#6F7377"] },
  "insulation-fire-acoustic": { base: "#E5D9A8", grains: ["#C8352E", "#F1E9C6", "#D3C48C"] },
  "water-plumbing": { base: "#7E9AA8", grains: ["#5D7A88", "#A6BDC7", "#E07A1F"] },
  electrical: { base: "#4F5A63", grains: ["#E8B931", "#38424A", "#C8352E"] },
  "glass-aluminium": { base: "#B9C8CF", grains: ["#9DB0B9", "#DCE6EA", "#8C9295"] },
  "kitchens-built-ins": { base: "#D9D2C5", grains: ["#B5AB98", "#F2EEE6", "#6B4F2E"] },
  "hvac-ventilation": { base: "#C8CED2", grains: ["#A9B1B6", "#E6EAEC", "#5E6A70"] },
  "site-establishment": { base: "#8A7458", grains: ["#E07A1F", "#6E5B44", "#2C4A5E"] },
  "power-tools-equipment": { base: "#5E6266", grains: ["#E8B931", "#3F4346", "#C8352E"] },
  "tiles-flooring": { base: "#B8AFA3", grains: ["#9A9085", "#D6CFC5", "#6B5E52"] },
  "security-access": { base: "#3E4448", grains: ["#2A2E31", "#6D7479", "#C8352E"] },
  "hardware-fasteners": { base: "#8D8F91", grains: ["#B5B7B9", "#6A6C6E", "#C9A227"] },
  "paint-waterproofing": { base: "#7A8C94", grains: ["#C8352E", "#E8B931", "#2C4A5E"] },
  "prefab-structures": { base: "#A9AEB1", grains: ["#C9A878", "#8C9295", "#3E5E4A"] },
  "agricultural-farm": { base: "#8C7A52", grains: ["#6E8B4A", "#B39461", "#A9AEB1"] },
  "mining-industrial": { base: "#55524E", grains: ["#3A3734", "#8A5A3C", "#E8B931"] },
};
const RANGE_DEPARTMENT = new Map(RANGE_CATEGORIES.map((c) => [c.slug, c.department]));

function seededRandom(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function MaterialSwatch({
  sku,
  categorySlug,
  className = "h-28",
  grains = 90,
}: {
  sku: string;
  categorySlug: string;
  className?: string;
  grains?: number;
}) {
  const palette = PALETTES[categorySlug] ?? DEPARTMENT_PALETTES[RANGE_DEPARTMENT.get(categorySlug) ?? ""] ?? PALETTES["crushed-stone"];
  const random = seededRandom(sku);
  const dots = Array.from({ length: grains }, () => ({
    cx: Math.round(random() * 1000) / 10,
    cy: Math.round(random() * 600) / 10,
    r: Math.round((0.6 + random() * 2.4) * 10) / 10,
    fill: palette.grains[Math.floor(random() * palette.grains.length)],
  }));
  return (
    <div className={`overflow-hidden rounded-sm ${className}`} role="img" aria-label="Material texture">
      <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <rect width="100" height="60" fill={palette.base} />
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity={0.85} />
        ))}
      </svg>
    </div>
  );
}
