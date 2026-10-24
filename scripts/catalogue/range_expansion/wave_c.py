"""Wave C (ROADMAP 2.4): finishing, fit-out and site.

Glass, Glazing & Aluminium · Kitchens & Built-ins · HVAC & Ventilation · Site Establishment & Temporary Works ·
Power Tools & Site Equipment — and deeper Tiles & Flooring, Fencing & Security, Hardware and Paint.
"""
from .common import EACH, KG, LM, M2, P, category, code, fmt

PACK10 = (("PACK", "Pack (10)"),)

# =============================================================================================================
# Glass, Glazing & Aluminium (CAT-96..98)
# =============================================================================================================
GLASS = "glass-aluminium"
GL = category(
    "glass-mirrors", "Glass, Safety Glass & Mirrors", "CAT-96", GLASS,
    "Clear and tinted float glass from 3 to 10 mm, laminated and toughened safety glass, obscure patterns, low-E and double-glazed units, and mirrors — cut to size, per m².",
    ["Replacing broken panes", "Doors, sidelights and low-level glazing", "Shopfronts, showers and balustrades"],
    "Glazing must follow SANS 10400-N and SANS 10137: safety glass in doors, sidelights, low-level panes, showers and balustrades. Glass is cut to size — send the opening sizes, and allow for the frame rebate.",
)
for kind, std, thicknesses in (
    ("Clear Float Glass", "SANS 1263 / SANS 10137 float glass", (3, 4, 5, 6, 8, 10)),
    ("Bronze Tinted Float Glass", "Tinted float glass", (4, 6)),
    ("Grey Tinted Float Glass", "Tinted float glass", (4, 6)),
    ("Laminated Safety Glass", "SANS 1263 laminated safety glass", ("6.38", "8.38", "10.38", "12.38")),
    ("Toughened Safety Glass", "SANS 1263 toughened safety glass", (6, 8, 10, 12)),
    ("Obscure Pattern Glass (Satin/Reeded)", "Patterned glass", (4,)),
    ("Low-E Glass", "Low-emissivity coated glass (SANS 10400-XA)", (6,)),
    ("Double-Glazed Unit (Insulated)", "Insulated glass unit, to size", ("24",)),
    ("Clear Mirror", "Silvered float-glass mirror", (4, 6)),
    ("Safety-Backed Mirror", "Mirror with safety film backing", (4, 6)),
):
    for t in thicknesses:
        P(code("AA-GLS", kind, t), f"{kind} {t} mm (cut to size)", GL, std, f"{kind}, {t} mm, cut to your sizes and edged on order — priced per m².", M2)
for name in ("Glazing Putty 500 g", "Glazing Putty 2 kg", "Glazing Beads (Aluminium) 6 m", "Glazing Rubber Wedge Gasket (per metre)", "Glass Suction Lifter (Double)", "Glass Cutter",
             "Mirror Adhesive 290 ml", "Mirror Clips (pack of 10)", "Safety Film for Glass (per m²)", "Frosted Window Film (per m²)", "Solar Window Film (per m²)"):
    units = PACK10 if "pack of 10" in name else (M2 if "per m²" in name else (LM if "per metre" in name else EACH))
    P(code("AA-GLS-ACC", name), name, GL, "Glazing accessory", f"{name}.", units)

SHOWER = category(
    "shower-enclosures-balustrades", "Shower Enclosures & Glass Balustrades", "CAT-97", GLASS,
    "Frameless and framed shower doors and enclosures, walk-in screens, glass balustrade panels, spigots, standoffs and stainless handrails and fittings.",
    ["Bathroom renovations and new en-suites", "Balconies, stairs and pool fencing", "Hotels, offices and apartments"],
    "Shower and balustrade glass must be safety glass (SANS 10400-N); balustrades must also meet the height and load rules of SANS 10400-M. We measure on site for frameless glass.",
)
for size in ("800 × 800 mm", "900 × 900 mm", "1,000 × 1,000 mm", "1,200 × 800 mm", "1,200 × 900 mm"):
    for kind in ("Framed Shower Enclosure (Square/Rectangle)", "Frameless Shower Enclosure 8 mm"):
        P(code("AA-SHW", kind, size), f"{kind} {size}", SHOWER, "Safety-glass shower enclosure", f"{kind}, {size} — hinged or sliding door confirmed on the quote.", EACH)
for size in ("760 mm", "800 mm", "900 mm", "1,000 mm", "1,200 mm"):
    P(code("AA-SHW-SCREEN", size), f"Walk-In Shower Screen {size}, 8 mm", SHOWER, "Toughened safety-glass screen", f"Fixed walk-in shower screen, {size}, 8 mm toughened glass, with wall profile and support bar.", EACH)
for name in ("Shower Door Pivot Hinges (Pair)", "Shower Door Handle (Stainless)", "Shower Seal Strip 2 m", "Sliding Shower Door Kit 1,200 mm"):
    P(code("AA-SHW-ACC", name), name, SHOWER, "Shower hardware", f"{name}.", EACH)
for name, units in (("Glass Balustrade Panel 12 mm Toughened (per m²)", M2), ("Glass Balustrade Panel 13.52 mm Laminated Toughened (per m²)", M2), ("Pool Fence Glass Panel 12 mm (per m²)", M2),
                    ("Stainless Steel Glass Spigot (Core-Drilled)", EACH), ("Stainless Steel Glass Spigot (Base-Plated)", EACH), ("Glass Standoff Pin 50 mm (Stainless)", EACH),
                    ("Stainless Steel Handrail 50.8 mm (per metre)", LM), ("Stainless Steel Handrail Bracket", EACH), ("Stainless Steel Top Rail (Slotted) for Glass (per metre)", LM),
                    ("Aluminium Balustrade Base Channel (per metre)", LM), ("Stainless Steel Balustrade Post 1 m", EACH), ("Stainless Steel Wire Balustrade Kit (per metre)", LM)):
    P(code("AA-BAL", name), name, SHOWER, "Balustrade component", f"{name}.", units)

ALU = category(
    "aluminium-sections-shopfronts", "Aluminium Sections & Shopfronts", "CAT-98", GLASS,
    "Aluminium angles, channels, flat bar, square and round tube in 6 m lengths, window and shopfront sections, and made-to-measure aluminium shopfronts, windows and sliding doors.",
    ["Shopfronts, offices and partitions", "Trims, edges and light framing", "Made-to-measure windows and doors"],
    "Aluminium is cut and fabricated to the drawing; anodised and powder-coated finishes are confirmed on the quote. Keep sections wrapped until fixed to protect the finish.",
)
for profile, sizes in (("Equal Angle", ("12 × 12 × 1.5", "20 × 20 × 2", "25 × 25 × 3", "40 × 40 × 3", "50 × 50 × 3")),
                       ("Channel", ("12 × 12 × 1.5", "20 × 20 × 2", "25 × 25 × 3")),
                       ("Flat Bar", ("20 × 3", "25 × 3", "40 × 3", "50 × 5")),
                       ("Square Tube", ("20 × 20 × 1.6", "25 × 25 × 1.6", "38 × 38 × 1.6", "50 × 50 × 2")),
                       ("Rectangular Tube", ("50 × 25 × 1.6", "76 × 25 × 1.6", "100 × 50 × 2")),
                       ("Round Tube", ("19 × 1.2", "25.4 × 1.6", "38 × 1.6", "50.8 × 1.6"))):
    for size in sizes:
        for finish in ("Mill", "Anodised Natural"):
            P(code("AA-ALU", profile, size, finish[:4]), f"Aluminium {profile} {size} mm × 6 m, {finish}", ALU, "6063-T5 aluminium extrusion",
              f"Aluminium {profile.lower()}, {size} mm, 6 m length, {finish.lower()} finish.", EACH)
