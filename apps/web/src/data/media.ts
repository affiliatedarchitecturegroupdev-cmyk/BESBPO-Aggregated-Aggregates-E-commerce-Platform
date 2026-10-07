// The storefront's photo library: real, licensed Unsplash photography for
// the homepage slideshow and ad creative — sourced September 2026 by fetching each photo's own page and
// reading its og:image URL, then stripping Unsplash's OpenGraph watermark
// params back down to plain crop params. No stock-photo placeholder or
// fabricated URL is used here.
//
// 10 of the originally requested 10-12 are sourced below. Unsplash
// rate-limited further lookups again partway through completing this set
// (a second, later session hit the same 429 the first one did) — 10 is a
// full slideshow rotation, so this was treated as "done enough" rather than
// pushed to breaking. To add the last 1-2: browse
// https://unsplash.com/s/photos/<theme>, open a NON-premium (no
// "Unsplash+" badge) photo's own page, read its og:image meta tag, keep
// only the photo-<id> path, and re-apply the query params below. Untried
// theme: a second Besfleet-style tipper truck in transit, or a loaded
// conveyor/screening-plant shot for more industrial variety.

export type SlideImage = {
  id: string;
  url: string; // clean, hotlink-safe Unsplash CDN URL, or a /media/ file hosted with the site
  alt: string;
  credit: string; // photographer and source — Unsplash doesn't require it; CC BY-SA (Wikimedia Commons) does
  theme: "quarry" | "machinery" | "delivery" | "material-closeup" | "application";
  sourceUrl?: string; // the photo's own page, for licences that ask for a link
};

function unsplashUrl(photoId: string, w = 1600, q = 80) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${w}&q=${q}`;
}

export const HERO_SLIDESHOW_IMAGES: SlideImage[] = [
  {
    id: "quarry-vehicle",
    url: unsplashUrl("photo-1659362549741-c32157cc71f4"),
    alt: "Heavy earthmoving equipment working a quarry face",
    credit: "Gianluigi Marin / Unsplash",
    theme: "quarry",
  },
  {
    id: "yellow-loader",
    url: unsplashUrl("photo-1659462391060-f9808509ca6a"),
    alt: "Yellow construction loader on site",
    credit: "Gianluigi Marin / Unsplash",
    theme: "machinery",
  },
  {
    id: "tipper-truck-transit",
    url: unsplashUrl("photo-1686945127170-ae15deda7bcc"),
    alt: "Tipper truck in transit on an unpaved haul road",
    credit: "Lars Portjanow / Unsplash",
    theme: "delivery",
  },
  {
    id: "stone-fragments",
    url: unsplashUrl("photo-1604178449672-3e7d72d5a09a"),
    alt: "Close-up of crushed stone fragments",
    credit: "Jon Moore / Unsplash",
    theme: "material-closeup",
  },
  {
    id: "gravel-surface",
    url: unsplashUrl("photo-1657199926989-04cae721c772"),
    alt: "Close-up of a graded gravel surface",
    credit: "Joshua Hoehne / Unsplash",
    theme: "material-closeup",
  },
  {
    id: "sand-pile-construction",
    url: unsplashUrl("photo-1686358244601-f6e65f67d4c6"),
    alt: "Aerial view of washed sand piles at a construction site",
    credit: "Iain / Unsplash",
    theme: "material-closeup",
  },
  {
    id: "river-pebbles-closeup",
    url: unsplashUrl("photo-1597188702867-0a052cddba09"),
    alt: "Close-up of naturally rounded river pebbles in grey and brown tones",
    credit: "Fyre Willow / Unsplash",
    theme: "material-closeup",
  },
  {
    id: "pale-dry-soil",
    url: unsplashUrl("photo-1606444695047-06a24fdb6f67"),
    alt: "Pale, dry cracked soil typical of agricultural land needing lime treatment",
    credit: "José Ignacio Pompé / Unsplash",
    theme: "application",
  },
  {
    id: "drainage-gravel-closeup",
    url: unsplashUrl("photo-1779718814161-6a5e558a9875"),
    alt: "Close-up textured surface of grey and brown drainage gravel",
    credit: "Tuan Nguyen / Unsplash",
    theme: "material-closeup",
  },
  {
    // Replaced Oct 2026: the earlier paving photo's setting didn't read as
    // South African. Same id, so saved slides and the "Civil & Road Works"
    // promotion pick this one up. Hosted with the site (public/media).
    id: "road-paving",
    url: "/media/road-works-cape-town.webp",
    alt: "Rollers and a paver laying fresh asphalt on a road-works project in Cape Town's city centre",
    credit: "Wisdom Nyaguwa / Wikimedia Commons, CC BY-SA 4.0",
    theme: "application",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Road_construction_in_Cape_Town_city_center.jpg",
  },
  // Business-line imagery (Oct 2026), checked by eye: both show the plant they're captioned with.
  {
    id: "excavator-yellow",
    url: unsplashUrl("photo-1580901369227-308f6f40bdeb"),
    alt: "Yellow tracked excavator with its bucket resting on loose rock",
    credit: "Gerold Hinzen / Unsplash",
    theme: "machinery",
  },
  {
    id: "demolition-bulldozer",
    url: unsplashUrl("photo-1677588508537-5106322c2d40"),
    alt: "Excavator demolishing a house, with rubble across the site",
    credit: "Vincenzo Cassano / Unsplash",
    theme: "machinery",
  },
];

export const MEDIA_BY_ID = new Map(HERO_SLIDESHOW_IMAGES.map((image) => [image.id, image]));

/**
 * The slideshow as it ships — the quarry-to-site story, each slide linking
 * to the part of the catalogue it shows. Staff can reorder, re-caption,
 * relink or hide slides in the admin (Site content → Homepage slideshow);
 * those edits are stored in the CMS and override this list.
 */
export const DEFAULT_SLIDES: { imageId: string; caption: string; href?: string }[] = [
  { imageId: "quarry-vehicle", caption: "Sourced from our approved partner quarries", href: "/delivery-areas" },
  { imageId: "stone-fragments", caption: "SANS 1083 crushed stone, 6.7mm to 53mm", href: "/products?category=crushed-stone" },
  { imageId: "gravel-surface", caption: "G1–G10 sub-base and base course", href: "/products?category=sub-base-base-course" },
  { imageId: "yellow-loader", caption: "Loaded at the partner supplier nearest your site", href: "/delivery-areas" },
  { imageId: "tipper-truck-transit", caption: "Delivered by Besfleet and 15+ tipper-truck partners", href: "/delivery-areas" },
  { imageId: "sand-pile-construction", caption: "River, plaster, building and concrete sand", href: "/products?category=sand-fine-aggregates" },
  { imageId: "drainage-gravel-closeup", caption: "French drain and filter stone", href: "/products?category=drainage-filter" },
  { imageId: "river-pebbles-closeup", caption: "Decorative pebble and stone, bulk or bagged", href: "/products?category=decorative-landscaping" },
  { imageId: "pale-dry-soil", caption: "Agricultural and dolomitic lime for soil correction", href: "/products?category=agricultural-industrial" },
  { imageId: "road-paving", caption: "Civil and road works, quoted per project", href: "/quote" },
];
