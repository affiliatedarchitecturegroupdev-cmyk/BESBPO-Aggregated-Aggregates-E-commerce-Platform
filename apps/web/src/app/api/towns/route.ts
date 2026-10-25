import { COVERAGE_TOWNS } from "@/data/coverage-towns";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Towns and suburbs we deliver to, matching what the shopper is typing — for "Available near you". */
export function GET(request: Request) {
  const q = norm(new URL(request.url).searchParams.get("q") ?? "");
  if (q.length < 2) return Response.json({ towns: [] });
  const towns = COVERAGE_TOWNS.flatMap((t) => {
    const hit = [t.name, ...(t.aliases ?? [])].find((label) => norm(label).startsWith(q) || norm(label).includes(` ${q}`));
    return hit ? [{ label: hit === t.name ? `${t.name}, ${t.province}` : `${hit} (${t.name}), ${t.province}`, lat: t.lat, lng: t.lng }] : [];
  }).slice(0, 8);
  return Response.json({ towns }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