for name in ("Aluminium Shopfront (Single Door + Fixed Glass) (to order, per m²)", "Aluminium Frameless Glass Shopfront (to order, per m²)", "Aluminium Office Partition (Glazed) (per m²)",
             "Aluminium Casement Window (to order, per m²)", "Aluminium Sliding Window (to order, per m²)", "Aluminium Sliding Door (to order, per m²)",
             "Aluminium Stacking Door (to order, per m²)", "Aluminium Louvre Window (to order, per m²)"):
    P(code("AA-ALU-MTM", name), name, ALU, "Made-to-measure aluminium, to SANS 613", f"{name.split(' (')[0]}, fabricated to your sizes and glazed — measured and quoted per m².", M2)
for name in ("Aluminium Door Closer (Overhead)", "Aluminium Door Lock (Hook-Bolt)", "Aluminium Door Pull Handle 600 mm", "Aluminium Window Handle", "Aluminium Window Friction Stay"):
    P(code("AA-ALU-HW", name), name, ALU, "Aluminium hardware", f"{name}.", EACH)

# =============================================================================================================
# Kitchens & Built-ins (CAT-99..101)
# =============================================================================================================
KITCHEN = "kitchens-built-ins"
KIT_HANDLING = "Cabinets are flat-packed or assembled to order; carcass board, door finish and hardware are confirmed on the quote. Fix wall units to solid backing with the right anchors, and seal worktop cut-outs against water."
CAB = category(
    "kitchen-cabinets", "Kitchen Cabinets & Carcasses", "CAT-99", KITCHEN,
    "Melamine kitchen carcasses and units: base, drawer, sink, corner, wall and tall units from 300 to 1,200 mm, with doors in white, grey, oak and charcoal, plinths and end panels.",
    ["New kitchens and renovations", "Rental units and developments", "Sculleries, laundries and staff kitchens"],
    KIT_HANDLING,
)
for kind, widths in (("Base Unit (1 Door, 1 Shelf)", (300, 400, 450, 500)), ("Base Unit (2 Doors)", (600, 800, 900, 1000)), ("Drawer Unit (3 Drawers)", (400, 500, 600)),
                     ("Sink Base Unit", (800, 1000, 1200)), ("Corner Base Unit", (900, 1000)), ("Wall Unit (1 Door)", (300, 400, 450, 500)), ("Wall Unit (2 Doors)", (600, 800, 900, 1000)),
                     ("Tall Pantry Unit", (450, 600)), ("Tall Oven Housing Unit", (600,)), ("Fridge Housing Unit", (600, 900))):
    for width in widths:
        P(code("AA-KIT", kind, width), f"Kitchen {kind} {width} mm", CAB, "Melamine-faced chipboard carcass, 16 mm",
          f"Kitchen {kind.lower()}, {width} mm wide, with hinges and legs — door finish (white, grey, oak or charcoal) confirmed on the quote.", EACH)
for name in ("Kitchen Plinth (Kickboard) 2.4 m", "Kitchen End Panel (Base) 720 mm", "Kitchen End Panel (Tall) 2,100 mm", "Kitchen Cornice / Light Pelmet 2.4 m", "Kitchen Filler Panel 100 mm",
             "Kitchen Cabinet Legs (Adjustable, pack of 4)", "Kitchen Design & Measure (per kitchen)"):
    P(code("AA-KIT-ACC", name), name, CAB, "Kitchen accessory", f"{name}.", (("PACK", "Pack (4)"),) if "pack of 4" in name else EACH)

TOPS = category(
    "worktops-appliances", "Worktops & Built-In Appliances", "CAT-100", KITCHEN,
    "Post-formed worktops in standard lengths and depths, granite, quartz and solid-wood tops per m², and built-in hobs, ovens, extractors and stoves.",
    ["Kitchen fit-outs and replacements", "Developments and rental units", "Islands, vanities and counters"],
    KIT_HANDLING + " Appliances are connected by a registered electrician (and gas by a registered LP gas installer).",
)
for depth in (600, 900):
    for length in (2.0, 3.0, 3.6, 4.2):
        for finish in ("White Gloss", "Granite Look", "Wood Look"):
            P(code("AA-KIT-TOP", depth, fmt(length), finish), f"Post-Formed Worktop 32 × {depth} mm × {fmt(length)} m, {finish}", TOPS, "High-pressure laminate post-formed worktop",
              f"Post-formed worktop, 32 mm, {depth} mm deep, {fmt(length)} m long, {finish.lower()} laminate.", EACH)
for name in ("Granite Worktop 30 mm (per m², template & install)", "Engineered Quartz Worktop 20 mm (per m², template & install)", "Solid Wood Worktop (Oak/Saligna) 40 mm (per m²)",
             "Compact Laminate Worktop 12 mm (per m²)"):
    P(code("AA-KIT-STONE", name), name, TOPS, "Worktop, made to template", f"{name.split(' (')[0]} — templated on site and quoted per m².", M2)
for name in ("Worktop Joining Strip", "Worktop End Cap Kit", "Worktop Upstand / Splashback Strip 3 m", "Worktop Sealant (Clear) 280 ml"):
    P(code("AA-KIT-TOPACC", name), name, TOPS, "Worktop accessory", f"{name}.", EACH)
for name in ("Electric Hob 4-Plate (Built-In)", "Ceramic Hob 4-Zone (Built-In)", "Gas Hob 4-Burner (Built-In)", "Gas-Electric Hob (3+1)", "Built-In Oven 60 cm (Electric)",
             "Built-In Oven 60 cm (Multifunction)", "Freestanding Stove 4-Plate (Electric)", "Freestanding Gas Stove 4-Burner", "Chimney Extractor Hood 60 cm", "Chimney Extractor Hood 90 cm",
             "Under-Cabinet Extractor 60 cm", "Built-In Microwave"):
    P(code("AA-KIT-APP", name), name, TOPS, "Built-in kitchen appliance", f"{name}; make, model and finish confirmed on the quote.", EACH)

BUILT = category(
    "built-in-cupboards-hardware", "Built-In Cupboards & Cabinet Hardware", "CAT-101", KITCHEN,
    "Bedroom built-in cupboards with hinged and sliding doors from 900 to 2,700 mm, cupboard interiors, drawer runners, soft-close hinges, handles, lift-ups and wardrobe fittings.",
    ["Bedrooms and walk-in closets", "Developments and rental units", "Kitchen and vanity hardware"],
    KIT_HANDLING,
)
for width in (900, 1200, 1500, 1800, 2100, 2400, 2700):
    for doors in ("Hinged Doors", "Sliding Doors"):
        P(code("AA-BIC", width, doors[:5]), f"Built-In Cupboard {width} mm, {doors}", BUILT, "Melamine built-in cupboard, floor to ceiling",
          f"Floor-to-ceiling built-in cupboard, {width} mm wide, {doors.lower()}, with hanging rail, shelves and drawers to the layout on the quote.", EACH)
