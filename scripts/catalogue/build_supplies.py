"""Builds services/pricing/data/supplies_catalogue.json — the building-supplies line (CAT-32..42).

Six departments approved by the owner on 17 Oct 2026. A unit is priced only where two SA retailers list the
same product (same make and size, or for commodity items the same specification) at a regular (non-promotion)
price: benchmark = the lowest, list = benchmark x 1.08. Everything else is quoted with the supplier.
Evidence: Cashbuild category pages and the Builders product search, checked 17 Oct 2026 (within robots.txt).
"""
import json, re, sys
from decimal import Decimal, ROUND_HALF_UP

CHECKED = "checked 2026-10-17 on Cashbuild category listings and the Builders product search (regular prices only; promotions excluded)"
QUOTED = "Quote-only — no retail benchmark"
READY = "Ready — benchmarked"

CATEGORIES = [
    ("doors-frames", "Doors & Door Frames", "CAT-32"),
    ("windows-frames", "Windows & Window Frames", "CAT-33"),
    ("fencing-wire-posts", "Fencing, Wire & Posts", "CAT-34"),
    ("gates-security", "Gates & Security", "CAT-35"),
    ("water-tanks-geysers", "Water Tanks & Geysers", "CAT-36"),
    ("water-supply-soil-pipe", "Water Supply & Soil Pipe", "CAT-37"),
    ("ceilings-drywall", "Ceilings, Drywall & Cornice", "CAT-38"),
    ("site-tools", "Site Tools & Consumables", "CAT-39"),
    ("ppe-site-safety", "PPE & Site Safety", "CAT-40"),
    ("waterproofing-sealants", "Waterproofing & Sealants", "CAT-41"),
    ("paint-coatings", "Paint & Coatings", "CAT-42"),
]


