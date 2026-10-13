/** Key pages for site search and the shopping assistant: where each lives and the words people use for it. */
export type SitePage = { href: string; title: string; keywords: string };

export const SITE_PAGES: SitePage[] = [
  { href: "/departments", title: "All Departments", keywords: "departments categories all range catalogue browse shop" },
  { href: "/buy-online", title: "Buy Online — Priced Products", keywords: "buy online add to cart priced price shop now order online" },
  { href: "/coverage", title: "Check Delivery to Your Area", keywords: "check delivery town suburb location nearest supplier map where deliver" },
  { href: "/delivery-areas", title: "Delivery Areas & Charges", keywords: "delivery distance charges tipper province coverage km" },
  { href: "/suppliers", title: "Partner Supplier Network", keywords: "suppliers quarries partners network plants" },
  { href: "/ways-to-pay", title: "Ways to Pay", keywords: "payment card eft capitec payflex payjustnow float lulapay credit bnpl invoice" },
  { href: "/trade-accounts", title: "Trade Accounts", keywords: "trade account contractor volume civil bulk discount" },
  { href: "/reinforcing-steel", title: "Reinforcing & Structural Steel", keywords: "steel rebar reinforcing y-bar r-bar mesh brickforce tie wire cut bend structural angle tube beam" },
  { href: "/reinforcing-steel/cut-and-bend", title: "Cut & Bend to Your Bar Bending Schedule", keywords: "cut bend bbs bar bending schedule rebar fabrication shape code sans 282 steel fixing" },
  { href: "/bricks-blocks", title: "Bricks, Blocks & Walling", keywords: "bricks blocks clay cement stock face maxi nfp fbs lintel dpc damp proof air brick wall calculator masonry" },
  { href: "/paving", title: "Paving & Retaining", keywords: "paving pavers paver interlocking bevel slab kerb kerbs edging grass block driveway patio retaining terraforce gabion erosion calculator" },
  { href: "/drainage", title: "Drainage & Membranes", keywords: "drainage pipe pipes sewer upvc underground bend junction rodding subsoil french drain concrete pipe manhole culvert channel drain dpm damp proof membrane geotextile bidim weed geogrid calculator" },
  { href: "/roofing", title: "Roofing", keywords: "roofing roof sheet sheets sheeting ibr corrugated corrugated iron zinc zincalume chromadek galvanised clip lock concealed cut to length tiles roof tile double roman ridge capping flashing screws insulation aerolite isotherm sisalation underlay gutter downpipe calculator" },
  { href: "/design", title: "Architecture & Engineering Design (BAE)", keywords: "design architect architectural draughtsman draftsman plans house plans building plans council submission approval municipality additions alterations regularisation as built engineer structural engineer foundation inspection completion certificate retaining wall stormwater roads xa energy rational design bill of quantities boq quantity surveyor bbs nhbrc fee estimator bellwether bae" },
  { href: "/shop-by-stage", title: "Shop by Build Stage", keywords: "build stage foundations slab walls paving drainage landscaping site prep" },
  { href: "/quote", title: "Request a Quote", keywords: "quote rfq bulk civil price" },
  { href: "/faq", title: "FAQ", keywords: "questions help faq whatsapp compliance" },
  { href: "/contact", title: "Contact & Sales", keywords: "contact phone email address sales" },
];