for length in (300, 350, 400, 450, 500, 550):
    P(code("AA-BIC-RUNNER", length), f"Full-Extension Soft-Close Drawer Runners {length} mm (Pair)", BUILT, "Ball-bearing drawer runner", f"Soft-close full-extension runners, {length} mm.", EACH)
for name, units in (("Soft-Close Concealed Hinge 35 mm (pack of 10)", PACK10), ("Standard Concealed Hinge 35 mm (pack of 10)", PACK10), ("Glass-Door Hinge (pack of 2)", (("PACK", "Pack (2)"),)),
                    ("Cabinet Bar Handle 128 mm (pack of 10)", PACK10), ("Cabinet Bar Handle 160 mm (pack of 10)", PACK10), ("Cabinet Bar Handle 320 mm (pack of 10)", PACK10),
                    ("Cabinet Knob (pack of 10)", PACK10), ("Profile (Gola) Handle Strip 3 m", EACH), ("Push-to-Open Latch (pack of 10)", PACK10), ("Lift-Up Stay (Gas Strut, Pair)", EACH),
                    ("Wardrobe Rail Oval 2.4 m", EACH), ("Wardrobe Rail End Brackets (Pair)", EACH), ("Pull-Out Wire Basket 600 mm", EACH), ("Corner Carousel (Lazy Susan)", EACH),
                    ("Cutlery Insert 600 mm", EACH), ("Shelf Supports (pack of 50)", (("PACK", "Pack (50)"),)), ("Edging Tape (Iron-On) 22 mm × 50 m", EACH), ("Sliding Wardrobe Door Track Kit 2.4 m", EACH)):
    P(code("AA-BIC-HW", name), name, BUILT, "Cabinet hardware", f"{name}.", units)

# =============================================================================================================
# HVAC & Ventilation (CAT-102..103)
# =============================================================================================================
HVAC = "hvac-ventilation"
AC = category(
    "air-conditioning", "Air Conditioning", "CAT-102", HVAC,
    "Inverter wall-split air conditioners from 9,000 to 36,000 BTU, cassette and ducted units, multi-splits, mounting brackets, copper pair coil, drain pumps and condensate pipe.",
    ["Homes, offices and shops", "Server rooms and clinics", "Developments and fit-outs"],
    "Air conditioners are installed by a SAQCC Gas-registered refrigeration technician (refrigerant handling) and wired by a registered electrician. Size units to the room's heat load — we confirm it on the quote.",
)
for btu in ("9,000", "12,000", "18,000", "24,000", "30,000", "36,000"):
    for kind in ("Inverter Wall-Split Air Conditioner (R32)", "Inverter Wall-Split Air Conditioner, Wi-Fi (R32)"):
        P(code("AA-AC-SPLIT", btu, "WIFI" if "Wi-Fi" in kind else ""), f"{kind} {btu} BTU", AC, "Inverter split air conditioner, R32 refrigerant",
          f"{kind}, {btu} BTU/h, heating and cooling — installation quoted separately.", EACH)
for btu in ("18,000", "24,000", "36,000", "48,000"):
    P(code("AA-AC-CASSETTE", btu), f"Cassette Air Conditioner {btu} BTU", AC, "Ceiling cassette air conditioner", f"Four-way ceiling cassette unit, {btu} BTU/h.", EACH)
for btu in ("24,000", "36,000", "48,000", "60,000"):
    P(code("AA-AC-DUCTED", btu), f"Ducted Air Conditioner {btu} BTU (to design)", AC, "Ducted split system", f"Ducted split system, {btu} BTU/h, designed from the floor plan.", EACH)
for name, units in (("Multi-Split Outdoor Unit (2 Rooms)", EACH), ("Multi-Split Outdoor Unit (3 Rooms)", EACH), ("Portable Air Conditioner 12,000 BTU", EACH),
                    ("Air Conditioner Wall Bracket (Outdoor Unit)", EACH), ("Air Conditioner Floor Stand (Rubber Feet)", EACH), ("Copper Pair Coil ¼ in + ⅜ in (per metre)", LM),
                    ("Copper Pair Coil ¼ in + ½ in (per metre)", LM), ("Copper Pair Coil ⅜ in + ⅝ in (per metre)", LM), ("Condensate Drain Pump (Mini)", EACH),
                    ("Condensate Drain Pipe 16 mm (per metre)", LM), ("Air Conditioner Trunking 80 × 60 mm 2 m", EACH), ("Air Conditioner Installation (Back-to-Back, per unit)", EACH),
                    ("Air Conditioner Service (per unit)", EACH)):
    P(code("AA-AC-ACC", name), name, AC, "Air-conditioning accessory or service", f"{name}.", units)

VENT = category(
    "ventilation-extraction", "Ventilation, Extraction & Ducting", "CAT-103", HVAC,
    "Wall, window and ceiling extractor fans from 100 to 300 mm, inline duct fans, flexible and rigid ducting, vent grilles and louvres, cowls, fresh-air and industrial fans.",
    ["Bathrooms, kitchens and laundries", "Workshops, factories and parking", "Restaurants and commercial kitchens"],
    "Ventilation follows SANS 10400-O: rooms without opening windows need mechanical ventilation. Fans are wired by a registered electrician; commercial kitchen extraction needs a fire-rated duct design.",
)
for size in (100, 150, 200, 250, 300):
    for kind in ("Wall/Window Extractor Fan", "Ceiling Extractor Fan"):
        P(code("AA-VEN", kind, size), f"{kind} {size} mm", VENT, "Extractor fan", f"{kind}, {size} mm — with a timer or humidistat option.", EACH)
    P(code("AA-VEN-INLINE", size), f"Inline Duct Fan {size} mm", VENT, "Inline mixed-flow duct fan", f"Inline duct fan for {size} mm ducting.", EACH)
    P(code("AA-VEN-FLEXDUCT", size), f"Flexible Aluminium Ducting {size} mm × 3 m", VENT, "Flexible aluminium duct", f"Flexible aluminium ducting, {size} mm, 3 m (extends).", EACH)
    P(code("AA-VEN-RIGID", size), f"Rigid PVC Ducting {size} mm (per metre)", VENT, "Rigid PVC duct", f"Rigid PVC duct, {size} mm.", LM)
    P(code("AA-VEN-COWL", size), f"Wall Vent Cowl {size} mm (Louvred)", VENT, "Wall cowl", f"Louvred external wall cowl for {size} mm ducting.", EACH)
for size in ("150 × 150 mm", "225 × 225 mm", "300 × 150 mm", "300 × 300 mm", "450 × 450 mm", "600 × 600 mm"):
    P(code("AA-VEN-GRILLE", size), f"Ventilation Grille {size} (Aluminium)", VENT, "Aluminium ventilation grille", f"Aluminium vent grille, {size}, for supply or return air.", EACH)
