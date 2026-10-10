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
  "lintels-dpc-wall-accessories": { base: "#8E8B85", grains: ["#6F6C67", "#ABA8A2", "#2B2B2B"] },
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
  const palette = PALETTES[categorySlug] ?? PALETTES["crushed-stone"];
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
