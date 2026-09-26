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