for name in ("Ceiling Fan 1,200 mm (with Light)", "Ceiling Fan 1,400 mm", "Industrial Wall Fan 650 mm", "Industrial Pedestal Fan 750 mm", "Industrial Drum Fan 900 mm", "Roof Ventilator Powered (Solar)",
             "Roof Turbine Ventilator 300 mm (Stainless)", "Fresh-Air Heat-Recovery Ventilator (Small)", "Kitchen Canopy Extractor (Commercial, to order)", "Weatherproof Louvre 600 × 600 mm"):
    P(code("AA-VEN", name), name, VENT, "Ventilation product", f"{name}.", EACH)

# =============================================================================================================
# Site Establishment & Temporary Works (CAT-104..107)
# =============================================================================================================
SITE = "site-establishment"
SITE_HANDLING = "Site establishment items are sold or hired through our partners; hire rates, minimum periods, delivery and collection are confirmed on the quote. Sites must comply with the Construction Regulations (2014)."
ACCOM = category(
    "site-accommodation", "Site Offices, Containers & Ablutions", "CAT-104", SITE,
    "Site offices, storage and shipping containers (3, 6 and 12 m, new and used), guard huts, ablution containers, chemical toilets and handwash stations — for sale or hire.",
    ["Construction and civil sites", "Mines, events and remote sites", "Secure on-site storage"],
    SITE_HANDLING,
)
for size in ("3 m", "6 m", "12 m"):
    for kind, detail in (("Site Office Container", "insulated, lined, with window, door, lights and plugs"), ("Storage Container (Used, Cargo-Worthy)", "used steel shipping container"), ("Storage Container (New, One-Trip)", "one-trip steel container")):
        for mode in ("Sale", "Hire"):
            P(code("AA-SITE-CONT", size, kind, mode), f"{kind} {size} ({mode})", ACCOM, "Steel container",
              f"{kind}, {size}: {detail} — {'for purchase' if mode == 'Sale' else 'on monthly hire'}, delivered by crane truck.", EACH)
for name in ("Guard Hut 1.2 × 1.2 m (Sale)", "Guard Hut 1.2 × 1.2 m (Hire)", "Guard Hut 2.4 × 1.2 m (Sale)", "Ablution Container 6 m (Toilets & Showers) (Hire)", "Chemical Toilet (Hire, per Week, with Service)",
             "Chemical Toilet (Disabled Access, Hire)", "Portable Handwash Station (Hire)", "Container Lock Box", "Container Shelving Kit 6 m", "Container Ramp (Steel)", "Site Office Furniture Set (Hire)"):
    P(code("AA-SITE-ACC", name), name, ACCOM, "Site establishment", f"{name}.", EACH)

TEMP = category(
    "temporary-fencing-hoarding", "Temporary Fencing, Hoarding & Site Signs", "CAT-105", SITE,
    "Mesh temporary fence panels and bases, crowd barriers, chromadek and IBR site hoarding per metre, scaffold and shade netting, and construction site boards and safety signs.",
    ["Securing sites and excavations", "Public-facing hoarding and branding", "Events and road works"],
    SITE_HANDLING,
)
for name, units in (("Temporary Mesh Fence Panel 3.5 × 2.1 m (Sale)", EACH), ("Temporary Mesh Fence Panel 3.5 × 2.1 m (Hire, per Week)", EACH), ("Temporary Fence Base (Concrete/Plastic)", EACH),
                    ("Temporary Fence Clamp", EACH), ("Temporary Fence Stay (Brace)", EACH), ("Temporary Fence Gate Panel", EACH), ("Barrier Mesh (Orange) 1.2 × 50 m", (("ROLL", "Roll (50 m)"),)), ("Chromadek Hoarding 1.8 m (per metre, Supplied & Erected)", LM),
                    ("Chromadek Hoarding 2.4 m (per metre, Supplied & Erected)", LM), ("IBR Hoarding 2.4 m (per metre, Supplied & Erected)", LM), ("Timber Hoarding (Shutterply) 2.4 m (per metre)", LM),
                    ("Scaffold Debris Netting 2 × 50 m", (("ROLL", "Roll (50 m)"),)), ("Scaffold Shade Netting 3 × 50 m", (("ROLL", "Roll (50 m)"),)), ("Hoarding Banner Print (per m²)", M2)):
    P(code("AA-SITE-FEN", name), name, TEMP, "Temporary works", f"{name}.", units)
for sign in ("Construction Site Board (Project Details) 2.4 × 1.2 m", "Danger: Construction Site, No Unauthorised Entry", "Hard Hats Must Be Worn", "Safety Boots Must Be Worn", "PPE Required Beyond This Point",
             "Danger: Deep Excavation", "Danger: Overhead Work", "Site Office", "First Aid", "Visitors Report to Site Office", "Beware: Moving Plant", "Speed Limit 10 km/h (Site)"):
    for size in (("600 × 450 mm",) if "2.4 × 1.2" in sign else ("450 × 300 mm", "600 × 450 mm")):
        title = sign if "2.4 × 1.2" in sign else f"Site Safety Sign '{sign}' {size}"
        P(code("AA-SITE-SIGN", sign, size), title, TEMP, "SANS 1186 safety sign", f"{title}, on ABS or Chromadek.", EACH)

SPOWER = category(
    "site-power-lighting", "Site Power, Lighting & Distribution", "CAT-106", SITE,
    "Site distribution boxes, industrial plugs and sockets, extension reels from 20 to 50 m, lighting towers, site floodlights and work lights, festoon lighting and cable protectors.",
    ["Construction site power", "Night works and security lighting", "Events and temporary installations"],
    "Temporary site installations are wired by a registered electrician, with earth leakage on every circuit. Keep leads off the ground and away from water, and inspect them daily.",
)
for name in ("Site Distribution Box (4 × 16 A + 1 × 32 A, Earth Leakage)", "Site Distribution Box (3-Phase, 63 A)", "Industrial Plug 16 A 3-Pin (IP44)", "Industrial Socket 16 A (IP44)",
             "Industrial Plug 32 A 5-Pin (IP67)", "Industrial Socket 32 A 5-Pin (IP67)", "Extension Reel 20 m (Heavy Duty)", "Extension Reel 30 m (Heavy Duty)", "Extension Reel 50 m (Heavy Duty)",
             "Extension Lead 10 m (Industrial)", "Multi-Plug 4-Way (Heavy Duty)", "Lighting Tower (Diesel, 4 × LED) (Hire)", "Lighting Tower (Solar) (Hire)", "Site Floodlight on Tripod 2 × 50 W",
             "Rechargeable LED Work Light 20 W", "LED Festoon Site Lighting 25 m", "Cable Protector Ramp 5-Channel", "Site Cable Hook / Hanger (pack of 10)", "Residual Current Plug Adaptor (Portable)"):
    P(code("AA-SITE-PWR", name), name, SPOWER, "Site power and lighting", f"{name}.", PACK10 if "pack of 10" in name else EACH)

