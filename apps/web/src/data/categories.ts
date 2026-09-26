export type Category = {
  slug: string;
  name: string;
  description: string;
};

// Matches the 9-category portfolio (48-line xlsx) and the homepage
// "Shop by Category" wireframe.
export const CATEGORIES: Category[] = [
  { slug: "sub-base-base-course", name: "Sub-Base & Base Course", description: "G1–G10 graded gravels for road and foundation layers." },
  { slug: "crushed-stone", name: "Crushed Stone", description: "SANS 1083 crushed stone in a full range of gradings." },
  { slug: "sand-fine-aggregates", name: "Sand & Fine Aggregates", description: "Washed river sand, plaster sand, and fine fill material." },
  { slug: "crusher-run", name: "Crusher Run", description: "COLTO/TRH14 crusher run for pavement and general fill." },
  { slug: "ballast-rail", name: "Ballast & Rail", description: "Rail ballast and heavy-duty track-bed aggregate." },
  { slug: "drainage-stone", name: "Drainage Stone", description: "French drain stone and drainage-grade aggregate." },
  { slug: "decorative-landscaping", name: "Decorative & Landscaping", description: "River pebble and decorative aggregate for landscaping." },
  { slug: "agricultural-lime", name: "Agricultural Lime", description: "Agricultural lime for soil conditioning." },
  { slug: "recycled-aggregates", name: "Recycled Aggregates", description: "Recycled crushed concrete (RCA) for sustainable fill." },
];