def money(x):
    return float(Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def slug(name):
    s = name.lower().replace("×", "x").replace("&", "and")
    s = re.sub(r"(\d)\.(\d)", r"\1-\2", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def unit(code, label, cb=None, b=None, note=None, weight=None):
    """cb / b: (listing name, regular price) at Cashbuild / Builders. Priced only with both and no note (a note says why they don't match)."""
    if cb and b and not note:
        bench = min(cb[1], b[1])
        src = f"Cashbuild {cb[0]} R{cb[1]:,.2f}; Builders {b[0]} R{b[1]:,.2f}. Benchmark = lowest R{bench:,.2f}, list = x 1.08. {CHECKED}."
        return {"unit": code, "unit_label": label, "weight_kg": weight, "market_benchmark_price": money(bench), "cost_basis_percent": 100,
                "cost_per_unit": money(bench), "markup_percent": 8, "list_price_per_unit": money(bench * 1.08), "pricing_status": READY,
                "source_note": src}
    seen = "; ".join(f"{r} {x[0]} R{x[1]:,.2f}" for r, x in (("Cashbuild", cb), ("Builders", b)) if x)
    why = note or "no two SA retailers list the same product at a regular price — quoted with the supplier"
    return {"unit": code, "unit_label": label, "weight_kg": weight, "market_benchmark_price": None, "cost_basis_percent": 100, "cost_per_unit": None,
            "markup_percent": 8, "list_price_per_unit": None, "pricing_status": QUOTED,
            "source_note": f"{why}." + (f" Seen: {seen} ({CHECKED})." if seen else "")}


PRODUCTS = []


def P(sku, name, cat, standard, desc, uses, handling, units, unit_size=None, manufacturer=None):
    PRODUCTS.append({
        "sku": sku, "slug": slug(name), "name": name, "category_slug": cat, "grading_standard": standard,
        "roof_profile": None, "thickness_mm": None, "coating": None, "cover_width_mm": None, "list_price_per_metre": None,
        "section": None, "timber_grade": None, "timber_treatment": None, "timber_finish": None,
        "manufacturer": manufacturer, "unit_size": unit_size, "specialist_characteristics": [],
        "description": desc, "typical_uses": uses, "handling_notes": handling, "units": units,
    })


EACH = "Each"
DOOR_HANDLING = "Store doors flat on bearers or upright against a wall, out of the sun and rain, and seal all six faces (top and bottom edges too) before hanging — unsealed doors swell and warp."
FRAME_HANDLING = "Steel frames are built into the brickwork as the walls go up: brace them plumb and square with a spreader, and fill the frame with mortar as you build. Prime any scratches in the red oxide before painting."
WINDOW_HANDLING = "Build steel windows into the wall as it rises, plumb and square, and bed them in mortar; protect the glass and sills from mortar splashes. Keep aluminium windows in their protective film until the plastering is done."

# --- CAT-32 Doors & door frames -------------------------------------------------------------------
P("AA-DOR-HC-813", "Hollow-Core Interior Door 813 × 2032 mm", "doors-frames", "Standard interior door, 813 × 2032 × 40 mm",
  "Hollow-core interior door in the standard 813 × 2032 × 40 mm size, hardboard faces on a timber frame — for bedrooms, bathrooms and cupboards. Supplied unhung, without a frame or ironmongery; finish (pre-primed, foil or veneer print) is confirmed on the quote.",
  ["Bedrooms, bathrooms and internal passages", "Rental units and RDP-style housing", "Replacement doors in standard frames"], DOOR_HANDLING,
  [unit("EACH", EACH, ("Wooden Door Print Hardboard Exposed Edges", 349.95), ("Swartland Kayo Hollow-core Sapele Print Interior Door 813 x 2032 mm", 549.0),
        note="Different makes and finishes, so not the same product; quoted with the supplier")])
P("AA-DOR-FL-813", "Framed & Ledged Exterior Door 813 × 2032 mm", "doors-frames", "Exterior door, 813 × 2032 × 40 mm",
  "Framed, ledged and braced timber door for outside openings, 813 × 2032 mm — the hard-wearing back, kitchen or outbuilding door. Timber species (pine, mixed or hardwood) and open- or closed-back are confirmed on the quote.",
  ["Back and kitchen doors", "Outbuildings, stores and garages", "Farm and site buildings"], DOOR_HANDLING,
  [unit("EACH", EACH, ("Wooden Door Frame & Ledge Open Back B Grade", 1035.95), None)])
P("AA-DOR-8P-813", "8-Panel Exterior Door 813 × 2032 mm", "doors-frames", "Exterior door, 813 × 2032 × 40 mm",
  "Solid 8-panel timber exterior door, 813 × 2032 mm — the classic front door. Timber (pine, meranti-type hardwood or mixed) and a standard or stable (split) leaf are confirmed on the quote.",
  ["Front and main entrance doors", "Stable-door options for kitchens and farmhouses"], DOOR_HANDLING,
  [unit("EACH", EACH, ("Door 8 Panel Mixed Timber", 1299.95), ("Swartland Kayo 8 Panel Hardwood Colonia SEMI Exterior Door 813 x 2032 mm", 1799.0),
        note="Mixed timber and hardwood doors aren't the same product; quoted with the supplier")])
P("AA-DOR-SLD-ALU-1800", "Aluminium Sliding Door 1800 × 2100 mm", "doors-frames", "Two-panel aluminium sliding door, safety glass",
  "Two-panel aluminium sliding patio door, about 1800 × 2100 mm, with safety glass and lockset. Bronze or charcoal, and the exact opening size, are confirmed on the quote.",
  ["Patio and garden openings", "Lounges opening onto a stoep or braai area"],
  "Keep the frame in its protective film and the glass panels upright on edge until fitting. Fit into a square, plumb opening with a level threshold.",
  [unit("EACH", EACH, ("Aluminium Sliding Door 1790x2090", 3199.95), ("Swartland Kenzo Aluminium Sliding Door Charcoal 1800 x 2100 mm (promotion)", 3899.0),
        note="Different makes, and the Builders price was a promotion; quoted with the supplier")])
P("AA-DOR-FRM-STL-115", "Steel Door Frame 813 × 2032 mm (Half-Brick, 115 mm)", "doors-frames", "Pressed-steel door frame, red oxide primed",
  "Pressed-steel door frame for an 813 × 2032 mm door in a half-brick (115 mm) wall, red-oxide primed, with hinges welded on. Left- or right-hand opening is chosen on the quote.",
  ["Internal doors in half-brick walls", "New builds and alterations"], FRAME_HANDLING,
  [unit("EACH", EACH, ("Steel Door Frame Left Hand (wall width not stated)", 303.95), ("Robmeg Left Hand Steel Door Frame 813 x 2032 x 115mm", 589.0),
        note="Cashbuild doesn't state the wall width, so the listings can't be matched; quoted with the supplier")])
P("AA-DOR-FRM-STL-230", "Steel Door Frame 813 × 2032 mm (Full-Brick, 230 mm)", "doors-frames", "Pressed-steel door frame, red oxide primed",
  "Heavy-duty pressed-steel door frame for an 813 × 2032 mm door in a full-brick (230 mm) external wall, red-oxide primed. Left- or right-hand, and standard or stable, are chosen on the quote.",
  ["External doors in full-brick walls", "Kitchen and back doors"], FRAME_HANDLING,
  [unit("EACH", EACH, ("Steel Door Frame Heavy Duty Right Hand (wall width not stated)", 571.95), ("Robmeg Steel Door Frame Right Hand Opening (813mm x 2032 x 230mm)", 1699.0),
        note="Cashbuild doesn't state the wall width, so the listings can't be matched; quoted with the supplier")])

# --- CAT-33 Windows ---------------------------------------------------------------------------------
STEEL_W = "SANS 727 steel window, F7 profile, red oxide primed"


def steel_window(code, size, cb, b, desc_extra, hand=None):
    name = f"Steel Window Frame {code} F7{' ' + hand if hand else ''}"
    P(f"AA-WIN-STL-{code}{'-' + hand[0] if hand else ''}", name, "windows-frames", STEEL_W,
      f"Standard {code} steel window in the F7 profile, {size}, red-oxide primed and ready to build in. {desc_extra} Glazing is by your glazier or on the quote.",
      ["Houses, outbuildings and site buildings", "Standard-size openings in brick and block walls"], WINDOW_HANDLING,
      [unit("EACH", EACH, cb, b)], unit_size=size)


steel_window("NE1", "about 508 × 629 mm", ("Window Frame Steel Ne1 F7", 281.95), ("Robmeg FX7 NE1 Window Frame", 259.0), "A single small pane — toilets, pantries and stores.")
steel_window("NE2", "about 1022 × 629 mm", ("Window Frame Steel Ne2 F7 Left Hand", 379.95), ("Robmeg F7 NE2 LH P Window Frame", 499.0), "Two panes with an opening casement.", "Left Hand")
steel_window("NE4", "about 1022 × 949 mm", ("Window Frame Steel Ne4 F7", 616.95), ("Robmeg FX7 NE4 P Window Frame", 855.0), "Four panes with opening casements.")
steel_window("NC2", "about 1022 × 949 mm", ("Window Frame Steel Nc2 F7 Left Hand", 456.95), ("Robmeg F7 NC2 LH P Window Frame", 419.0), "Two panes, side-hung casement.", "Left Hand")
steel_window("NC2F", "about 1022 × 949 mm with fanlight", ("Window Frame Steel Nc2f F7 Left Hand", 640.95), ("Robmeg NC2F Left Hand Steel Window Frame", 589.0), "Casement with a fanlight above.", "Left Hand")
steel_window("NC4F", "1511 × 949 mm", ("Window Frame Steel Nc4f F7", 942.95), ("Robmeg F7 NC4F P Window Frame", 799.0), "The common bedroom window: casements with fanlights.")
steel_window("ND4F", "1511 × 1245 mm", ("Window Frame Steel Nd4f F7", 1106.95), ("Robmeg F7 ND4F P Window Frame", 999.0), "Taller lounge and bedroom window with fanlights.")
P("AA-WIN-ALU-1212", "Aluminium Window 1200 × 1200 mm (Bronze)", "windows-frames", "Aluminium window, bronze anodised, clear glass",
  "Aluminium top-hung or side-hung window about 1200 × 1200 mm, bronze, glazed with clear glass. The series (economy 28 mm or heavier), opening configuration and glass are confirmed on the quote.",
  ["Lounges and bedrooms", "Alterations where steel windows are being replaced"], WINDOW_HANDLING,
  [unit("EACH", EACH, ("Window Frame Aluminium ECO-PTT1212 Left Hand", 1289.95), ("Prestige Top Hung 2v Aluminium Window - Bronze (1200 x 1200mm)", 2599.0),
        note="Different series and configurations; quoted with the supplier")])
P("AA-WIN-ALU-1515", "Aluminium Window 1500 × 1500 mm (Bronze)", "windows-frames", "Aluminium window, bronze anodised, clear glass",
  "Aluminium window about 1500 × 1500 mm, bronze, glazed with clear glass — the larger lounge window. Series and configuration are confirmed on the quote.",
  ["Lounges and dining rooms", "Offices and classrooms"], WINDOW_HANDLING,
  [unit("EACH", EACH, ("Window Frame Aluminium 28-ptt1515 Bronze Clear", 2069.95), ("Prestige Top Hung 2v Aluminium Window - Bronze (1500 x 1500mm)", 3499.0),
        note="Different series and configurations; quoted with the supplier")])

# --- CAT-34 Fencing, wire & posts ---------------------------------------------------------------------
FENCE_HANDLING = "Keep wire coils and mesh rolls off the ground and dry until use. Wear gloves and eye protection when tensioning or cutting — a cut strand under tension whips back."
P("AA-FEN-DMESH-1200", "Diamond Mesh Fencing 1.2 m × 30 m", "fencing-wire-posts", "Galvanised diamond mesh, 75 mm aperture",
  "Galvanised diamond (chain-link) mesh, 1.2 m high, 30 m roll, 75 mm aperture. Wire gauge (light or heavy) is confirmed on the quote.",
  ["Garden and boundary fencing", "Animal enclosures and site fencing"], FENCE_HANDLING,
  [unit("ROLL", "30 m roll", None, ("African Gate and Fence Diamond Mesh L/G 1200 x 75 x 30 m x 1.8 mm", 1299.0))])
P("AA-FEN-DMESH-1800", "Diamond Mesh Fencing 1.8 m × 30 m", "fencing-wire-posts", "Galvanised diamond mesh, 75 mm aperture",
  "Galvanised diamond (chain-link) mesh, 1.8 m high, 30 m roll, 75 mm aperture — the standard security-height boundary fence. Wire gauge is confirmed on the quote.",
  ["Boundary and security fencing", "Sports fields and yards"], FENCE_HANDLING,
  [unit("ROLL", "30 m roll", None, ("African Gate and Fence Diamond Mesh L/G 1800 x 75 x 1.8 mm x 30 m", 1599.0))])
P("AA-FEN-GW-315-2", "Galvanised Wire 3.15 mm × 2 kg", "fencing-wire-posts", "Galvanised mild-steel wire, 3.15 mm (10 gauge)",
  "Galvanised fencing wire, 3.15 mm (10 gauge), 2 kg coil — line wire for straining, tying off and repairs.",
  ["Line and straining wire on farm and boundary fences", "Tying mesh to posts"], FENCE_HANDLING,
  [unit("EACH", "2 kg coil", ("Galvanised Wire 2kg 10gge 3.15mm", 97.95), ("African Gate and Fence Galvanised Wire 3.15 mm x 2 kg", 99.0))])
P("AA-FEN-GW-4-2", "Galvanised Wire 4 mm × 2 kg", "fencing-wire-posts", "Galvanised mild-steel wire, 4 mm (8 gauge)",
  "Galvanised fencing wire, 4 mm (8 gauge), 2 kg coil — heavy line and straining wire.",
  ["Straining wire for mesh fences", "Stays and corner ties"], FENCE_HANDLING,
  [unit("EACH", "2 kg coil", ("Galvanised Wire 2kg 8gge 4mm", 92.95), ("African Gate and Fence Galvanised Wire 4 mm x 2 kg", 125.0))])
P("AA-FEN-GW-4-5", "Galvanised Wire 4 mm × 5 kg", "fencing-wire-posts", "Galvanised mild-steel wire, 4 mm (8 gauge)",
  "Galvanised fencing wire, 4 mm (8 gauge), 5 kg coil (about 50 m).",
  ["Straining and line wire on longer fence runs"], FENCE_HANDLING,
  [unit("EACH", "5 kg coil", ("Galvanised Wire 5kg X 4mm X 50m", 184.95), ("African Gate and Fence Galvanised Wire 4 mm x 5 kg", 220.0))])
P("AA-FEN-GW-2-5", "Galvanised Wire 2 mm × 5 kg", "fencing-wire-posts", "Galvanised mild-steel wire, 2 mm (14 gauge)",
  "Galvanised tie and binding wire, 2 mm (14 gauge), 5 kg coil (about 200 m).",
  ["Tying mesh to straining wires", "General site tying"], FENCE_HANDLING,
  [unit("EACH", "5 kg coil", ("Galvanised Wire 5kg X 2mm X 200m", 184.95), ("African Gate and Fence Galvanised Wire 2 mm x 5 kg", 249.0))])
P("AA-FEN-RAZOR-500-15", "Razor Wire Flat Wrap 500 mm × 15 m", "fencing-wire-posts", "Galvanised flat-wrap razor wire, 500 mm",
  "Flat-wrap galvanised razor wire, 500 mm high, 15 m coil — fixed to the top of walls and fences.",
  ["Wall-top and fence-top security", "Industrial yards and sites"],
  "Handle only with cut-resistant gloves, sleeves and eye protection, and keep the coil strapped until it is fixed. Never stretch razor wire by hand.",
  [unit("EACH", "15 m coil", ("Razor Wire Flat Wrap 500mm X 15m", 339.95), ("African Gate and Fence Razor Wire Flat Wrap 500 mm x 15m", 399.0))])
P("AA-FEN-BARB-SS", "Barbed Wire (Single Strand)", "fencing-wire-posts", "Galvanised single-strand barbed wire",
  "Galvanised single-strand barbed wire for farm and boundary fences. Roll length and mass are confirmed on the quote.",
  ["Farm and grazing fences", "Top strands on boundary fences"], FENCE_HANDLING,
  [unit("ROLL", "Roll", ("Barbed Wire Single Strand 515m Light Duty", 412.95), ("African Gate and Fence Barbed Wire Single Strand Roll 2 mm x 17.5 kg", 1099.0),
        note="Sold by length at one retailer and by mass at the other; quoted with the supplier")])
P("AA-FEN-YSTD-1850", "Y-Standard Fence Post 1.85 m", "fencing-wire-posts", "Steel Y-standard (star picket), with holes",
  "Steel Y-standard fence post, 1.85 m, punched for wire — the line post for mesh and wire fences.",
  ["Line posts for diamond-mesh and wire fences", "Temporary site fencing"], FENCE_HANDLING,
  [unit("EACH", EACH, ("Standard Y with Holes 1.85m", 144.95), ("African Gate Y Standard Fence Post 1.85 m 3.7 kg", 149.0))])
P("AA-FEN-YSTD-2400", "Y-Standard Fence Post 2.4 m", "fencing-wire-posts", "Steel Y-standard (star picket), with holes",
  "Steel Y-standard fence post, 2.4 m, punched for wire — for 1.8 m security-height fences.",
  ["Line posts for 1.8 m mesh fences"], FENCE_HANDLING,
  [unit("EACH", EACH, ("Standard Y-2.4m with Holes", 192.95), ("African Gate and Fence Y Standard 2450 mm", 285.0))])
P("AA-FEN-DROP-1800", "Steel Fence Dropper 1.8 m", "fencing-wire-posts", "Steel fence dropper",
  "Steel dropper, 1.8 m, clipped to the wires between posts to keep their spacing.",
  ["Wire and mesh fences between Y-standards"], FENCE_HANDLING,
  [unit("EACH", EACH, ("Dropper Steel 1.8m 1.0kg", 33.95), ("African Gate and Fence Dropper Long 1800 mm", 59.0))])
P("AA-FEN-PAL-POST-76", "Palisade Post Square 76 mm × 2.4 m", "fencing-wire-posts", "Square steel palisade post, 76 × 1.6 mm wall",
  "Square steel palisade post, 76 mm, 1.6 mm wall, 2.4 m long — concreted in to carry palisade panels.",
  ["Palisade fencing", "Gate posts on light gates"], FENCE_HANDLING,
  [unit("EACH", EACH, ("Palisade Post Square 76mm x 2.4m x 1.6mm", 299.95), ("Macsteel Square Palisade Post 2400 x 76 x 1.6 mm", 499.0))])
P("AA-FEN-PAL-1830", "Palisade Fence Panel 1.8 × 3.0 m", "fencing-wire-posts", "Steel palisade panel",
  "Steel palisade fence panel, 1.8 m high and 3.0 m wide — bolted to square palisade posts. Pale profile and coating (primed or galvanised) are confirmed on the quote.",
  ["Security fencing for homes, schools and industrial sites"], FENCE_HANDLING,
  [unit("EACH", EACH, ("Palisade Econo 1.8 X 3m", 732.95), None)])

# --- CAT-35 Gates & security --------------------------------------------------------------------------
P("AA-GATE-DM-0918", "Diamond Mesh Gate Single 0.9 × 1.8 m", "gates-security", "Galvanised tube frame, diamond mesh infill",
  "Single-leaf pedestrian gate, 0.9 m wide and 1.8 m high, galvanised tube frame with diamond-mesh infill, hinges and latch.",
  ["Pedestrian gates in mesh fences"], FENCE_HANDLING,
  [unit("EACH", EACH, ("Gate Diamond Mesh 32mm X 50mm Single Leaf 0.9 (height not stated in listing)", 694.95), ("African Gate and Fence Diamond Mesh Gate Single 900 mm x 1.8 m", 760.0),
        note="The Cashbuild listing name is cut short, so the height can't be confirmed; quoted with the supplier")])
P("AA-GATE-DM-3018", "Diamond Mesh Gate Double 3.0 × 1.8 m", "gates-security", "Galvanised tube frame, diamond mesh infill",
  "Double-leaf vehicle gate, 3.0 m wide and 1.8 m high, galvanised tube frame with diamond-mesh infill.",
  ["Driveway and yard gates in mesh fences"], FENCE_HANDLING,
  [unit("EACH", EACH, ("Gate Diamond Mesh 32mmx50mm Double Leaf 3.0m (height not stated in listing)", 1279.95), ("African Gate and Fence Diamond Mesh Gate Pr 1.8 x 3 m", 2699.0),
        note="The Cashbuild listing name is cut short, so the height can't be confirmed; quoted with the supplier")])
P("AA-GATE-SEC-DOOR", "Security Gate for Doorways (Single)", "gates-security", "Steel security gate for a standard doorway",
  "Hinged steel security gate for a standard doorway (about 770 × 1950 mm), white powder-coated, with lock. Make, size and fitting are confirmed on the quote.",
  ["Front and back doors", "Flats and townhouses"],
  "Fit to a sound frame or reveal with the fixings supplied; the locking side needs solid masonry.",
  [unit("EACH", EACH, ("Security Gate Econo White 760mmx1950mm", 999.95), ("Xpanda Security Gate Regal White 770 x 1950 mm", 2299.0),
        note="Different makes and ratings; quoted with the supplier")])

# --- CAT-36 Water tanks & geysers ---------------------------------------------------------------------
TANK_HANDLING = "Stand the tank on a level, compacted base or concrete slab at least as wide as the tank — never on bricks or loose soil. Fit the outlet before filling and keep the lid closed against mosquitoes and algae."
P("AA-TNK-AT-5000", "Vertical Water Tank 5,000 L (Africa Tanks)", "water-tanks-geysers", "Rotomoulded polyethylene tank, food-grade, UV-stabilised",
  "Africa Tanks 5,000 litre vertical water storage tank, rotomoulded UV-stabilised polyethylene — rainwater harvesting and backup storage. Colour is confirmed when ordering.",
  ["Rainwater harvesting", "Backup water for homes, schools and sites"], TANK_HANDLING,
  [unit("EACH", EACH, ("Water Tank 5000LT Africa Tank", 5562.95), ("Africa Tanks 5000 L Vertical Water Storage (Green)", 5999.0))], manufacturer="Africa Tanks")
P("AA-TNK-JJ-2400", "JoJo Vertical Water Tank 2,400 L", "water-tanks-geysers", "Rotomoulded polyethylene tank, food-grade, UV-stabilised",
  "JoJo 2,400 litre vertical water tank — the common household size for rainwater and backup storage.",
  ["Rainwater harvesting off a house roof", "Backup water during outages"], TANK_HANDLING,
  [unit("EACH", EACH, ("Jojo 2400lt Vertical Water Tank", 2599.95), None)], manufacturer="JoJo")
P("AA-TNK-JJ-4750", "JoJo Vertical Water Tank 4,750 L", "water-tanks-geysers", "Rotomoulded polyethylene tank, food-grade, UV-stabilised",
  "JoJo 4,750 litre vertical water tank for larger households, schools and sites.",
  ["Rainwater harvesting", "Site and farm water storage"], TANK_HANDLING,
  [unit("EACH", EACH, ("Jojo 4750lt Vertical Water Tank", 5349.95), None)], manufacturer="JoJo")
P("AA-GEY-150-600", "Electric Geyser 150 L, 600 kPa", "water-tanks-geysers", "SANS 151 electric storage water heater",
  "150 litre electric geyser rated for 600 kPa mains pressure — the standard household size. Make and energy rating are confirmed on the quote; installation must be by a registered plumber and comes with a certificate of compliance.",
  ["New homes and geyser replacements"],
  "Keep upright and in the carton until installed. Installation, the drip tray, valves and the certificate of compliance are a registered plumber's job under SANS 10254.",
  [unit("EACH", EACH, ("Kwikot Superline 150l 600kpa B-Grade Geyser", 4998.95), ("Kwikot DSG-150-5 Superline Dual Geyser 150 L (pressure rating not stated)", 4799.0),
        note="The Builders listing doesn't state the pressure rating; quoted with the supplier")])

# --- CAT-37 Water supply & soil pipe -------------------------------------------------------------------
PIPE_HANDLING = "Store pipe supported along its length, out of direct sun. Cut square and deburr, and use the fittings and jointing method the maker specifies."
for size, cb6, b6, cb25, b25 in (("15", 34.95, 55.0, 124.95, 195.0), ("22", 59.95, 99.0, 239.95, 385.0)):
    P(f"AA-PLB-POLYCOP-{size}-6", f"Polycop Pipe {size} mm × 6 m", "water-supply-soil-pipe", "Polybutylene hot- and cold-water pipe (Polycop)",
      f"Polycop polybutylene water pipe, {size} mm, 6 m length — for hot and cold water supply inside the house, joined with compatible push-fit or compression fittings.",
      ["Hot and cold water supply", "Geyser and tap connections"], PIPE_HANDLING,
      [unit("EACH", "6 m length", ("Polycop Pipe " + size + "mm x 6m", cb6), ("MacNeil Polycop Pipe " + size + " mm x 6 m", b6))], manufacturer="MacNeil (Polycop)")
    P(f"AA-PLB-POLYCOP-{size}-25", f"Polycop Pipe {size} mm × 25 m Roll", "water-supply-soil-pipe", "Polybutylene hot- and cold-water pipe (Polycop)",
      f"Polycop polybutylene water pipe, {size} mm, 25 m roll.",
      ["Hot and cold water supply on new builds", "Long runs with fewer joints"], PIPE_HANDLING,
      [unit("ROLL", "25 m roll", ("Polycop Pipe " + size + "mm x 25m", cb25), ("MacNeil Polycop Pipe " + size + " mm x 25 m Roll", b25))], manufacturer="MacNeil (Polycop)")
P("AA-PLB-SV-110-6", "Soil & Vent Pipe 110 mm × 6 m", "water-supply-soil-pipe", "uPVC soil and vent pipe, SANS 967",
  "uPVC soil and vent pipe, 110 mm, 6 m length — the above-ground pipe from the toilet to the drain and up the vent stack.",
  ["Toilet stacks and vent pipes", "Above-ground drainage on houses"], PIPE_HANDLING,
  [unit("EACH", "6 m length", ("Soil & Vent Pipe 110mm X 6m E-spec", 427.95), ("Marley Pipes PVC Soil and Vent Pipe White 110 x 6000 mm", 549.0))])
P("AA-PLB-COPPER-15", "Copper Pipe 15 mm × 5.5 m (Class 0)", "water-supply-soil-pipe", "SANS 460 copper tube",
  "SANS 460 copper water tube, 15 mm, 5.5 m length — the traditional hot- and cold-water pipe, soldered or with compression fittings. Wall class is confirmed on the quote.",
  ["Hot and cold water supply", "Geyser connections and exposed runs"], PIPE_HANDLING,
  [unit("EACH", "5.5 m length", None, ("Saffer 15 mm Copper Pipe 460/2 5.5 m", 1205.0))])

# --- CAT-38 Ceilings, drywall & cornice ----------------------------------------------------------------
BOARD_HANDLING = "Store boards flat on bearers in the dry — never on edge or on the ground — and carry them on edge. Fix to brandering at the centres in the maker's guide and leave to acclimatise before jointing."
for w, l, cb, b in ((900, 3000, 199.95, 249.0), (900, 3600, 239.95, 279.0), (1200, 3000, 262.95, 209.0), (1200, 3600, 298.95, 249.0)):
    P(f"AA-CLG-RHINO-64-{w}-{l}", f"Rhinoboard Ceiling Board 6.4 mm {w} × {l} mm", "ceilings-drywall", "Gypsum plasterboard, 6.4 mm (Gyproc RhinoBoard)",
      f"Gyproc RhinoBoard 6.4 mm gypsum ceiling board, {w} × {l} mm — nailed or screwed to 38 × 38 mm brandering and skimmed with RhinoLite.",
      ["Ceilings under pitched roofs", "Replacing old ceiling boards"], BOARD_HANDLING,
      [unit("SHEET", "Board", (f"Rhinoboard 6.4mm {w} X {l}mm", cb), (f"Gyproc Rhinoboard 6.4 x {w} x {l} mm" if w != 1200 or l != 3000 else "Gyproc RhinoBoard 6.4 mm Plasterboard – 1200 x 3000 mm Ceiling", b))],
      unit_size=f"{w} × {l} × 6.4 mm", manufacturer="Gyproc (Saint-Gobain)")
for l, cb, b in ((3000, 69.95, 59.0), (3600, 82.95, 79.0)):
    P(f"AA-CLG-COVE-75-{l}", f"Rhino Cove Cornice 75 mm × {l / 1000:.1f} m", "ceilings-drywall", "Gypsum cove cornice, 75 mm",
      f"Gypsum cove cornice, 75 mm, {l / 1000:.1f} m length — the plain curved joint between wall and ceiling, fixed with cornice adhesive.",
      ["Wall-to-ceiling joints in plastered rooms"], "Store flat and dry; cut mitres with a fine saw and mitre box, and fix with cornice adhesive on clean, dust-free surfaces.",
      [unit("EACH", f"{l / 1000:.1f} m length", (f"Rhino Cove Cornice 75x{l}mm", cb), (f"Gyproc Cove Rhino Cornice {l} x 25 x 75 mm", b))], manufacturer="Gyproc (Saint-Gobain)")
P("AA-CLG-RHINOLITE-10", "RhinoLite Skimming Plaster 10 kg", "ceilings-drywall", "Gypsum skimming plaster",
  "Gyproc RhinoLite gypsum skimming plaster, 10 kg bag — a thin smooth coat over ceiling boards and walls.",
  ["Skimming RhinoBoard ceilings", "Patching and smoothing plaster"], "Keep bags sealed, off the floor and dry; mix only what you can apply in the working time.",
  [unit("EACH", "10 kg bag", ("Rhinolite Multipurpose 10KG", 159.95), ("Gyproc Rhinolite Skimming Plaster 10 kg", 175.0))], manufacturer="Gyproc (Saint-Gobain)")
P("AA-CLG-RHINOLITE-40", "RhinoLite Skimming Plaster 40 kg", "ceilings-drywall", "Gypsum skimming plaster",
  "Gyproc RhinoLite gypsum skimming plaster, 40 kg bag — the contractor size.",
  ["Skimming ceilings and walls on larger jobs"], "Keep bags sealed, off the floor and dry; mix only what you can apply in the working time.",
  [unit("EACH", "40 kg bag", ("Rhinolite Multipurpose 40KG", 467.95), ("Gyproc Rhinolite Skimming Multipurpose Ceiling Plaster 40 kg (promotion)", 399.0),
        note="The Builders price was a promotion, so only one regular price was found; quoted with the supplier")], manufacturer="Gyproc (Saint-Gobain)")
P("AA-CLG-PVC-6-300", "PVC Ceiling Board 6 × 300 mm × 3.9 m (Matt White)", "ceilings-drywall", "PVC tongue-and-groove ceiling panel, 6 mm",
  "PVC tongue-and-groove ceiling panel, 6 mm thick, 300 mm wide, 3.9 m long, matt white — washable and moisture-proof, fixed to brandering with clips or staples.",
  ["Bathrooms, kitchens and stoeps", "Low-maintenance ceilings"], "Store flat, out of the sun; leave a small gap at the walls for expansion and finish with the matching trims.",
  [unit("EACH", "3.9 m panel", ("PVC Ceiling Matt White 6mmx300mmx3.9M", 84.95), ("PVC Ceilings South Africa Matt White PVC Ceiling Board 6 x 300 x 3900 mm", 110.0))])
P("AA-CLG-CORNICE-ADH-5", "Cornice Adhesive 5 kg", "ceilings-drywall", "Acrylic cornice adhesive and filler",
  "Ready-mixed acrylic cornice adhesive and filler, 5 kg tub — fixes gypsum and polystyrene cornice and fills the joints.",
  ["Fixing cornice and ceiling roses"], "Keep the lid on and protect from frost; apply to clean, dust-free surfaces.",
  [unit("EACH", "5 kg tub", ("Acrylic Adhesive & Filler 5kg", 309.95), ("Alcolin Cornice Adhesive White 5 kg", 467.0), note="Different makes; quoted with the supplier")])

# --- CAT-39 Site tools & consumables -------------------------------------------------------------------
TOOL_HANDLING = "Clean tools at the end of every day — set mortar and plaster ruin trowels and floats — and store them dry."
P("AA-TL-BOLSTER-100", "Brick Bolster 100 mm (Lasher)", "site-tools", "Hardened steel brick bolster",
  "Lasher brick bolster, 100 mm blade — for cutting bricks and blocks with a club hammer.",
  ["Cutting bricks and blocks", "Chasing and trimming masonry"], TOOL_HANDLING + " Wear eye protection when cutting.",
  [unit("EACH", EACH, ("Lasher Bolster Brick 100Mm", 257.95), ("Lasher Brick Bolster 100 mm", 249.0))], manufacturer="Lasher")
P("AA-TL-BOLSTER-55", "Electrician's Bolster 55 mm (Lasher)", "site-tools", "Hardened steel bolster",
  "Lasher electrician's bolster, 55 mm blade — for chasing walls for conduit and lifting floorboards.",
  ["Chasing walls for conduit", "Small cutting work"], TOOL_HANDLING + " Wear eye protection when cutting.",
  [unit("EACH", EACH, ("Lasher Bolster Electrician 55Mm", 189.95), ("Lasher Bolster Electricians 55mm", 179.0))], manufacturer="Lasher")
P("AA-TL-LEVEL-1200", "Spirit Level 1200 mm (Ross)", "site-tools", "Aluminium spirit level",
  "Ross aluminium spirit level, 1200 mm — the bricklayer's level for plumbing and levelling courses.",
  ["Bricklaying and blockwork", "Setting frames, posts and shuttering"], "Keep it clean and don't use it as a straight edge for screeding — a dropped or bent level reads false.",
  [unit("EACH", EACH, ("Ross Level Aluminium 1200mm", 284.95), ("Ross Spirit Level 1200 mm", 249.0))], manufacturer="Ross")
P("AA-TL-LEVEL-600", "Spirit Level 600 mm (Ross)", "site-tools", "Aluminium spirit level",
  "Ross aluminium spirit level, 600 mm.",
  ["Frames, lintels and general levelling"], "Keep it clean and dry; check it against a known level now and then.",
  [unit("EACH", EACH, ("Ross Level Aluminium 600mm", 169.95), ("Ross Spirit Level 600 mm", 159.0))], manufacturer="Ross")
P("AA-TL-LINE-100", "Builder's Line 1.0 mm × 100 m", "site-tools", "Nylon builder's line, 1.0 mm (90 lb)",
  "Nylon builder's line, 1.0 mm (about 90 lb), 100 m — for setting out and keeping brick courses straight.",
  ["Setting out foundations", "Bricklaying and paving lines"], "Wind it back on the reel when you're done; replace a line that has frayed.",
  [unit("EACH", "100 m reel", ("Builders Line 1.00mm 100m 90lbx0.90mm(90lb)", 59.95), ("Builders 90 lbs Builders Line 1 mm x 100 m", 39.99))])
P("AA-TL-WHEELBARROW-65", "Concrete Wheelbarrow 65 L", "site-tools", "Steel-pan builder's wheelbarrow",
  "Heavy-duty builder's wheelbarrow with a 65 litre steel pan for concrete, mortar and rubble. Make and wheel (pneumatic or puncture-free) are confirmed on the quote.",
  ["Moving concrete, mortar, sand and rubble on site"], "Wash the pan out before concrete sets in it and keep the tyre pumped.",
  [unit("EACH", EACH, None, ("Lasher Builder Concrete Wheelbarrow", 1499.0))])
P("AA-TL-SHOVEL-RN", "Round-Nose Shovel", "site-tools", "Steel round-nose shovel",
  "Round-nose shovel for digging and moving sand, stone and soil. Make is confirmed on the quote.",
  ["Mixing concrete and mortar", "Moving sand, stone and soil"], TOOL_HANDLING,
  [unit("EACH", EACH, None, ("Lasher Shovel Round Nose MB2 MHSS", 359.0))])
P("AA-TL-SPADE", "Digging Spade", "site-tools", "Steel digging spade",
  "Square-blade digging spade for trenches and footings. Make is confirmed on the quote.",
  ["Digging foundations and trenches", "Edging and garden work"], TOOL_HANDLING,
  [unit("EACH", EACH, None, ("Lasher Digging Spade No. 2 660 mm (promotion)", 229.0))])
P("AA-TL-TROWEL-BRICK", "Brick Trowel 280 mm", "site-tools", "Forged steel brick trowel",
  "Brick trowel with a 280 mm blade for laying bricks and blocks. Make and handle are confirmed on the quote.",
  ["Bricklaying and blockwork"], TOOL_HANDLING,
  [unit("EACH", EACH, ("Trowel Brick 275-280mm Wooden Handle", 114.95), ("Lasher Brick Trowel 280 mm", 229.0), note="Different makes; quoted with the supplier")])
P("AA-TL-CLUB-18", "Club Hammer 1.8 kg", "site-tools", "Steel club (lump) hammer",
  "Club hammer, 1.8 kg, for driving bolsters and chisels and light demolition. Make and handle are confirmed on the quote.",
  ["Cutting bricks with a bolster", "Driving pegs and chisels"], TOOL_HANDLING,
  [unit("EACH", EACH, ("Hammer Club 1.8kg Fibre Glass Handle", 479.95), ("Aftool 1.8 kg Club Hammer Black and Blue", 299.0), note="Different makes; quoted with the supplier")])

# --- CAT-40 PPE & site safety -------------------------------------------------------------------------
PPE_HANDLING = "PPE only protects when it fits and is worn: replace hard hats after an impact or when the shell is cracked or chalky, and anything torn or worn through."
P("AA-PPE-BARRIER-100", "Barrier Tape Red/White 75 mm × 100 m", "ppe-site-safety", "Polyethylene barrier tape",
  "Red and white barrier tape, 75 mm wide, 100 m roll — to cordon off excavations, wet concrete and hazards.",
  ["Cordoning off trenches and excavations", "Marking out no-go areas on site"], "Tie off to stakes or barriers; tape marks a hazard but doesn't stop a fall — open excavations need proper barriers.",
  [unit("ROLL", "100 m roll", ("Red/white Barrier Tape 75mm Wide X 50mic X 100m", 44.95), ("Bidvest Barrier Tape - Red/White (75mm x 100m)", 56.09))])
P("AA-PPE-HARDHAT", "Hard Hat", "ppe-site-safety", "Industrial safety helmet (SANS 1397)",
  "Industrial hard hat with adjustable harness. Colour and make are confirmed on the quote.",
  ["Compulsory head protection on building sites"], PPE_HANDLING,
  [unit("EACH", EACH, ("White Industrial Hard Hat with Open Vent", 27.95), ("Evrigard Guardian Hard Hat White", 149.0), note="Different makes and ratings; quoted with the supplier")])
P("AA-PPE-VEST", "Reflective Vest", "ppe-site-safety", "High-visibility reflective vest",
  "High-visibility reflective vest, lime or orange. Size and make are confirmed on the quote.",
  ["Site workers, flagmen and delivery receivers"], PPE_HANDLING,
  [unit("EACH", EACH, ("Reflective Vest Large", 57.95), ("Watt Econo Reflective Vest Lime and Silver", 79.0), note="Different makes; quoted with the supplier")])
P("AA-PPE-BOOTS", "Safety Boots, Steel Toe", "ppe-site-safety", "Steel-toecap safety boot (SANS 20345)",
  "Steel-toecap safety boots. Size and make are confirmed on the quote.",
  ["Foot protection on site"], PPE_HANDLING,
  [unit("EACH", "Pair", ("Safety Boots Steel Toe Size 8", 344.95), ("Builders Safety Boots Size 7", 359.0), note="Different makes; quoted with the supplier")])
P("AA-PPE-GLOVES-LEATHER", "Chrome Leather Work Gloves", "ppe-site-safety", "Chrome leather gloves",
  "Chrome leather work gloves for handling bricks, steel and wire. Cuff length and make are confirmed on the quote.",
  ["Handling bricks, blocks, steel and wire"], PPE_HANDLING,
  [unit("EACH", "Pair", ("Gloves Chrome Leather 50mm", 84.95), ("Tradeweld Short Leather Gloves Chrome", 60.0), note="Different makes and cuffs; quoted with the supplier")])
P("AA-PPE-GLASSES", "Safety Glasses", "ppe-site-safety", "Impact-resistant safety spectacles",
  "Clear, impact-resistant safety glasses. Make is confirmed on the quote.",
  ["Cutting, grinding, chasing and drilling"], PPE_HANDLING,
  [unit("EACH", EACH, ("Safety Spectacles", 29.95), ("Robust Anti-Scratch Safety Glasses Clear (promotion)", 29.0), note="Different makes; quoted with the supplier")])
P("AA-PPE-DUSTMASK-FFP1", "Dust Masks FFP1 (Pack)", "ppe-site-safety", "FFP1 disposable dust mask",
  "FFP1 disposable dust masks for nuisance dust. Pack size is confirmed on the quote. Cutting or grinding concrete, brick and stone gives off silica dust — use FFP2 or better for that.",
  ["Sweeping and general dusty work"], PPE_HANDLING,
  [unit("PACK", "Pack", ("Dust Mask Ffp1 Quantity:5", 54.95), ("Pioneer FFP1 Dust Face Mask (single)", 39.0), note="Different pack sizes; quoted with the supplier")])

# --- CAT-41 Waterproofing & sealants ------------------------------------------------------------------
SEAL_HANDLING = "Apply to clean, dry, dust-free surfaces within the temperature range on the pack, and keep cartridges and tins closed and out of the sun."
for colour, cbp, bp in (("Clear", 122.95, 129.0), ("White", 122.95, 129.0)):
    P(f"AA-SEAL-ALC-SIL-300-{colour[0]}", f"Alcolin Silicone Sealant 300 ml ({colour})", "waterproofing-sealants", "Silicone sealant cartridge",
      f"Alcolin silicone sealant, 300 ml cartridge, {colour.lower()} — a flexible, waterproof seal around baths, basins, showers, windows and frames. Not paintable.",
      ["Sealing baths, basins, showers and splashbacks", "Window and frame perimeters"], SEAL_HANDLING,
      [unit("EACH", "300 ml cartridge", (f"Alcolin Silicone Sealant 300ml {colour}", cbp), (f"Alcolin Silicone Sealant {colour} 300 ml", bp))], manufacturer="Alcolin")
P("AA-SEAL-ALC-ACR-280-G", "Alcolin Acrylic Sealant 280 ml (Grey)", "waterproofing-sealants", "Paintable acrylic sealant cartridge",
  "Alcolin acrylic sealant, 280 ml cartridge, grey — a paintable gap filler for cracks and joints between frames, skirtings and walls.",
  ["Filling gaps around frames and skirtings before painting", "Interior and sheltered exterior joints"], SEAL_HANDLING,
  [unit("EACH", "280 ml cartridge", ("Alcolin Acrylic Sealant 280ml Grey", 54.95), ("Alcolin Acrylic Sealant Grey 280 ml", 59.0))], manufacturer="Alcolin")
P("AA-SEAL-ALC-FOAM-750", "Alcolin Filla Foam 750 ml", "waterproofing-sealants", "Polyurethane expanding foam",
  "Alcolin Filla Foam polyurethane expanding foam, 750 ml — fills and seals gaps around frames, pipes and service penetrations.",
  ["Gaps around door and window frames", "Pipe and cable penetrations"], SEAL_HANDLING + " Wear gloves — uncured foam sticks to skin.",
  [unit("EACH", "750 ml can", ("Alcolin Filla Foam 750ml", 249.95), ("Alcolin Filla Foam 750 ml (promotion)", 199.0),
        note="The Builders price was a promotion, so only one regular price was found; quoted with the supplier")], manufacturer="Alcolin")
P("AA-WP-LAYKOLD-20", "a.b.e. Super Laykold 20 L", "waterproofing-sealants", "Bitumen-rubber emulsion waterproofing",
  "a.b.e. Super Laykold bitumen-rubber emulsion, 20 L — brushed on with membrane reinforcement to waterproof flat roofs, parapets, foundations and retaining walls.",
  ["Flat roofs and parapets (with membrane)", "Foundations and below-ground walls"], SEAL_HANDLING,
  [unit("EACH", "20 L tin", ("Abe Super Laykold 20L", 1299.95), ("a.b.e Super Laykold Black 20 L (promotion)", 1279.0),
        note="The Builders price was a promotion, so only one regular price was found; quoted with the supplier")], manufacturer="a.b.e. (Chryso)")
P("AA-WP-TORCHON-3", "Torch-On Waterproofing Membrane 3 mm × 1 m × 10 m", "waterproofing-sealants", "APP/SBS modified bitumen membrane, 3 mm",
  "Torch-on modified-bitumen waterproofing membrane, 3 mm, 1 m × 10 m roll, for flat concrete roofs and balconies. Make and finish (sanded or mineral) are confirmed on the quote; torch-on should be laid by an experienced applicator.",
  ["Flat concrete roofs and balconies", "Box gutters and parapets"], "Store rolls upright, out of the sun. Torching is hot work: follow the maker's guide, keep an extinguisher at hand and never torch over timber.",
  [unit("ROLL", "10 m roll", None, ("Sika Index Waterproofing Membranes Black 3 mm x 1000 mm x 10 m", 2229.0))])
P("AA-WP-MEMBRANE-200", "Waterproofing Membrane Strip 200 mm", "waterproofing-sealants", "Polyester reinforcing membrane",
  "Polyester reinforcing membrane, 200 mm wide, used with liquid waterproofing over joints, cracks and flashings. Roll length and make are confirmed on the quote.",
  ["Reinforcing liquid waterproofing at joints and corners", "Flashings at parapets and roof penetrations"], SEAL_HANDLING,
  [unit("ROLL", "Roll", ("Duram Waterproofing Membrane 200mm X 5M", 36.95), None,
        note="Only Cashbuild lists it (Duram 200 mm x 5 m, and a.b.e. Tough Stuff 200 mm x 8 m at R47.95); quoted with the supplier")])

# --- CAT-42 Paint & coatings --------------------------------------------------------------------------
PAINT_HANDLING = "Stir well, keep the lid on, and store above freezing and out of the sun. Prepare the surface — clean, sound and primed — as the tin says; most paint failures are surface failures."
P("AA-PNT-DUR-MATT-20-W", "Duram Matt Acrylic 20 L (White)", "paint-coatings", "Water-based matt acrylic wall paint",
  "Duram Matt Acrylic water-based wall paint, 20 L, white — for interior walls and ceilings.",
  ["Interior walls and ceilings", "Rental and new-build repaints"], PAINT_HANDLING,
  [unit("EACH", "20 L tin", ("Duram Matt Acrylic 20L White", 799.95), ("Duram Matt Acrylic PVA Paint Chena White 20 L", 869.0))], manufacturer="Duram")
P("AA-PNT-DUR-MATT-5-W", "Duram Matt Acrylic 5 L (White)", "paint-coatings", "Water-based matt acrylic wall paint",
  "Duram Matt Acrylic water-based wall paint, 5 L, white.",
  ["Interior walls and ceilings"], PAINT_HANDLING,
  [unit("EACH", "5 L tin", ("Duram Matt Acrylic 5L White", 279.95), ("Duram Matt Acrylic PVA Paint Chena White 5 L", 289.0))], manufacturer="Duram")
P("AA-PNT-DUR-SHEEN-5-W", "Duram Durasheen Low Sheen 5 L (White)", "paint-coatings", "Water-based low-sheen acrylic",
  "Duram Durasheen low-sheen acrylic, 5 L, white — washable finish for interior and exterior walls.",
  ["Kitchens, passages and children's rooms", "Exterior walls"], PAINT_HANDLING,
  [unit("EACH", "5 L tin", ("Duram Durasheen 5L White", 329.95), ("Duram Durasheen Paint White 5 L", 449.0))], manufacturer="Duram")
P("AA-PNT-DUR-ARMA-5-NS", "Duram Armaguard 5 L (Natural Stone)", "paint-coatings", "Exterior elastomeric acrylic",
  "Duram Armaguard exterior acrylic, 5 L, Natural Stone — a flexible, weather-resistant coating that bridges hairline cracks.",
  ["Exterior walls", "Boundary walls"], PAINT_HANDLING,
  [unit("EACH", "5 L tin", ("Duram Armaguard Natural Stone 5L", 369.95), ("Duram Armaguard Paint Natural Stone 5 L", 399.0))], manufacturer="Duram")
P("AA-PNT-ROOF-20", "Roof Paint 20 L", "paint-coatings", "Water-based acrylic roof paint",
  "Water-based acrylic roof paint, 20 L, for galvanised and fibre-cement roofs and concrete tiles. Make and colour are confirmed on the quote.",
  ["Repainting tiled and sheeted roofs"], PAINT_HANDLING + " New galvanised sheeting needs weathering or an etch primer first.",
  [unit("EACH", "20 L tin", ("Duram Roofkote 20L Red", 1069.95), ("Duram Roofkote Cooltech Paint Brick Red 20 L", 1459.0), note="Different products (Roofkote and Roofkote Cooltech); quoted with the supplier")])
P("AA-PNT-PRIMER-20", "Plaster Primer 20 L", "paint-coatings", "Water-based plaster primer",
  "Water-based plaster primer, 20 L — seals new or bare plaster before the topcoat. Make is confirmed on the quote.",
  ["Priming new plaster and RhinoLite skims"], PAINT_HANDLING,
  [unit("EACH", "20 L tin", ("Champion Water Based Plaster Primer 20L", 659.95), ("Duram Adhesion Plaster Primer 20 L (promotion)", 979.0), note="Different makes; quoted with the supplier")])
P("AA-PNT-ENAMEL-5", "Quick-Dry Enamel 5 L", "paint-coatings", "Solvent-based gloss enamel",
  "Gloss enamel, 5 L, for steel windows, doors, frames and gates. Make and colour are confirmed on the quote.",
  ["Steel windows, frames and gates", "Doors and trim"], PAINT_HANDLING + " Use a metal primer on bare steel first.",
  [unit("EACH", "5 L tin", ("Champion High gloss Enamel 5L White", 404.95), ("CAVA QUICK DRY ENAMEL 5L, WHITE", 516.0), note="Different makes; quoted with the supplier")])

out = {
    "_source": "Building supplies line (BUILDING_SUPPLIES_CATALOGUE.md): CAT-32..42 across six departments approved by the owner on 17 Oct 2026 — doors, windows & frames; fencing & security; water storage & plumbing; ceilings, drywall & insulation; site tools, PPE & consumables; waterproofing, sealants & paint. A unit is live only where two SA retailers list the same product at a regular price (list = lowest x 1.08); everything else is quoted with the supplier.",
    "categories": [{"slug": s, "name": n, "code": c} for s, n, c in CATEGORIES],
    "products": PRODUCTS,
}
skus = [p["sku"] for p in PRODUCTS]
slugs = [p["slug"] for p in PRODUCTS]
assert len(set(skus)) == len(skus), "duplicate sku"
assert len(set(slugs)) == len(slugs), "duplicate slug"
assert {p["category_slug"] for p in PRODUCTS} <= {s for s, _, _ in CATEGORIES}
json.dump(out, open(sys.argv[1], "w"), indent=2, ensure_ascii=False)
open(sys.argv[1], "a").write("\n")
priced = [p for p in PRODUCTS if any(u["list_price_per_unit"] for u in p["units"])]
print(len(PRODUCTS), "products,", len(priced), "priced")
for p in priced:
    u = p["units"][0]
    print(f"  {p['category_slug']:24} {p['name'][:60]:60} bench {u['market_benchmark_price']:>9} list {u['list_price_per_unit']:>9}")