CONS = category(
    "site-consumables", "Site Consumables & Cleaning", "CAT-107", SITE,
    "Black and clear plastic sheeting, builder's rubble and refuse bags, hessian, danger tape, buckets, brooms and squeegees, spray paint, cleaning chemicals and site hygiene supplies.",
    ["Daily site housekeeping", "Protecting finishes and floors", "Handover cleaning"],
    "Keep the site clean and clear as the Construction Regulations require — housekeeping prevents most trips and falls. Store chemicals with their safety data sheets.",
)
for colour in ("Black", "Clear"):
    for gauge, width in (("50 µm", "3 m"), ("100 µm", "3 m"), ("150 µm", "4 m"), ("250 µm", "4 m")):
        P(code("AA-SITE-PLASTIC", colour, gauge, width), f"{colour} Plastic Sheeting {gauge}, {width} × 30 m", CONS, "Polyethylene sheeting", f"{colour} polyethylene sheeting, {gauge}, {width} wide, 30 m roll — for protection and covering.", (("ROLL", "Roll (30 m)"),))
for name, units in (("Heavy-Duty Rubble Bags (pack of 25)", (("PACK", "Pack (25)"),)), ("Refuse Bags 750 × 950 mm (pack of 20)", (("PACK", "Pack (20)"),)), ("Builder's Woven Rubble Sack (pack of 100)", (("PACK", "Pack (100)"),)),
                    ("Hessian Cloth 1 m × 50 m", (("ROLL", "Roll (50 m)"),)), ("Floor Protection Board (Correx) 1.2 × 2.4 m", (("SHEET", "Sheet"),)), ("Floor Protection Fleece (Self-Adhesive) 1 × 25 m", (("ROLL", "Roll (25 m)"),)),
                    ("Danger Tape (Red/White) 100 m", EACH), ("Builder's Bucket 20 L (Heavy Duty)", EACH), ("Platform Broom 600 mm", EACH), ("Hard Broom (Yard)", EACH),
                    ("Floor Squeegee 600 mm", EACH), ("Mop & Bucket Set", EACH), ("Builder's Clean-Up Acid 5 L", EACH), ("Brick & Paving Cleaner 5 L", EACH), ("Heavy-Duty Hand Cleaner 5 L", EACH),
                    ("Paper Towel Rolls (pack of 6)", (("PACK", "Pack (6)"),)), ("Cotton Waste / Rags 5 kg", EACH), ("Spray Paint (Assorted) 300 ml", EACH), ("Masking Tape 48 mm (pack of 6)", (("PACK", "Pack (6)"),)),
                    ("Duct Tape 48 mm × 25 m", EACH), ("Water Container 25 L", EACH), ("Drinking Water Station (Site)", EACH)):
    P(code("AA-SITE-CON", name), name, CONS, "Site consumable", f"{name}.", units)

# =============================================================================================================
# Power Tools & Site Equipment (CAT-108..111)
# =============================================================================================================
TOOLS = "power-tools-equipment"
TOOL_HANDLING = "Use power tools with the guards fitted and the PPE the maker specifies (eye, hearing and dust protection). Make and model are confirmed on the quote; equipment can also be hired through plant hire."
PT = category(
    "power-tools", "Power Tools & Cordless Kits", "CAT-108", TOOLS,
    "Corded and cordless drills, hammer and SDS drills, angle grinders 115 to 230 mm, circular and mitre saws, jigsaws, demolition breakers, wall chasers, tile cutters, planers, sanders and nailers.",
    ["Builders and trades", "Shopfitting and joinery", "Maintenance and renovation"],
    TOOL_HANDLING,
)
for name in ("Impact Drill 650 W", "Impact Drill 850 W", "Rotary Hammer Drill SDS-Plus 800 W", "Rotary Hammer Drill SDS-Plus 1,100 W", "Rotary Hammer SDS-Max 1,500 W", "Demolition Breaker 5 kg (SDS-Max)",
             "Demolition Breaker 10 kg (Hex)", "Demolition Breaker 16 kg (Hex)", "Demolition Breaker 30 kg (Hex)", "Diamond Core Drill Motor 2,000 W", "Wall Chaser 1,700 W (Twin Blade)",
             "Angle Grinder 115 mm 750 W", "Angle Grinder 125 mm 900 W", "Angle Grinder 180 mm 2,000 W", "Angle Grinder 230 mm 2,200 W", "Circular Saw 185 mm 1,400 W",
             "Circular Saw 235 mm 2,000 W", "Mitre Saw 254 mm (Sliding)", "Table Saw 254 mm", "Jigsaw 650 W", "Reciprocating Saw 1,100 W", "Electric Planer 82 mm",
             "Router 1,200 W (½ in)", "Random Orbital Sander 125 mm", "Belt Sander 75 mm", "Drywall Sander (Long-Reach)", "Electric Tile Cutter 180 mm (Wet)", "Bridge Tile Saw 1,200 mm",
             "Cut-Off Machine (Chop Saw) 355 mm", "Petrol Cut-Off Saw 350 mm", "Heat Gun 2,000 W", "Hot-Glue Gun (Industrial)", "Electric Screwdriver (Drywall)", "Paddle Mixer 1,600 W",
             "Concrete Vibrator Motor 2,300 W", "Brad Nailer (Pneumatic)", "Framing Nailer (Pneumatic)", "Air Compressor 50 L", "Air Compressor 100 L", "Welding Machine Inverter 200 A",
             "Welding Machine MIG 250 A", "Bench Grinder 200 mm", "Drill Press (Bench)", "Wet & Dry Vacuum 30 L", "Pressure Washer 150 bar (Electric)", "Pressure Washer (Petrol, 200 bar)"):
    P(code("AA-PT", name), name, PT, "Power tool", f"{name}; make and model confirmed on the quote.", EACH)
for kit in ("Cordless Drill Driver 18 V Kit (2 Batteries)", "Cordless Impact Driver 18 V Kit", "Cordless Hammer Drill 18 V Kit", "Cordless SDS-Plus Hammer 18 V Kit", "Cordless Angle Grinder 18 V Kit",
            "Cordless Circular Saw 18 V Kit", "Cordless Combo Kit 18 V (Drill + Impact Driver)", "Cordless Combo Kit 18 V (4 Tools)", "Cordless Multi-Tool 18 V", "18 V Battery 4.0 Ah", "18 V Battery 5.0 Ah", "18 V Fast Charger"):
    P(code("AA-PT-CORDLESS", kit), kit, PT, "Cordless power tool", f"{kit}; battery platform confirmed on the quote.", EACH)

ACC = category(
    "power-tool-accessories", "Drill Bits, Discs & Diamond Blades", "CAT-109", TOOLS,
    "Masonry, SDS-plus, SDS-max, HSS and wood drill bits, core bits, chisels, metal and stone cutting discs, flap discs, diamond blades for concrete, tile, asphalt and granite, and saw blades.",
    ["Drilling and fixing on site", "Cutting steel, brick, tile and concrete", "Chasing, coring and demolition"],
    "Match the disc or blade to the material and the tool's speed rating, never use a damaged or out-of-date disc, and keep the guard on. Wear eye protection and a dust mask when cutting masonry.",
)
for dia in (4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20):
    P(code("AA-ACC-MASBIT", dia), f"Masonry Drill Bit {dia} mm", ACC, "Tungsten-carbide masonry bit", f"Tungsten-carbide-tipped masonry bit, {dia} mm, for brick and block.", EACH)
for dia, lengths in ((6, (110, 160)), (8, (110, 160, 210)), (10, (160, 210, 260)), (12, (160, 210, 310)), (14, (160, 260)), (16, (210, 310)), (18, (210, 460)), (20, (260, 460)), (22, (260,)), (25, (260, 460))):
    for length in lengths:
        P(code("AA-ACC-SDSP", dia, length), f"SDS-Plus Drill Bit {dia} × {length} mm", ACC, "SDS-plus hammer drill bit", f"SDS-plus hammer bit, {dia} mm, {length} mm overall, for concrete.", EACH)
for dia in (16, 20, 25, 28, 32, 40):
    P(code("AA-ACC-SDSMAX", dia), f"SDS-Max Drill Bit {dia} × 540 mm", ACC, "SDS-max hammer drill bit", f"SDS-max hammer bit, {dia} × 540 mm.", EACH)
for dia in (1, 2, 3, 4, 5, 6, 8, 10, 12, 13):
    P(code("AA-ACC-HSS", dia), f"HSS Metal Drill Bit {dia} mm (pack of 2)", ACC, "HSS twist drill (DIN 338)", f"High-speed-steel twist drill, {dia} mm.", (("PACK", "Pack (2)"),))
for name in ("HSS Drill Bit Set 1–13 mm (25-Piece)", "Masonry Drill Bit Set 4–10 mm (5-Piece)", "Wood Spade Bit Set (6-Piece)", "Wood Auger Bit 16 × 450 mm", "Hole Saw Kit (Bi-Metal, 9-Piece)",
             "SDS-Plus Pointed Chisel 250 mm", "SDS-Plus Flat Chisel 20 × 250 mm", "SDS-Max Pointed Chisel 400 mm", "SDS-Max Flat Chisel 25 × 400 mm", "Hex Breaker Point 28 mm", "Hex Breaker Chisel 28 mm",
             "Screwdriver Bit Set (32-Piece)", "Tile Drill Bit Set (Diamond, 5-Piece)"):
    P(code("AA-ACC-SET", name), name, ACC, "Power tool accessory", f"{name}.", EACH)
for dia in (52, 65, 82, 102, 127, 152, 202):
    P(code("AA-ACC-CORE", dia), f"Diamond Core Bit {dia} mm (Wet/Dry)", ACC, "Laser-welded diamond core bit", f"Diamond core bit, {dia} mm, for openings in concrete and masonry.", EACH)
for size in (115, 125, 180, 230):
    for kind in ("Metal Cutting Disc", "Stainless Steel Cutting Disc (Inox)", "Stone Cutting Disc", "Metal Grinding Disc", "Flap Disc Grit 60", "Flap Disc Grit 80"):
        P(code("AA-ACC-DISC", size, kind), f"{kind} {size} mm (pack of 10)", ACC, "EN 12413 bonded abrasive", f"{kind}, {size} mm, pack of 10.", PACK10)
for size in (115, 125, 180, 230, 300, 350, 400):
    for kind in ("Diamond Blade, Segmented (General Purpose)", "Diamond Blade, Turbo (Concrete & Brick)", "Diamond Blade, Continuous Rim (Tile)", "Diamond Blade, Asphalt", "Diamond Blade, Granite & Hard Stone"):
        if size >= 300 and "Tile" in kind:
            continue
        if size <= 125 and "Asphalt" in kind:
            continue
        P(code("AA-ACC-DIAM", size, kind), f"{kind} {size} mm", ACC, "Laser-welded or sintered diamond blade", f"{kind}, {size} mm — check the bore and the tool's speed rating.", EACH)
for size, teeth in (("185 mm", 24), ("185 mm", 40), ("235 mm", 24), ("235 mm", 48), ("254 mm", 60), ("254 mm", 80)):
    P(code("AA-ACC-TCT", size, teeth), f"TCT Saw Blade {size}, {teeth}T", ACC, "Tungsten-carbide-tipped saw blade", f"TCT circular saw blade, {size}, {teeth} teeth.", EACH)
for name in ("Jigsaw Blades Wood (pack of 5)", "Jigsaw Blades Metal (pack of 5)", "Reciprocating Saw Blades Demolition (pack of 5)", "Sanding Discs 125 mm Assorted (pack of 50)", "Wire Cup Brush 100 mm (M14)"):
    P(code("AA-ACC-BLADE", name), name, ACC, "Power tool accessory", f"{name}.", (("PACK", "Pack"),) if "pack of" in name else EACH)

EQUIP = category(
    "site-equipment", "Concrete & Compaction Equipment", "CAT-110", TOOLS,
    "Concrete mixers from 120 to 350 L, plate compactors, rammers, poker vibrators and shafts, power floats and trowels, screed rails, vibrating screeds, block-making machines and water pumps.",
    ["Mixing and placing concrete", "Compacting trenches, paving bases and fills", "Floors and slab finishing"],
    TOOL_HANDLING + " Compaction plant is used with hearing protection and away from trench edges.",
)
for size, power in (("120 L", "Electric"), ("150 L", "Electric"), ("200 L", "Electric"), ("350 L", "Electric"), ("350 L", "Petrol"), ("350 L", "Diesel")):
    for mode in ("Sale", "Hire"):
        P(code("AA-EQP-MIXER", size, power, mode), f"Concrete Mixer {size}, {power} ({mode})", EQUIP, "Drum concrete mixer", f"{power} drum concrete mixer, {size} — {'for purchase' if mode == 'Sale' else 'on hire'}.", EACH)
for name in ("Plate Compactor 60 kg (Petrol)", "Plate Compactor 90 kg (Petrol)", "Reversible Plate Compactor 160 kg", "Reversible Plate Compactor 300 kg (Diesel)", "Tamping Rammer 70 kg (Petrol)",
             "Poker Vibrator Drive Unit (Petrol)", "Poker Vibrator Shaft 38 mm × 4 m", "Poker Vibrator Shaft 45 mm × 4 m", "Poker Vibrator Shaft 58 mm × 6 m", "Electric High-Frequency Vibrator 45 mm",
             "Power Float / Trowel 900 mm (Petrol)", "Power Float Blades 900 mm (Set)", "Ride-On Power Trowel (Hire)", "Vibrating Screed 3 m (Petrol)", "Vibrating Screed Board 4 m (Aluminium)",
             "Concrete Bull Float 1.2 m with Handle", "Concrete Screed Rail 3 m (Aluminium)", "Concrete Edger & Groover Set", "Block-Making Machine (Manual, 6 Blocks)", "Block-Making Machine (Electric, Egg-Layer)",
             "Paver Mould Set (Rubber, 10)", "Floor Saw 350 mm (Petrol)", "Floor Grinder 250 mm (Hire)", "Core Drill Rig (Hire)", "Concrete Pump (Small Line, Hire)", "Water Pump 2 in (Petrol)",
             "Water Pump 3 in (Petrol)", "Trash Pump 3 in (Petrol)", "Submersible Site Pump 2 in (Electric)", "Rebar Cutter (Electric, 32 mm)", "Rebar Bender (Electric, 32 mm)", "Rebar Tying Tool (Battery)"):
    P(code("AA-EQP", name), name, EQUIP, "Site equipment", f"{name}; sale or hire confirmed on the quote.", EACH)

MEAS = category(
    "measuring-levels", "Levels, Lasers & Measuring Tools", "CAT-111", TOOLS,
    "Spirit levels from 300 mm to 2.4 m, cross-line and rotary lasers, laser distance meters, tape measures, moisture meters, cable and stud detectors, squares and straightedges.",
    ["Setting out walls, ceilings and tiles", "Checking levels and plumb", "Snagging and inspections"],
    "Check spirit levels and lasers against a known level before important work, and store them in their cases.",
)
for length in (300, 600, 900, 1200, 1800, 2400):
    for kind in ("Aluminium Spirit Level", "Box-Section Spirit Level (Heavy Duty)"):
        P(code("AA-MEA-LEVEL", length, kind), f"{kind} {length} mm", MEAS, "Spirit level, accuracy 0.5 mm/m", f"{kind}, {length} mm.", EACH)
for length in (3, 7.5, 10):
    P(code("AA-MEA-TAPE", length), f"Tape Measure {length} m", MEAS, "Class II steel tape measure", f"Steel tape measure, {length} m.", EACH)
for name in ("Cross-Line Laser (Green Beam)", "3 × 360° Line Laser (Green)", "Rotary Laser (Self-Levelling, Red)", "Rotary Laser (Grade, with Receiver)", "Laser Receiver/Detector", "Laser Distance Meter 50 m",
             "Laser Distance Meter 100 m", "Laser Tripod 1.6 m", "Moisture Meter (Timber & Concrete)", "Stud & Cable Detector", "Digital Angle Finder", "Steel Square 600 mm", "Aluminium Straightedge 2.4 m",
             "Aluminium Straightedge 3 m", "Water Level (Hose) 20 m", "Digital Thermometer (Infrared)", "Sound Level Meter", "Concrete Test Hammer (Rebound)"):
    P(code("AA-MEA", name), name, MEAS, "Measuring tool", f"{name}.", EACH)

# =============================================================================================================
# Deeper fit-out: flooring (CAT-112), security (CAT-113), hardware (CAT-114), industrial paint (CAT-115)
# =============================================================================================================
FLOOR = category(
    "carpet-commercial-flooring", "Carpet, Carpet Tiles & Commercial Flooring", "CAT-112", "tiles-flooring",
    "Broadloom carpet and carpet tiles, commercial vinyl sheet and safety flooring, rubber gym flooring, epoxy and polyurethane floor systems, stair nosings and floor-preparation compounds.",
    ["Offices, schools and clinics", "Retail, gyms and hospitality", "Homes and rental units"],
    "Floors go down on a clean, dry, level screed: test the slab's moisture before vinyl or carpet and prime as the maker specifies. Commercial floors are installed by an approved contractor.",
)
for name in ("Broadloom Carpet, Loop Pile (Commercial)", "Broadloom Carpet, Cut Pile (Residential)", "Broadloom Carpet, Saxony Plush", "Carpet Tile 500 × 500 mm, Loop Pile (Grey)",
             "Carpet Tile 500 × 500 mm, Loop Pile (Charcoal)", "Carpet Tile 500 × 500 mm, Loop Pile (Blue)", "Carpet Tile 500 × 500 mm, Patterned", "Carpet Underlay (Foam) 8 mm",
             "Commercial Vinyl Sheet 2 mm (Heterogeneous)", "Homogeneous Vinyl Sheet 2 mm (Clinic/Hospital)", "Safety Vinyl Flooring (Slip-Resistant) 2 mm", "Anti-Static Vinyl Tiles",
             "Rubber Gym Flooring 15 mm", "Rubber Gym Tile 20 mm", "Rubber Stud Flooring 3 mm", "Artificial Grass (Commercial/Sports) 40 mm", "Epoxy Self-Levelling Floor System 2 mm (per m², installed)",
             "Epoxy Flake Floor System (per m², installed)", "Polyurethane Cement Floor Screed 6 mm (per m², installed)", "Entrance Matting (Aluminium/Rubber, per m²)", "Coir Entrance Matting (per m²)"):
    P(code("AA-FLR", name), name, FLOOR, "Commercial and residential floor covering", f"{name.replace(' (per m², installed)', '')} — sold per m²{' and installed' if 'installed' in name else ''}; colour confirmed on the quote.", M2)
for name in ("Carpet Gripper Strip 1.2 m (pack of 10)", "Carpet Adhesive 15 L", "Vinyl Flooring Adhesive 15 L", "Floor Levelling Compound 20 kg", "Floor Primer 5 L", "Carpet Edge Trim (Aluminium) 2.7 m",
             "Vinyl Welding Rod (per metre)", "Aluminium Stair Nosing with Anti-Slip Insert 2.5 m", "PVC Stair Nosing (Anti-Slip) 2.5 m", "Coved Skirting Former (per metre)"):
    P(code("AA-FLR-ACC", name), name, FLOOR, "Flooring accessory", f"{name}.", PACK10 if "pack of 10" in name else (LM if "per metre" in name else EACH))

SEC = category(
    "cctv-access-alarms", "CCTV, Access Control & Alarms", "CAT-113", "security-access",
    "CCTV cameras and recorders, PoE switches, hard drives, intercoms and video door stations, access-control keypads, readers and maglocks, alarm panels, PIR detectors, sirens and electric-fence energisers.",
    ["Homes, estates and complexes", "Offices, shops and warehouses", "Construction sites and farms"],
    "Security systems are installed by a PSIRA-registered installer; electrical connections by a registered electrician. Electric fences need an Electric Fence System Certificate (SANS 10222-3).",
)
for res in ("2 MP", "4 MP", "8 MP (4K)"):
    for kind in ("Bullet Camera (IP, PoE)", "Dome Camera (IP, PoE)", "Bullet Camera (Analogue HD)", "Dome Camera (Analogue HD)"):
        P(code("AA-SEC-CAM", res, kind), f"CCTV {kind} {res}", SEC, "CCTV camera, IP66 outdoor", f"CCTV {kind.lower()}, {res}, with night vision.", EACH)
for name in ("PTZ Camera 4 MP (IP)", "Wi-Fi Camera (Battery, Solar)", "Network Video Recorder 4-Channel (PoE)", "Network Video Recorder 8-Channel (PoE)", "Network Video Recorder 16-Channel",
             "Digital Video Recorder 4-Channel", "Digital Video Recorder 8-Channel", "Surveillance Hard Drive 1 TB", "Surveillance Hard Drive 2 TB", "Surveillance Hard Drive 4 TB",
             "PoE Switch 4-Port", "PoE Switch 8-Port", "CAT6 Cable 305 m Box", "CCTV Power Supply 12 V 5 A", "CCTV Junction Box", "CCTV Monitor 22 in",
             "Video Door Station & Monitor Kit", "Audio Intercom (Gate, 1-Button)", "GSM Intercom (Gate)", "Access Control Keypad (Standalone)", "Proximity Card Reader", "Biometric Fingerprint Reader",
             "Magnetic Lock 280 kg", "Electric Door Strike", "Exit Button (Request to Exit)", "Proximity Tags (pack of 10)", "Remote Transmitter (Gate, 2-Button)", "Alarm Panel 8-Zone with Keypad",
             "Alarm Panel 16-Zone with Keypad", "PIR Motion Detector (Indoor)", "PIR Motion Detector (Outdoor, Dual Technology)", "Beam Detector 30 m", "Magnetic Door Contact", "Panic Button",
             "Outdoor Siren & Strobe", "Alarm Battery 12 V 7 Ah", "Alarm GSM Communicator", "Electric Fence Energiser 8 J", "Electric Fence Energiser 15 J", "Electric Fence Insulators (pack of 100)",
             "Electric Fence Wire 2.5 mm Aluminium (per metre)", "Electric Fence Bracket (Wall-Top, 8-Line)", "Electric Fence Warning Sign", "Electric Fence Lightning Diverter", "Electric Fence Earth Spike Kit"):
    units = PACK10 if "pack of 10" in name else ((("PACK", "Pack (100)"),) if "pack of 100" in name else (LM if "per metre" in name else EACH))
    P(code("AA-SEC", name), name, SEC, "Security equipment", f"{name}; make confirmed on the quote.", units)

HW = category(
    "industrial-fixings-rivets", "Industrial Fixings, Rivets & Nails by Weight", "CAT-114", "hardware-fasteners",
    "High-tensile bolts and nuts by grade, coach screws, through bolts, rivets and rivet guns, roofing and wire nails by the kilogram, shot-fired pins and washers.",
    ["Steel erection and structures", "Industrial maintenance", "Carpentry and roofing in bulk"],
    "Bolts are matched to the engineer's grade (8.8 or 10.9) and torque; never mix grades. Nails sold by the kilogram are packed in the nearest bag size.",
)
for grade in ("8.8", "10.9"):
    for dia, lengths in (("M12", (40, 50, 75, 100)), ("M16", (50, 75, 100, 150)), ("M20", (60, 80, 100, 150)), ("M24", (80, 100, 150))):
        for length in lengths:
            P(code("AA-HW-HT", grade, dia, length), f"High-Tensile Bolt & Nut {dia} × {length} mm, Grade {grade}", HW, f"ISO 4014 hex bolt, property class {grade}",
              f"High-tensile hex bolt with nut, {dia} × {length} mm, grade {grade}, galvanised or black on the quote.", (("EACH", "Each"), ("PACK", "Box (confirmed on quote)")))
for dia in ("M8", "M10", "M12"):
    for length in (50, 75, 100, 150):
        P(code("AA-HW-COACH", dia, length), f"Coach Screw {dia} × {length} mm (Galvanised)", HW, "Galvanised coach screw", f"Galvanised coach screw, {dia} × {length} mm, for timber.", (("PACK", "Pack (10)"),))
for size in ("3.2 × 8", "4 × 10", "4 × 12", "4.8 × 12", "4.8 × 16", "4.8 × 20"):
    for mat in ("Aluminium", "Stainless Steel"):
        P(code("AA-HW-RIVET", size, mat), f"Pop Rivets {size} mm, {mat} (box of 500)", HW, "Blind rivet (ISO 15977/15983)", f"{mat} blind rivets, {size} mm.", (("PACK", "Box (500)"),))
for name in ("Hand Rivet Gun", "Lazy-Tong Rivet Gun (Heavy Duty)", "Shot-Fired Nails 32 mm (pack of 100)", "Shot-Fired Cartridges .27 Cal (pack of 100)", "Powder-Actuated Nailer"):
    P(code("AA-HW-TOOL", name), name, HW, "Fastening tool", f"{name}.", (("PACK", "Pack (100)"),) if "pack of 100" in name else EACH)
for nail, sizes in (("Wire Nails (Bright)", ("50 mm", "75 mm", "100 mm", "125 mm", "150 mm")), ("Galvanised Wire Nails", ("50 mm", "75 mm", "100 mm")), ("Clout Nails (Galvanised)", ("25 mm", "40 mm", "50 mm")),
                    ("Roofing Nails (Galvanised, Twisted)", ("65 mm", "75 mm")), ("Masonry Nails", ("50 mm", "75 mm")), ("Panel Pins", ("20 mm", "30 mm"))):
    for size in sizes:
        P(code("AA-HW-NAILKG", nail, size), f"{nail} {size}, by the kg", HW, "Wire nails, sold by weight", f"{nail}, {size}, sold by the kilogram.", KG)

PAINT = category(
    "industrial-coatings", "Industrial & Protective Coatings", "CAT-115", "paint-waterproofing",
    "Zinc-rich and epoxy primers, high-build epoxy and polyurethane topcoats, chlorinated-rubber and road-marking-grade coatings, heat-resistant and anti-corrosion paints, galvanising repair, tank linings and wood finishes.",
    ["Steel structures and tanks", "Factories, mines and plants", "Marine and coastal exposure"],
    "Industrial coatings follow the specified system (surface preparation, primer, build and topcoat) and SANS 12944 corrosivity class. Apply within the temperature and humidity limits on the data sheet.",
)
for name, sizes in (("Zinc-Rich Epoxy Primer (2-Part)", ("5 L", "20 L")), ("Zinc Phosphate Primer", ("5 L", "20 L")), ("Red Oxide Primer", ("5 L", "20 L")), ("Etch Primer (for Galvanising)", ("1 L", "5 L")),
                    ("High-Build Epoxy (2-Part), Grey", ("5 L", "20 L")), ("Epoxy Tank Lining (Potable Water)", ("5 L", "20 L")), ("Polyurethane Topcoat (2-Part), Gloss", ("5 L", "20 L")),
                    ("Chlorinated Rubber Paint", ("5 L", "20 L")), ("Heat-Resistant Paint 600 °C, Black", ("1 L", "5 L")), ("Heat-Resistant Paint 600 °C, Aluminium", ("1 L", "5 L")),
                    ("Cold Galvanising Spray (Zinc) 500 ml", ("each",)), ("Galvanising Repair Paint", ("1 L", "5 L")), ("Rust Converter", ("1 L", "5 L")), ("Anti-Corrosion Enamel (Direct-to-Metal)", ("5 L", "20 L")),
                    ("Safety Yellow Machinery Enamel", ("5 L",)), ("Epoxy Thinners", ("5 L", "20 L")), ("PU Thinners", ("5 L",)), ("Bitumen Aluminium Paint", ("5 L", "20 L")),
                    ("Wood Varnish (Polyurethane), Gloss", ("1 L", "5 L")), ("Wood Varnish (Polyurethane), Satin", ("1 L", "5 L")), ("Wood Stain & Sealer, Imbuia", ("1 L", "5 L")), ("Wood Preservative (Clear)", ("5 L", "20 L"))):
    for size in sizes:
        label = name if size == "each" else f"{name} {size}"
        P(code("AA-PNT-IND", name, size), label, PAINT, "Industrial / protective coating", f"{label}.", EACH)
