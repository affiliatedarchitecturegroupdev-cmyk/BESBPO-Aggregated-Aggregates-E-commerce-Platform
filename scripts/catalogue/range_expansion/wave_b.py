"""Wave B (ROADMAP 2.3): the contractor core.

Formwork, Scaffolding & Access · Roads, Civil & Traffic · Precast Concrete · Construction Chemicals ·
Insulation, Fire & Acoustic — and deeper Water Storage & Plumbing and Electrical & Solar.
"""
from .common import EACH, LM, M2, P, category, code, fmt

PACK10 = (("PACK", "Pack (10)"),)

# =============================================================================================================
# Formwork, Scaffolding & Access (CAT-73..75; CAT-56 moves here from Boards & Formwork)
# =============================================================================================================
FORM = "formwork-access"
FORM_HANDLING = (
    "Formwork, props and scaffolding must be designed, erected, inspected and used as the Construction Regulations "
    "(2014) require, by a competent person, on firm bearing. Check every component for damage before use."
)
FACC = category(
    "formwork-accessories", "Formwork Ties, Cones & Accessories", "CAT-73", FORM,
    "Tie rods and wing nuts, cones and plugs, she-bolts, column formers, void formers, chamfer and drip strips, spacers, form oil and release agents.",
    ["Walls, columns and beams", "Suspended slabs and stairs", "Tanks, retaining walls and civil structures"],
    FORM_HANDLING,
)
for dia in (15, 17, 20):
    for length in (0.5, 0.75, 1.0, 1.5, 3.0):
        P(code("AA-FRM-TIEROD", dia, fmt(length)), f"Formwork Tie Rod {dia} mm × {fmt(length)} m", FACC, "Hot-rolled formwork tie rod",
          f"Threaded formwork tie rod, {dia} mm, {fmt(length)} m — cut to the wall thickness on order.", EACH)
    for part in ("Wing Nut", "Waler Plate (Super Plate)", "Hex Nut", "Tie Rod Coupler"):
        P(code("AA-FRM", part, dia), f"Formwork {part} {dia} mm", FACC, "Formwork tie hardware", f"{part} for {dia} mm tie rods.", EACH)
for name, desc in (
    ("Formwork Cone 22 mm (pack of 100)", "PVC cones for tie-rod sleeves."),
    ("PVC Tie Sleeve 22 mm × 3 m", "PVC sleeve over tie rods through the wall."),
    ("Formwork Plug (Concrete Cone) 22 mm (pack of 100)", "Concrete plugs to fill tie holes."),
    ("She-Bolt Assembly 17 mm", "Re-usable she-bolt for heavy wall formwork."),
    ("Formwork Tie Spacer Tube 22 mm (pack of 100)", "Spacer tubes cut to wall width."),
):
    P(code("AA-FRM-ACC", name), name, FACC, "Formwork accessory", desc, (("PACK", "Pack (100)"),) if "pack of 100" in name else EACH)
for dia in (200, 250, 300, 350, 400, 450, 500, 600):
    P(code("AA-FRM-COLFORM", dia), f"Cardboard Column Former {dia} mm", FACC, "Spiral-wound single-use column form",
      f"Single-use spiral-wound column former, {dia} mm diameter, cut to the column height on order — sold per metre.", LM)
for size in ("Rectangular Polystyrene Void Former 100 mm (per m²)", "Rectangular Polystyrene Void Former 150 mm (per m²)", "Rectangular Polystyrene Void Former 200 mm (per m²)", "Polystyrene Void Former 250 mm (per m²)"):
    P(code("AA-FRM-VOID", size), size, FACC, "Expanded polystyrene void former", f"{size.replace(' (per m²)', '')}, for waffle slabs and voids — cut to the layout.", M2)
for name, units in (("Timber Chamfer Strip 20 mm × 3 m", EACH), ("PVC Chamfer Strip 20 mm × 3 m", EACH), ("PVC Chamfer Strip 25 mm × 3 m", EACH), ("PVC Drip Strip × 3 m", EACH),
                    ("Rebar Cover Spacer 25 mm (pack of 100)", (("PACK", "Pack (100)"),)), ("Rebar Cover Spacer 40 mm (pack of 100)", (("PACK", "Pack (100)"),)), ("Rebar Cover Spacer 50 mm (pack of 100)", (("PACK", "Pack (100)"),)),
                    ("Slab Edge Form Bracket", EACH), ("Formwork Nails 75 mm Double-Headed 5 kg", EACH)):
    P(code("AA-FRM-STRIP", name), name, FACC, "Formwork accessory", f"{name}.", units)
for name, sizes in (("Mould Oil (Form Release, Mineral)", ("20 L", "210 L")), ("Chemical Release Agent (Water-Based)", ("20 L", "210 L")), ("Formwork Face Sealer", ("5 L", "20 L"))):
    for size in sizes:
        P(code("AA-FRM-OIL", name, size), f"{name} {size}", FACC, "Formwork release agent", f"{name}, {size} — sprayed or rolled on before every pour.", EACH)

PROPS = category(
    "props-shoring-beams", "Props, Shoring & Formwork Beams", "CAT-74", FORM,
    "Adjustable steel props in five ranges, fork heads, tripods and base plates, H20 timber and aluminium formwork beams, shoring frames and trench shoring — for sale or hire.",
    ["Suspended slabs and beams", "Back-propping and repairs", "Trenches and excavations"],
    FORM_HANDLING,
)
for rng in ("1.6–2.9 m", "1.8–3.1 m", "2.0–3.5 m", "2.5–4.0 m", "3.0–5.0 m"):
    for kind, desc in (("Sale", "new, for purchase"), ("Hire", "on hire per prop per week — rate confirmed on the quote")):
        P(code("AA-FRM-PROP", rng.replace("–", "-"), kind), f"Adjustable Steel Prop {rng} ({kind})", PROPS, "EN 1065 adjustable telescopic steel prop",
          f"Galvanised or painted adjustable steel prop, {rng}, {desc}.", EACH)
for name in ("Prop Fork Head", "Prop Base Plate", "Prop Tripod (Folding)", "Prop Drop-Head", "Prop Extension Pin"):
    P(code("AA-FRM-PROPACC", name), name, PROPS, "Prop accessory", f"{name} for adjustable steel props.", EACH)
for length in (2.45, 2.9, 3.3, 3.6, 3.9, 4.5, 4.9, 5.9):
    P(code("AA-FRM-H20", f"{length}"), f"H20 Timber Formwork Beam {length} m", PROPS, "EN 13377 timber formwork beam", f"H20 timber formwork beam, {length} m, for slab and wall formwork.", EACH)
for length in (1.8, 2.4, 3.0, 3.6, 4.2, 4.8):
    P(code("AA-FRM-ALUBEAM", fmt(length)), f"Aluminium Formwork Beam {fmt(length)} m", PROPS, "Aluminium formwork primary beam", f"Lightweight aluminium formwork beam, {fmt(length)} m.", EACH)
for name in ("Shoring Frame 1.2 × 1.8 m", "Shoring Frame 1.2 × 1.5 m", "Shoring Cross Brace", "Shoring U-Head Jack 600 mm", "Shoring Base Jack 600 mm",
             "Trench Shoring Box (per day hire)", "Hydraulic Trench Strut", "Trench Sheet (Steel) 3 m", "Trench Sheet (Steel) 4 m"):
    P(code("AA-FRM-SHORE", name), name, PROPS, "Shoring component, sale or hire", f"{name} — sale or hire confirmed on the quote.", EACH)

ACCESS = category(
    "ladders-access", "Ladders, Towers & Trestles", "CAT-75", FORM,
    "Aluminium and fibreglass stepladders, extension and combination ladders, platform ladders, mobile aluminium towers, trestles, hop-ups and scaffold boards.",
    ["Painting, ceilings and electrical work", "Working at height on site", "Maintenance and shopfitting"],
    "Ladders must suit the job and be inspected before use (SANS 50131 / EN 131). Use fibreglass ladders near electricity, set extension ladders at 1-in-4, and use a tower or scaffold for long work at height.",
)
for steps in (3, 4, 5, 6, 7, 8, 10, 12):
    for mat in ("Aluminium", "Fibreglass"):
        P(code("AA-ACC-STEP", mat, steps), f"{mat} Stepladder {steps}-Step", ACCESS, "SANS 50131 (EN 131) ladder",
          f"{mat} stepladder with {steps} steps — {'non-conductive, for electrical work' if mat == 'Fibreglass' else 'lightweight for trades and maintenance'}.", EACH)
for size in ("2 × 8", "2 × 10", "2 × 12", "2 × 14", "3 × 10", "3 × 12", "3 × 14"):
    for mat in ("Aluminium", "Fibreglass"):
        P(code("AA-ACC-EXT", mat, size), f"{mat} Extension Ladder {size} Rungs", ACCESS, "SANS 50131 (EN 131) ladder", f"{mat} extension ladder, {size} rungs.", EACH)
for name in ("Combination Ladder 3 × 6 (Multi-Purpose)", "Combination Ladder 4 × 4 (Telescopic)", "Platform Ladder 4-Step with Handrail", "Platform Ladder 6-Step with Handrail",
             "Mobile Aluminium Tower 2.5 m Platform", "Mobile Aluminium Tower 4.2 m Platform", "Mobile Aluminium Tower 6.2 m Platform", "Mobile Tower Outrigger Set",
             "Folding Steel Trestle 1.2 m", "Folding Steel Trestle 2 m", "Adjustable Trestle", "Hop-Up Platform (Aluminium)", "Work Platform 3 m (Aluminium Plank)"):
    P(code("AA-ACC", name), name, ACCESS, "Access equipment", f"{name}; sale, or hire through plant hire.", EACH)
for length in (1.8, 2.4, 3.0, 3.6, 3.9):
    P(code("AA-ACC-BOARD", fmt(length)), f"Scaffold Board 38 × 228 mm × {fmt(length)} m", ACCESS, "Graded timber scaffold board, banded ends", f"Timber scaffold board, {fmt(length)} m, with steel-banded ends.", EACH)

# =============================================================================================================
# Roads, Civil & Traffic (CAT-76..80)
# =============================================================================================================
ROADS = "roads-civil"
ASPH = category(
    "asphalt-bitumen", "Asphalt, Bitumen & Road Repair", "CAT-76", ROADS,
    "Cold-mix asphalt in bags and bulk, anionic and cationic bitumen emulsions, prime and tack coats, penetration-grade bitumen, crack sealants and pothole repair.",
    ["Pothole and road repair", "Driveways, parking and access roads", "Priming and sealing layer works"],
    "Bitumen products are applied in dry weather at the temperatures and rates on the data sheet. Heated bitumen burns — use PPE and keep emulsions from freezing. Larger road works follow the road authority's specification.",
)
for name, std, desc, sizes in (
    ("Cold-Mix Asphalt", "Cold premix asphalt", "ready-to-use cold asphalt for potholes and patches — compact with a roller or plate", ("25 kg bag", "40 kg bag", "1 t bulk bag")),
    ("Pothole Repair Asphalt (Polymer-Modified)", "Polymer-modified cold asphalt", "high-strength cold asphalt for trafficked patches", ("25 kg bucket",)),
    ("Anionic Bitumen Emulsion SS60", "SANS 309 anionic bitumen emulsion", "stable-grade emulsion for tack coats, slurry and dust control", ("20 L", "200 L drum", "1,000 L bulk")),
    ("Cationic Bitumen Emulsion CSS60", "SANS 548 cationic bitumen emulsion", "stable-grade cationic emulsion", ("200 L drum", "1,000 L bulk")),
    ("Cationic Spray-Grade Emulsion (CRS)", "SANS 548 cationic bitumen emulsion", "rapid-setting emulsion for chip seals", ("1,000 L bulk",)),
    ("Bitumen Prime Coat (MC-30)", "Medium-curing cutback bitumen", "prime coat on a new granular base before surfacing", ("20 L", "200 L drum")),
    ("Bitumen Tack Coat", "Bitumen emulsion tack coat", "bonds a new asphalt layer to the old surface", ("20 L", "200 L drum")),
    ("Penetration-Grade Bitumen 70/100", "SANS 4001-BT1 penetration-grade bitumen", "paving-grade bitumen for hot-mix work", ("200 L drum",)),
    ("Bituminous Crack Sealant (Hot-Pour)", "Hot-applied crack sealant", "seals cracks in asphalt and concrete roads", ("20 kg block",)),
    ("Bituminous Crack Sealant (Cold-Pour)", "Cold-applied crack sealant", "cold-poured crack filler for asphalt", ("5 L", "20 L")),
    ("Asphalt Jointing Strip 50 mm × 10 m", "Bituminous joint tape", "seals the joint between new and old asphalt", ("roll",)),
    ("Slurry Seal Mix", "Bitumen slurry seal", "slurry seal for driveways and parking surfaces", ("20 L", "200 L drum")),
):
    for size in sizes:
        P(code("AA-RDS", name, size), f"{name}, {size}", ASPH, std, f"{name}: {desc}. Supplied as {size}.", EACH)
P("AA-RDS-HOTMIX-BULK", "Hot-Mix Asphalt (Continuously Graded), per Tonne", ASPH, "COLTO / SANS 1200 hot-mix asphalt", "Hot-mix asphalt from the plant, delivered hot in tipper loads for paving — quoted per tonne with laying on request.", (("TONNE", "Per tonne"),))

MARK = category(
    "road-marking", "Road Marking & Road Studs", "CAT-77", ROADS,
    "Water- and solvent-borne road-marking paint in white, yellow and red, thermoplastic, retro-reflective glass beads, road studs and cat's eyes, kerb paint and parking-bay stencils.",
    ["Parking lots and loading bays", "Estate and municipal roads", "Warehouses, schools and shopping centres"],
    "Mark on a clean, dry surface above the paint's minimum temperature, and drop glass beads into wet paint for night visibility. Markings on public roads must follow the SADC Road Traffic Signs Manual.",
)
for paint in ("Water-Borne Road-Marking Paint", "Solvent-Borne Road-Marking Paint"):
    for colour in ("White", "Yellow", "Red"):
        for size in ("5 L", "20 L"):
            P(code("AA-RDS-MARK", paint[:5], colour, size), f"{paint}, {colour} {size}", MARK, "Road-marking paint to the road authority's specification",
              f"{paint.lower().capitalize()} in {colour.lower()}, {size} — for road lines, parking bays and arrows.", EACH)
for colour in ("White", "Yellow"):
    P(code("AA-RDS-THERMO", colour), f"Thermoplastic Road-Marking Compound, {colour} 25 kg", MARK, "Hot-applied thermoplastic road marking", f"Hot-applied thermoplastic in {colour.lower()}, 25 kg bag.", EACH)
for name in ("Retro-Reflective Glass Beads 25 kg", "Road Stud (Cat's Eye) Bi-Directional, White", "Road Stud (Cat's Eye) Bi-Directional, Yellow", "Road Stud Uni-Directional, Red",
             "Solar Road Stud (LED)", "Road Stud Bitumen Adhesive Pad (pack of 100)", "Two-Part Road Stud Epoxy 1 kg", "Kerb Paint (Black/White) 5 L",
             "Parking Bay Stencil Set (Numbers)", "Disabled Parking Stencil", "Arrow Stencil Set", "Line-Marking Machine (Hand Push)", "Line-Marking Aerosol Paint, White (pack of 12)", "Line-Marking Aerosol Paint, Yellow (pack of 12)"):
    units = (("PACK", "Pack (100)"),) if "pack of 100" in name else ((("PACK", "Pack (12)"),) if "pack of 12" in name else EACH)
    P(code("AA-RDS-MARKACC", name), name, MARK, "Road-marking product", f"{name}.", units)

TRAFFIC = category(
    "traffic-safety", "Traffic Cones, Barriers & Signs", "CAT-78", ROADS,
    "Traffic cones from 450 to 1,000 mm, delineators, water-filled and mesh barriers, flashing lights, temporary road-works signs, stop/go boards, speed humps and wheel stops.",
    ["Road works and lane closures", "Parking lots and estates", "Site traffic management"],
    "Temporary traffic control on public roads follows the SADC Road Traffic Signs Manual (Volume 2, Chapter 13) and the road authority's approved plan. Inspect cones and signs for reflectivity.",
)
for height in (450, 750, 1000):
    for kind in ("Standard", "Heavy Base"):
        P(code("AA-RDS-CONE", height, kind), f"Traffic Cone {height} mm, {kind}", TRAFFIC, "Retro-reflective PVC traffic cone",
          f"Orange traffic cone, {height} mm, with retro-reflective sleeves, {kind.lower()}.", EACH)
for name in ("Delineator Post 1 m with Base", "Flexible Delineator (Bolt-Down)", "Cone Bar 2 m", "Water-Filled Barrier 1.5 m (Red/White)", "Water-Filled Barrier 2 m (Red/White)",
             "Plastic Pedestrian Barrier 2 m", "Steel Mesh Crowd Barrier 2.4 m", "New Jersey Plastic Barrier 1 m", "Flashing Warning Light (Battery)", "Solar Flashing Light",
             "Stop/Go Paddle (Reflective)", "Rubber Speed Hump Section 500 mm", "Rubber Speed Hump End Cap", "Rubber Wheel Stop 1.8 m", "Concrete Wheel Stop 1.8 m",
             "Cable Protector Ramp (2-Channel)", "Corner Guard (Rubber) 800 mm", "Parking Bollard (Steel, Removable)", "Parking Bollard (Steel, Fixed)", "Reflective Barrier Tape 50 m", "Hazard Tape (Red/White) 100 m"):
    P(code("AA-RDS-TRAF", name), name, TRAFFIC, "Traffic safety product", f"{name} for traffic and site safety.", EACH)
for sign in ("Road Works Ahead", "Men at Work", "Detour", "Road Closed", "Keep Left", "Keep Right", "Speed Limit 40", "Speed Limit 60", "Flagman Ahead", "Lane Closed", "Uneven Surface", "Loose Stones"):
    for size in (600, 900, 1200):
        P(code("AA-RDS-SIGN", sign, size), f"Temporary Road Sign '{sign}' {size} mm", TRAFFIC, "Retro-reflective temporary sign to the SADC RTSM",
          f"Retro-reflective temporary road-works sign, '{sign}', {size} mm, on aluminium or composite — stand or post confirmed on the quote.", EACH)
for name in ("Sign Stand (A-Frame Folding)", "Sign Stand with Sandbag Base", "Sign Post 3 m Galvanised with Clamps"):
    P(code("AA-RDS-SIGNSTAND", name), name, TRAFFIC, "Sign support", f"{name}.", EACH)

SURVEY = category(
    "survey-setting-out", "Survey & Setting-Out Equipment", "CAT-79", ROADS,
    "Timber pegs and steel pins, profile boards, builder's line, marking paint, measuring tapes and wheels, dumpy and laser levels, staffs, tripods and ranging rods.",
    ["Setting out foundations and buildings", "Road and pipeline survey", "Earthworks and levels"],
    "Keep instruments in their cases and check levels and lasers for calibration before setting out. Mark services before digging — call the municipality for underground services.",
)
for length in (300, 450, 600, 900):
    P(code("AA-SRV-PEG", length), f"Timber Setting-Out Peg 25 × 25 × {length} mm (pack of 50)", SURVEY, "Pointed pine survey peg", f"Pointed timber pegs, {length} mm, pack of 50.", (("PACK", "Pack (50)"),))
for length in (300, 450, 600):
    P(code("AA-SRV-PIN", length), f"Steel Survey Pin {length} mm (pack of 10)", SURVEY, "Steel survey pin", f"Steel survey pins, {length} mm, with caps.", PACK10)
for colour in ("Fluorescent Orange", "Fluorescent Pink", "Fluorescent Green", "Fluorescent Yellow", "White", "Blue"):
    P(code("AA-SRV-MARKPAINT", colour), f"Inverted Marking Paint 500 ml, {colour} (pack of 12)", SURVEY, "Upside-down marking aerosol", f"Upside-down marking spray, {colour.lower()}.", (("PACK", "Pack (12)"),))
for name in ("Builder's Line 100 m (Nylon)", "Builder's Line 200 m (Nylon)", "Chalk Line Reel 30 m", "Chalk Powder 500 g (Blue)", "Profile Board Kit (Corner)",
             "Fibreglass Measuring Tape 30 m", "Fibreglass Measuring Tape 50 m", "Steel Measuring Tape 100 m", "Measuring Wheel (Single)", "Measuring Wheel (Double, Professional)",
             "Automatic (Dumpy) Level 24×", "Automatic (Dumpy) Level 32×", "Aluminium Levelling Staff 5 m", "Aluminium Tripod (Flat Head)", "Rotary Laser Level (Self-Levelling) with Receiver",
             "Grade Rod 2.4 m", "Ranging Rod 2 m (Red/White)", "Boning Rods (Set of 3)", "Survey Flagging Tape 50 m", "Plumb Bob 500 g"):
    P(code("AA-SRV", name), name, SURVEY, "Survey and setting-out equipment", f"{name}; make confirmed on the quote.", EACH)

EROS = category(
    "erosion-sandbags", "Erosion Control, Sandbags & Silt Fencing", "CAT-80", ROADS,
    "Woven polypropylene sandbags, biodegradable erosion-control mats, coir logs and blankets, silt fence and hydroseeding mixes — with geotextiles and gabions from drainage.",
    ["Slopes, embankments and channels", "Flood and storm-water protection", "Construction-site sediment control"],
    "Install erosion and sediment control before earthworks start, keyed into the ground on the contour, and maintain it after every storm.",
)
for name, units in (("Woven Sandbag (Empty) 400 × 700 mm (pack of 100)", (("PACK", "Pack (100)"),)), ("Woven Sandbag (Empty) 500 × 800 mm (pack of 100)", (("PACK", "Pack (100)"),)),
                    ("UV-Stabilised Sandbag 400 × 700 mm (pack of 100)", (("PACK", "Pack (100)"),)), ("Filled Sandbag (per bag, on order)", EACH), ("Bulk Bag (FIBC) 1 t, Empty", EACH),
                    ("Jute Erosion-Control Mat (per m²)", M2), ("Coir Erosion Blanket 400 g/m² (per m²)", M2), ("Coir Erosion Blanket 900 g/m² (per m²)", M2), ("Coir Log 300 mm × 3 m", EACH),
                    ("Coir Log 400 mm × 3 m", EACH), ("Straw Wattle 230 mm × 7.6 m", EACH), ("Silt Fence 900 mm × 100 m (with Stakes)", (("ROLL", "Roll (100 m)"),)),
                    ("Erosion-Control Pegs (Steel U-Pins, pack of 100)", (("PACK", "Pack (100)"),)), ("Hydroseeding Grass Mix (per kg)", (("KG", "Per kg"),)), ("Biodegradable Mulch Netting (per m²)", M2)):
    P(code("AA-ERO", name), name, EROS, "Erosion and sediment control", f"{name}.", units)

# =============================================================================================================
# Precast Concrete (CAT-81..83)
# =============================================================================================================
PRECAST = "precast-concrete"
PC_HANDLING = (
    "Precast units are lifted only at the lifting points with the right equipment and placed on prepared bearing, as the engineer's "
    "design requires. Delivery is by crane truck — confirm access and offloading space with the quote."
)
SPC = category(
    "structural-precast", "Hollow-Core & Rib-and-Block Slabs", "CAT-81", PRECAST,
    "Prestressed hollow-core slabs from 150 to 250 mm, rib-and-block suspended floors (beams and infill blocks), precast staircases, landings and beams — designed and made to order.",
    ["Double-storey houses and townhouses", "Commercial and school floors", "Balconies, landings and stairs"],
    PC_HANDLING,
)
for thickness in (150, 200, 250):
    P(code("AA-PCT-HOLLOWCORE", thickness), f"Prestressed Hollow-Core Slab {thickness} mm", SPC, "Prestressed hollow-core slab, to the engineer's design",
      f"Prestressed hollow-core floor slab, {thickness} mm, made to length for the span — quoted per m² from your floor layout.", M2)
for length in (1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0):
    P(code("AA-PCT-RIBBEAM", fmt(length)), f"Rib-and-Block Prestressed Beam {fmt(length)} m", SPC, "Prestressed rib-and-block beam, to the supplier's span tables",
      f"Prestressed concrete beam for rib-and-block suspended floors, {fmt(length)} m.", EACH)
for name, desc in (
    ("Rib-and-Block Infill Block (Concrete) 440 × 215 × 150 mm", "concrete infill block between beams"),
    ("Rib-and-Block Infill Block (Polystyrene) 1,000 mm", "lightweight polystyrene infill"),
    ("Rib-and-Block Suspended Floor System (per m²)", "beams, blocks, mesh and props designed for the floor and quoted per m²"),
    ("Precast Staircase Flight (to order)", "straight precast stair flight to the stair design"),
    ("Precast Stair Landing (to order)", "precast landing slab"),
    ("Precast Concrete Beam (to order)", "precast reinforced beam to the engineer's design"),
    ("Precast Balcony Slab (to order)", "precast cantilever balcony slab"),
    ("Precast Concrete Column (to order)", "precast column to the engineer's design"),
):
    P(code("AA-PCT-STR", name), name, SPC, "Precast concrete, to the engineer's design", f"{name}: {desc}.", M2 if "per m²" in name else EACH)

RPC = category(
    "road-precast-barriers", "Road Barriers, Bollards & Cable Ducts", "CAT-82", PRECAST,
    "Precast New Jersey barriers, concrete bollards, cable ducts and draw boxes, cable-pit covers, precast palisade and fence-post bases, concrete wheel stops and sleeper walls.",
    ["Road works and median barriers", "Parking, access control and estates", "Electrical and telecoms reticulation"],
    PC_HANDLING,
)
for length in (2.0, 3.0, 4.0):
    P(code("AA-PCT-NJ", fmt(length)), f"Precast New Jersey Barrier {fmt(length)} m", RPC, "Precast concrete safety-shape barrier", f"Precast New Jersey barrier, {fmt(length)} m, with connectors.", EACH)
for name in ("Concrete Bollard Round 300 mm × 900 mm", "Concrete Bollard Square 300 mm × 900 mm", "Concrete Bollard Dome 600 mm", "Concrete Planter Bollard 900 mm"):
    P(code("AA-PCT-BOLLARD", name), name, RPC, "Precast concrete bollard", f"{name} for access control and pedestrian protection.", EACH)
for size in ("300 × 300 mm", "450 × 450 mm", "600 × 600 mm", "900 × 600 mm", "1,200 × 600 mm"):
    P(code("AA-PCT-DRAWBOX", size), f"Precast Cable Draw Box {size} with Lid", RPC, "Precast concrete draw box", f"Precast draw box, {size}, with concrete or steel lid.", EACH)
for dia in (50, 75, 110, 160):
    P(code("AA-PCT-DUCT", dia), f"HDPE Cable Duct {dia} mm (per metre)", RPC, "HDPE or uPVC cable duct", f"Cable duct, {dia} mm, for buried electrical and telecoms cables.", LM)
for name in ("Duct Bank Spacer (4-Way, 110 mm)", "Duct End Cap 110 mm", "Cable Warning Tape 'Electric Cable Below' 250 m", "Precast Fence Post Base", "Precast Palisade Post Footing",
             "Precast Sleeper Wall Panel 1.8 m", "Precast Sleeper Wall Post 1.8 m", "Precast Wheel Stop 1.8 m"):
    P(code("AA-PCT-RD", name), name, RPC, "Precast concrete product", f"{name}.", EACH)

WPC = category(
    "precast-walls-tanks", "Precast Walls, Septic & Conservancy Tanks", "CAT-83", PRECAST,
    "Precast panel boundary walls from 1.2 to 2.4 m high, precast septic and conservancy tanks, soakaway rings and precast water and feed troughs.",
    ["Boundary walls for homes, estates and farms", "On-site sanitation where there's no sewer", "Farms and smallholdings"],
    PC_HANDLING + " Septic and conservancy tanks need municipal approval (SANS 10400-P).",
)
for height in (1.2, 1.5, 1.8, 2.1, 2.4):
    for finish in ("Smooth", "Rock-Face", "Brick-Pattern"):
        P(code("AA-PCT-WALL", fmt(height), finish), f"Precast Panel Wall {fmt(height)} m High, {finish} (per metre)", WPC, "Precast concrete panel wall",
          f"Precast concrete boundary wall, {fmt(height)} m high, {finish.lower()} panels between posts — supplied and erected, quoted per running metre.", LM)
for capacity in ("2,000 L", "3,000 L", "4,500 L", "6,000 L"):
    P(code("AA-PCT-SEPTIC", capacity), f"Precast Septic Tank {capacity}", WPC, "Precast concrete septic tank (SANS 10400-P)", f"Precast septic tank, {capacity}, with lids — sized to the household on the quote.", EACH)
for capacity in ("5,000 L", "10,000 L", "15,000 L"):
    P(code("AA-PCT-CONSERV", capacity), f"Precast Conservancy Tank {capacity}", WPC, "Precast concrete conservancy tank", f"Precast conservancy tank, {capacity}, emptied by municipal or private tanker.", EACH)
for name in ("Soakaway Ring 1,000 mm × 500 mm", "Soakaway Ring 1,500 mm × 500 mm", "Soakaway Cover Slab 1,000 mm", "Soakaway Cover Slab 1,500 mm",
             "Precast Water Trough 1,000 L", "Precast Water Trough 2,000 L", "Precast Feed Trough 2 m"):
    P(code("AA-PCT-TANK", name), name, WPC, "Precast concrete product", f"{name}.", EACH)

# =============================================================================================================
# Construction Chemicals (CAT-84..87)
# =============================================================================================================
CHEM = "construction-chemicals"
CHEM_HANDLING = (
    "Read the product data and safety data sheets before use: mix, apply and cure at the temperatures and rates they give, "
    "wear gloves and eye protection, and store sealed, cool and dry. Coverage depends on the surface — we confirm it on the quote."
)
REPAIR = category(
    "concrete-repair-care", "Concrete Repair, Curing & Floor Treatments", "CAT-84", CHEM,
    "Curing compounds, bonding agents, structural and cosmetic repair mortars, self-levelling screeds, dry-shake floor hardeners, concrete sealers and densifiers, epoxy floor coatings and surface retarders.",
    ["Industrial and warehouse floors", "Repairing spalled and honeycombed concrete", "Curing new slabs and pavements"],
    CHEM_HANDLING,
)
for name, std, sizes in (
    ("Resin-Based Curing Compound", "ASTM C309 liquid membrane-forming curing compound", ("25 L", "210 L")),
    ("Wax-Emulsion Curing Compound", "ASTM C309 liquid membrane-forming curing compound", ("25 L", "210 L")),
    ("Acrylic Bonding Agent", "Acrylic polymer bonding agent", ("5 L", "25 L")),
    ("SBR Bonding & Waterproofing Admix", "Styrene-butadiene (SBR) polymer", ("5 L", "25 L")),
    ("Epoxy Bonding Agent (2-Part)", "Two-part epoxy bonding agent", ("1 kg", "5 kg")),
    ("Structural Repair Mortar (R4)", "EN 1504-3 class R4 repair mortar", ("25 kg",)),
    ("Cosmetic Repair Mortar (Fine)", "EN 1504-3 class R2 repair mortar", ("20 kg",)),
    ("Rapid-Setting Repair Mortar", "Fast-setting cementitious repair mortar", ("25 kg",)),
    ("Self-Levelling Floor Screed (Underlayment)", "Self-levelling cementitious underlayment, 2–10 mm", ("25 kg",)),
    ("Self-Levelling Industrial Screed (Wearing)", "Self-levelling wearing screed, 5–15 mm", ("25 kg",)),
    ("Dry-Shake Floor Hardener (Quartz), Natural", "Dry-shake mineral floor hardener", ("25 kg",)),
    ("Dry-Shake Floor Hardener (Quartz), Grey", "Dry-shake mineral floor hardener", ("25 kg",)),
    ("Dry-Shake Floor Hardener (Metallic)", "Metallic-aggregate floor hardener", ("25 kg",)),
    ("Lithium Silicate Densifier", "Penetrating concrete densifier", ("20 L", "210 L")),
    ("Acrylic Concrete Sealer (Clear)", "Solvent acrylic concrete sealer", ("5 L", "20 L")),
    ("Epoxy Floor Coating (2-Part), Grey", "Two-part epoxy floor coating", ("5 L", "20 L")),
    ("Epoxy Floor Coating (2-Part), Green", "Two-part epoxy floor coating", ("5 L", "20 L")),
    ("Epoxy Floor Primer", "Two-part epoxy primer", ("5 L",)),
    ("Polyurethane Floor Topcoat", "Two-part PU floor topcoat", ("5 L",)),
    ("Anti-Slip Floor Aggregate (Aluminium Oxide)", "Anti-slip broadcast aggregate", ("5 kg", "25 kg")),
    ("Surface Retarder (Exposed Aggregate)", "Surface set retarder", ("25 L",)),
    ("Concrete Cleaner & Etch", "Acid-based concrete etch", ("5 L", "25 L")),
):
    for size in sizes:
        P(code("AA-CHM-REP", name, size), f"{name} {size}", REPAIR, std, f"{name}, {size}.", EACH)

JOINT = category(
    "joints-waterstops", "Joint Fillers, Sealants & Waterstops", "CAT-85", CHEM,
    "Bitumen-impregnated fibreboard and polyethylene joint fillers, polysulphide and polyurethane joint sealants, backer rod, PVC and hydrophilic waterstops and expansion-joint covers.",
    ["Slabs, pavements and industrial floors", "Water-retaining structures and basements", "Façade and movement joints"],
    CHEM_HANDLING + " Joints are sized from the expected movement: depth about half the width, on a backer rod.",
)
for thickness in (10, 12, 20, 25):
    for depth in (100, 150, 200):
        P(code("AA-CHM-FIBRE", thickness, depth), f"Bitumen-Impregnated Fibreboard Joint Filler {thickness} × {depth} mm × 2.4 m", JOINT, "Bitumen-impregnated fibreboard joint filler",
          f"Compressible fibreboard expansion-joint filler, {thickness} mm thick, {depth} mm deep, 2.4 m strips.", EACH)
for thickness in (10, 20):
    P(code("AA-CHM-PEFILL", thickness), f"Closed-Cell Polyethylene Joint Filler {thickness} mm × 1 m × 2 m", JOINT, "Closed-cell PE joint filler", f"Closed-cell polyethylene filler board, {thickness} mm.", (("SHEET", "Sheet"),))
for dia in (6, 10, 13, 16, 20, 25, 30, 40, 50):
    P(code("AA-CHM-BACKER", dia), f"Backer Rod {dia} mm", JOINT, "Closed-cell polyethylene backer rod", f"Closed-cell backer rod, {dia} mm, set under joint sealant — sold per metre or by the reel.", LM)
for name, std, sizes in (
    ("Polysulphide Joint Sealant (2-Part), Grey", "Two-part polysulphide sealant", ("2.5 L", "5 L")),
    ("Polysulphide Joint Sealant (Pourable, Fuel-Resistant)", "Two-part polysulphide sealant", ("5 L",)),
    ("Polyurethane Joint Sealant, Grey (Sausage)", "One-part PU sealant", ("600 ml",)),
    ("Polyurethane Joint Sealant, White (Sausage)", "One-part PU sealant", ("600 ml",)),
    ("Polyurethane Joint Sealant, Black (Sausage)", "One-part PU sealant", ("600 ml",)),
    ("MS Polymer Façade Sealant", "Hybrid MS-polymer sealant", ("290 ml", "600 ml")),
    ("Joint Sealant Primer", "Sealant primer", ("1 L",)),
    ("Hot-Pour Joint Sealant (Rubber-Bitumen)", "Hot-applied rubberised bitumen", ("20 kg",)),
):
    for size in sizes:
        P(code("AA-CHM-SEAL", name, size), f"{name} {size}", JOINT, std, f"{name}, {size}.", EACH)
for width in (150, 230, 320):
    for kind in ("Centre-Bulb", "Dumbbell (Flat)"):
        P(code("AA-CHM-WSTOP", width, kind), f"PVC Waterstop {width} mm, {kind}", JOINT, "PVC waterstop for water-retaining concrete", f"PVC waterstop, {width} mm, {kind.lower()} — sold per metre, with welded junctions to order.", LM)
for name in ("Hydrophilic Swelling Waterstop Strip 20 × 10 mm", "Bentonite Waterstop Strip 25 × 20 mm", "Rear-Guard Waterstop 250 mm", "Expansion Joint Cover (Aluminium Floor) 50 mm", "Expansion Joint Cover (Aluminium Floor) 100 mm"):
    P(code("AA-CHM-JNT", name), name, JOINT, "Joint product", f"{name} — sold per metre.", LM)

ANCH = category(
    "anchors-epoxy-grout", "Chemical Anchors, Epoxy & Grouts", "CAT-86", CHEM,
    "Polyester, vinylester and epoxy chemical-anchor cartridges, anchor studs M8 to M24, mesh sleeves, dispensing guns, epoxy mortars and grouts, and precision non-shrink grouts.",
    ["Fixing starter bars and holding-down bolts", "Machine bases and crane rails", "Fixing to hollow and solid masonry"],
    CHEM_HANDLING + " Chemical anchors are installed to the maker's hole size, cleaning and curing times — the anchor's design load depends on them.",
)
for resin, std in (("Polyester", "Polyester-styrene-free injection resin"), ("Vinylester", "Vinylester injection resin, ETA-assessed"), ("Pure Epoxy", "Epoxy injection resin, ETA-assessed for rebar")):
    for size in ("300 ml", "410 ml", "585 ml"):
        P(code("AA-CHM-ANCH", resin, size), f"{resin} Chemical Anchor Cartridge {size}", ANCH, std, f"{resin} chemical anchor in a {size} cartridge, with mixing nozzles.", EACH)
for dia, lengths in (("M8", (110,)), ("M10", (130,)), ("M12", (160, 220)), ("M16", (190, 300)), ("M20", (260, 350)), ("M24", (300, 400))):
    for length in lengths:
        P(code("AA-CHM-STUD", dia, length), f"Chemical Anchor Stud {dia} × {length} mm, Zinc-Plated, with Nut & Washer", ANCH, "Grade 5.8 anchor rod", f"Anchor stud {dia} × {length} mm for chemical anchors.", EACH)
for name, units in (("Mesh Anchor Sleeve 16 × 85 mm (pack of 10)", PACK10), ("Mesh Anchor Sleeve 20 × 85 mm (pack of 10)", PACK10), ("Chemical Anchor Dispensing Gun (300–410 ml)", EACH),
                    ("Chemical Anchor Dispensing Gun (585 ml)", EACH), ("Spare Mixer Nozzles (pack of 10)", PACK10), ("Hole Cleaning Brush & Blow Pump Kit", EACH),
                    ("Epoxy Mortar (3-Part) 10 kg", EACH), ("Epoxy Grout (Pourable, 3-Part) 15 kg", EACH), ("Epoxy Crack-Injection Resin 1 kg", EACH),
                    ("Precision Non-Shrink Grout (Cementitious) 25 kg", EACH), ("High-Flow Machine Grout 25 kg", EACH), ("Anchoring Grout (Rapid) 5 kg", EACH)):
    P(code("AA-CHM-ANC", name), name, ANCH, "Anchoring and grouting product", f"{name}.", units)

WPS = category(
    "waterproofing-systems", "Waterproofing Systems & Tanking", "CAT-87", CHEM,
    "Crystalline and cementitious waterproofing, polyurethane and acrylic liquid membranes, mineral-finish torch-on in colours, HDPE and bentonite tanking membranes, protection boards and drainage sheets.",
    ["Basements, lift pits and retaining walls", "Flat roofs, balconies and podiums", "Reservoirs, tanks and wet areas"],
    CHEM_HANDLING + " Waterproofing systems are installed by an approved applicator for the maker's guarantee.",
)
for name, std, sizes in (
    ("Crystalline Waterproofing Slurry", "Crystalline capillary waterproofing", ("25 kg",)),
    ("Crystalline Waterproofing Admixture", "Crystalline concrete admixture", ("18 kg",)),
    ("Cementitious Waterproofing Slurry (2-Part Flexible)", "Flexible polymer-cement slurry", ("20 kg kit", "32 kg kit")),
    ("Cementitious Tanking Slurry (Rigid)", "Rigid cementitious tanking", ("25 kg",)),
    ("Polyurethane Liquid Membrane, Grey", "One-part PU liquid membrane", ("6 kg", "25 kg")),
    ("Polyurethane Liquid Membrane, White (UV-Stable)", "One-part aliphatic PU membrane", ("6 kg", "25 kg")),
    ("Acrylic Roof Waterproofing, Terracotta", "Elastomeric acrylic roof coating", ("5 L", "20 L")),
    ("Acrylic Roof Waterproofing, Grey", "Elastomeric acrylic roof coating", ("5 L", "20 L")),
    ("Acrylic Roof Waterproofing, White", "Elastomeric acrylic roof coating", ("5 L", "20 L")),
    ("Bitumen Rubber Emulsion (Damp-Proofing)", "Rubberised bitumen emulsion", ("5 L", "20 L")),
    ("Waterproofing Primer (Bitumen, Solvent)", "Bitumen primer", ("5 L", "20 L")),
    ("Bitumen Paint (Black)", "Bitumen paint", ("5 L", "20 L")),
):
    for size in sizes:
        P(code("AA-CHM-WPS", name, size), f"{name} {size}", WPS, std, f"{name}, {size}.", EACH)
for colour in ("Green", "Grey", "Red", "Charcoal"):
    for thickness in ("4 mm",):
        P(code("AA-CHM-TORCH-MIN", colour), f"Torch-On Membrane {thickness} Mineral Finish, {colour} (10 m roll)", WPS, "APP-modified bitumen membrane, mineral finish",
          f"APP-modified torch-on membrane, {thickness}, with {colour.lower()} mineral chips — exposed flat roofs; 1 × 10 m roll.", (("ROLL", "Roll (10 m²)"),))
for name, units in (("HDPE Dimpled Drainage Membrane 8 mm (per m²)", M2), ("HDPE Tanking Membrane 1.5 mm (per m²)", M2), ("Self-Adhesive Bitumen Membrane 1.5 mm (per m²)", M2),
                    ("Bentonite Waterproofing Panel 1.2 × 1.2 m", EACH), ("Protection Board 3 mm (Bitumen) 1 × 2 m", (("SHEET", "Sheet"),)),
                    ("Waterproofing Corner Tape 120 mm × 10 m", (("ROLL", "Roll (10 m)"),)), ("Waterproofing Reinforcing Fabric 1 m × 50 m", (("ROLL", "Roll (50 m)"),))):
    P(code("AA-CHM-MEMB", name), name, WPS, "Waterproofing membrane or accessory", f"{name}.", units)

# =============================================================================================================
# Insulation, Fire & Acoustic (CAT-88..90)
# =============================================================================================================
INS = "insulation-fire-acoustic"
THERM = category(
    "thermal-insulation", "Thermal Insulation & Lagging", "CAT-88", INS,
    "Extruded and expanded polystyrene and PIR insulation boards, polyester and glass-wool insulation per m², reflective foil, geyser blankets and pipe lagging from 15 to 54 mm.",
    ["Energy efficiency to SANS 10400-XA", "Roofs, walls and floors", "Geysers, hot-water pipes and cold rooms"],
    "Insulation thickness follows the climate zone and R-value in SANS 10400-XA — we confirm it on the quote. Keep foam boards away from naked flames and sunlight, and wear gloves and a mask with mineral wool.",
)
for kind, std, thicknesses in (("XPS Insulation Board", "Extruded polystyrene (XPS) board, 1.2 × 2.4 m", (25, 30, 40, 50, 60, 80, 100)),
                               ("EPS Insulation Board", "Expanded polystyrene (EPS) board, 1.2 × 2.4 m", (25, 40, 50, 75, 100)),
                               ("PIR Insulation Board (Foil-Faced)", "Polyisocyanurate board, foil-faced, 1.2 × 2.4 m", (30, 50, 80, 100))):
    for t in thicknesses:
        P(code("AA-INS-BOARD", kind, t), f"{kind} {t} mm", THERM, std, f"{kind}, {t} mm, 1.2 × 2.4 m sheet — for roofs, walls and floors.", (("SHEET", "Sheet"),))
for kind, thicknesses in (("Polyester Insulation", (50, 75, 100, 135, 145)), ("Glass-Wool Insulation", (50, 75, 100, 135, 150, 200))):
    for t in thicknesses:
        P(code("AA-INS-M2", kind, t), f"{kind} {t} mm (per m²)", THERM, "SANS 10400-XA thermal insulation", f"{kind}, {t} mm, sold per m² for ceilings and walls.", M2)
for name, units in (("Reflective Foil Insulation (Double-Sided) 1.25 × 40 m", (("ROLL", "Roll (50 m²)"),)), ("Bubble Foil Insulation 1.2 × 40 m", (("ROLL", "Roll (48 m²)"),)),
                    ("Insulation Board Adhesive 750 ml", EACH), ("Insulation Board Fixing Washers (pack of 100)", (("PACK", "Pack (100)"),)), ("Aluminium Foil Tape 50 m", EACH)):
    P(code("AA-INS-FOIL", name), name, THERM, "Insulation accessory", f"{name}.", units)
for litres in (100, 150, 200):
    P(code("AA-INS-GEYSER", litres), f"Geyser Insulation Blanket {litres} L", THERM, "Geyser insulation blanket", f"Insulating blanket for a {litres} L geyser.", EACH)
for dia in (15, 22, 28, 35, 42, 54):
    for wall in (9, 13, 19):
        P(code("AA-INS-LAG", dia, wall), f"Pipe Lagging {dia} mm × {wall} mm Wall, 2 m", THERM, "Closed-cell elastomeric or PE pipe insulation",
          f"Pipe lagging for {dia} mm pipe, {wall} mm wall, in 2 m lengths.", EACH)

FIRE = category(
    "fire-protection", "Fire Extinguishers, Hose Reels & Fire Stopping", "CAT-89", INS,
    "DCP, CO₂, foam and water extinguishers, hose reels and cabinets, fire blankets, photoluminescent fire signs, smoke and heat detectors, intumescent sealants, collars and fire-rated board.",
    ["New buildings and occupancy certificates", "Workplaces, shops and sites", "Fire stopping service penetrations"],
    "Fire installations follow SANS 10400-T and the local fire department: extinguishers and hose reels to SANS 1910 / SANS 543, serviced by an SAQCC-registered company. Fire-rated systems must be installed as tested.",
)
for agent, sizes in (("DCP Fire Extinguisher", ("1.5 kg", "2.5 kg", "4.5 kg", "9 kg")), ("CO₂ Fire Extinguisher", ("2 kg", "5 kg")), ("Foam Fire Extinguisher", ("9 L",)), ("Water Fire Extinguisher", ("9 L",))):
    for size in sizes:
        P(code("AA-FIR-EXT", agent.replace("₂", "2"), size), f"{agent} {size}", FIRE, "SANS 1910 portable fire extinguisher",
          f"{agent} {size}, with wall bracket and service label.", EACH)
for name, std in (("Fire Hose Reel 30 m × 19 mm", "SANS 543 fire hose reel"), ("Fire Hose Reel 30 m × 25 mm", "SANS 543 fire hose reel"), ("Fire Hose Reel Cabinet (Single)", "Hose-reel cabinet"),
                  ("Fire Extinguisher Cabinet (Single)", "Extinguisher cabinet"), ("Fire Extinguisher Stand (Double)", "Extinguisher stand"), ("Fire Blanket 1.2 × 1.2 m", "Fire blanket"),
                  ("Fire Blanket 1.8 × 1.8 m", "Fire blanket"), ("Fire Hydrant Landing Valve 65 mm", "Hydrant valve"), ("Fire Hose 65 mm × 30 m with Couplings", "Lay-flat fire hose"),
                  ("Fire Hose Branch Pipe 65 mm", "Branch pipe"), ("Fire Bucket with Stand", "Fire bucket")):
    P(code("AA-FIR", name), name, FIRE, std, f"{name}.", EACH)
for sign in ("Fire Extinguisher", "Fire Hose Reel", "Emergency Exit (Arrow Left)", "Emergency Exit (Arrow Right)", "Fire Assembly Point", "Break Glass / Fire Alarm", "No Smoking"):
    for size in ("190 × 190 mm", "290 × 290 mm"):
        P(code("AA-FIR-SIGN", sign, size), f"Photoluminescent Sign '{sign}' {size}", FIRE, "SANS 1186 safety sign", f"Photoluminescent safety sign, '{sign}', {size}.", EACH)
for name, std in (("Smoke Detector (Battery, 10-Year)", "Domestic smoke alarm"), ("Smoke Detector (Mains with Battery Backup)", "Mains smoke alarm"), ("Heat Detector (Rate-of-Rise)", "Heat detector"),
                  ("Carbon Monoxide Detector", "CO alarm"), ("Conventional Fire Alarm Panel 4-Zone", "Fire alarm panel"), ("Manual Call Point (Break Glass)", "Call point"),
                  ("Fire Alarm Sounder/Strobe", "Alarm sounder"), ("Intumescent Fire Sealant 310 ml", "Intumescent sealant"), ("Intumescent Fire Collar 50 mm", "Pipe fire collar"),
                  ("Intumescent Fire Collar 110 mm", "Pipe fire collar"), ("Intumescent Fire Collar 160 mm", "Pipe fire collar"), ("Fire-Stopping Batt 50 mm (per m²)", "Coated fire batt"),
                  ("Fire-Rated Expanding Foam 750 ml", "Fire-rated PU foam"), ("Fire-Rated Gypsum Board 15 mm 1.2 × 3.0 m", "Fire-rated gypsum board"),
                  ("Fire Door 30 min (to order)", "Fire door (FD30), to the door schedule"), ("Fire Door 60 min (to order)", "Fire door (FD60), to the door schedule"),
                  ("Door Closer (Fire-Rated)", "Fire-rated door closer")):
    P(code("AA-FIR-DET", name), name, FIRE, std, f"{name}.", M2 if "per m²" in name else EACH)

ACOU = category(
    "acoustic-insulation", "Acoustic Ceilings & Sound Insulation", "CAT-90", INS,
    "Mineral-fibre and glass-wool acoustic ceiling tiles, exposed-grid ceiling systems, acoustic insulation batts, resilient channels, acoustic sealant, mass-loaded vinyl and acoustic panels.",
    ["Offices, schools and clinics", "Studios, churches and halls", "Party walls and flats"],
    "Sound insulation works as a system — gaps and back-boxes let sound through, so seal every joint with acoustic sealant. Keep ceiling tiles flat and dry before installation.",
)
for name in ("Mineral-Fibre Ceiling Tile 600 × 600 mm, Fissured (per m²)", "Mineral-Fibre Ceiling Tile 600 × 600 mm, Smooth (per m²)", "Mineral-Fibre Ceiling Tile 600 × 1,200 mm (per m²)",
             "Glass-Wool Acoustic Tile 600 × 600 mm (per m²)", "Vinyl-Faced Gypsum Ceiling Tile 600 × 600 mm (per m²)", "Exposed-Grid Ceiling System (Main Tee, Cross Tees, Angle) (per m²)"):
    P(code("AA-ACO-TILE", name), name, ACOU, "Suspended acoustic ceiling", f"{name.replace(' (per m²)', '')} — sold per m².", M2)
for name, units in (("Ceiling Main Tee 3.6 m", EACH), ("Ceiling Cross Tee 1.2 m", EACH), ("Ceiling Cross Tee 0.6 m", EACH), ("Ceiling Wall Angle 3 m", EACH),
                    ("Acoustic Insulation Batt 50 mm (per m²)", M2), ("Acoustic Insulation Batt 75 mm (per m²)", M2), ("Acoustic Insulation Batt 100 mm (per m²)", M2),
                    ("Resilient Channel 3.6 m", EACH), ("Acoustic Sealant 600 ml", EACH), ("Mass-Loaded Vinyl 5 kg/m² (per m²)", M2),
                    ("Acoustic Wall Panel (Fabric) 1.2 × 0.6 m", EACH), ("Acoustic Foam Panel 50 mm (pack of 12)", (("PACK", "Pack (12)"),)), ("Acoustic Underlay for Floors 5 mm (per m²)", M2)):
    P(code("AA-ACO", name), name, ACOU, "Acoustic product", f"{name}.", units)

# =============================================================================================================
# Deeper Water Storage & Plumbing (CAT-91..93) and Electrical & Solar (CAT-94..95)
# =============================================================================================================
WATER = "water-plumbing"
PUMP = category(
    "pumps-water-treatment", "Pumps, Boreholes & Water Treatment", "CAT-91", WATER,
    "Borehole and submersible pumps, pressure and booster pumps, transfer pumps, pressure tanks and controllers, solar borehole kits, water filters, UV sterilisers and softeners.",
    ["Boreholes and rainwater tanks", "Household and building water pressure", "Farms, schools and clinics"],
    "Pumps must be wired by a registered electrician and sized for the borehole's yield and the head — send the borehole test or tank layout with the quote. Borehole water should be tested before drinking.",
)
for kw in ("0.37", "0.55", "0.75", "1.1", "1.5", "2.2", "3.0", "4.0"):
    P(code("AA-PMP-BORE", kw), f"Submersible Borehole Pump {kw} kW (4 in)", PUMP, "Stainless multistage submersible pump",
      f"4-inch stainless submersible borehole pump, {kw} kW — matched to the borehole's yield and depth on the quote.", EACH)
for name in ("Solar Borehole Pump Kit (up to 60 m head)", "Solar Borehole Pump Kit (up to 120 m head)", "Borehole Pump Control Box", "Borehole Drop Cable 4-Core 2.5 mm² (per metre)",
             "Borehole Safety Rope (per metre)", "Borehole Cap", "HDPE Borehole Rising Main 32 mm (per metre)", "HDPE Borehole Rising Main 40 mm (per metre)"):
    P(code("AA-PMP-BOREACC", name), name, PUMP, "Borehole equipment", f"{name}.", LM if "per metre" in name else EACH)
for kind, sizes in (("Pressure Booster Pump", ("0.37 kW", "0.75 kW", "1.1 kW")), ("Booster Pump with Pressure Tank", ("24 L", "50 L", "100 L")), ("Variable-Speed Booster Pump", ("1.1 kW", "1.5 kW")),
                    ("Peripheral Transfer Pump", ("0.37 kW", "0.75 kW")), ("Centrifugal Transfer Pump", ("0.75 kW", "1.5 kW", "2.2 kW")), ("Submersible Drainage Pump", ("0.4 kW", "0.75 kW", "1.1 kW")),
                    ("Sewage Pump (Cutter)", ("1.1 kW", "1.5 kW")), ("Petrol Water Pump", ("2 in", "3 in")), ("Diesel Water Pump", ("3 in", "4 in"))):
    for size in sizes:
        P(code("AA-PMP", kind, size), f"{kind} {size}", PUMP, "Water pump", f"{kind}, {size} — sized to the flow and head on the quote.", EACH)
for name in ("Pressure Tank 24 L", "Pressure Tank 50 L", "Pressure Tank 100 L", "Pressure Switch", "Pump Pressure Controller (Electronic)", "Float Switch (Pump)", "Pump Dry-Run Protector",
             "Water Filter Housing 20 in (Big Blue)", "Sediment Filter Cartridge 20 in", "Carbon Block Filter Cartridge 20 in", "UV Steriliser 12 GPM", "Water Softener (Household)",
             "Rainwater Tank Leaf Filter / First-Flush Diverter", "Reverse Osmosis Under-Sink System", "Inline Water Filter (Whole House, 3-Stage)"):
    P(code("AA-PMP-TRT", name), name, PUMP, "Pump control or water treatment", f"{name}.", EACH)

VALVE = category(
    "valves-meters-hdpe", "Valves, Meters & HDPE Fittings", "CAT-92", WATER,
    "Brass gate, ball and check valves from 15 to 50 mm, pressure-reducing valves, water meters, HDPE compression fittings from 20 to 63 mm, PEX and multilayer pipe and fittings.",
    ["Water reticulation and connections", "Building and complex plumbing", "Farms and irrigation mains"],
    "Pressure-test new lines before backfilling or closing up. Water meters on municipal connections are installed by the municipality; private meters by a registered plumber.",
)
for valve in ("Gate Valve", "Ball Valve (Lever)", "Non-Return (Check) Valve", "Stop Cock"):
    for size in (15, 20, 25, 32, 40, 50):
        P(code("AA-VLV", valve, size), f"Brass {valve} {size} mm", VALVE, "Brass valve for potable water", f"Brass {valve.lower()}, {size} mm.", EACH)
for size in (15, 20, 25):
    P(code("AA-VLV-PRV", size), f"Pressure-Reducing Valve {size} mm", VALVE, "Pressure-reducing valve", f"Adjustable pressure-reducing valve, {size} mm.", EACH)
for size in (15, 20, 25, 40):
    P(code("AA-VLV-METER", size), f"Water Meter {size} mm", VALVE, "SANS 1529 water meter", f"Cold-water meter, {size} mm.", EACH)
for fitting in ("Coupling", "Elbow", "Tee", "Male Adaptor", "Female Adaptor", "End Cap", "Reducer"):
    for size in (20, 25, 32, 40, 50, 63):
        P(code("AA-HDPE", fitting, size), f"HDPE Compression {fitting} {size} mm", VALVE, "Polypropylene compression fitting for SANS ISO 4427 HDPE pipe",
          f"Compression {fitting.lower()} for {size} mm HDPE pipe.", EACH)
for size in (16, 20, 25, 32):
    P(code("AA-PEX-PIPE", size), f"PEX-AL-PEX Multilayer Pipe {size} mm (per metre)", VALVE, "PEX-AL-PEX multilayer pipe", f"Multilayer hot- and cold-water pipe, {size} mm, per metre.", LM)
    for fitting in ("Coupling", "Elbow", "Tee", "Male Adaptor"):
        P(code("AA-PEX", fitting, size), f"Multilayer Press {fitting} {size} mm", VALVE, "Press fitting for PEX-AL-PEX pipe", f"Press {fitting.lower()} for {size} mm multilayer pipe.", EACH)

HOT = category(
    "heat-pumps-hot-water", "Heat Pumps & Hot-Water Systems", "CAT-93", WATER,
    "Domestic and commercial heat pumps, retrofit heat-pump kits, gas water heaters, geyser drip trays, valves and safety sets, geyser timers and solar geyser parts.",
    ["Cutting geyser electricity costs", "Guest houses, schools and hostels", "Geyser replacements to SANS 10254"],
    "Geysers and heat pumps are installed to SANS 10254 by a registered plumber, who issues a plumbing certificate of compliance; electrical connections by a registered electrician. Gas installations need a registered LP gas installer.",
)
for size in ("3.5 kW", "5 kW", "7 kW", "9 kW", "13 kW", "18 kW", "25 kW"):
    P(code("AA-HOT-HP", size), f"Heat Pump Water Heater {size}", HOT, "Air-source heat pump water heater", f"Air-source heat pump, {size} output, for retrofitting to a geyser or a dedicated tank.", EACH)
for name in ("Heat Pump Retrofit Installation Kit", "Integrated Heat Pump Geyser 150 L", "Integrated Heat Pump Geyser 200 L", "Gas Water Heater 12 L/min", "Gas Water Heater 16 L/min",
             "Gas Water Heater 20 L/min", "Geyser Drip Tray 150 L", "Geyser Drip Tray 200 L", "Geyser Safety Valve Kit (Pressure Control + Vacuum Breakers)",
             "Geyser Pressure Control Valve 400 kPa", "Geyser Thermostat (Combination)", "Geyser Element 2 kW (Low-Wattage)", "Geyser Element 5 kW", "Geyser Smart Controller (Wi-Fi)",
             "Solar Geyser Evacuated Tube (each)", "Solar Geyser Controller", "Geyser Overflow Pipe Kit"):
    P(code("AA-HOT", name), name, HOT, "Hot-water component to SANS 10254", f"{name}.", EACH)

ELEC = "electrical"
LIGHT = category(
    "commercial-lighting", "Commercial & Industrial Lighting", "CAT-94", ELEC,
    "LED downlights and panels, battens and vapour-proof fittings, high-bays, floodlights, street and area lights, emergency lighting and exit signs, sensors and photocells.",
    ["Warehouses, factories and workshops", "Offices, schools and retail", "Parking, yards and security"],
    "Lighting is installed by a registered electrician under SANS 10142-1; emergency lighting to SANS 10114-2 where required. Light levels follow SANS 10114-1 for the activity — we can confirm fittings from a layout.",
)
for watts in (7, 9, 12, 15, 18):
    P(code("AA-LGT-DOWN", watts), f"LED Downlight {watts} W (Recessed)", LIGHT, "LED luminaire", f"Recessed LED downlight, {watts} W; cut-out and colour temperature confirmed on the quote.", (("EACH", "Each"), ("PACK", "Pack (10)")))
for size, watts in (("600 × 600 mm", 36), ("600 × 600 mm", 48), ("300 × 1,200 mm", 36), ("600 × 1,200 mm", 72)):
    P(code("AA-LGT-PANEL", size, watts), f"LED Panel {size}, {watts} W", LIGHT, "LED luminaire", f"LED panel for ceilings and grid ceilings, {size}, {watts} W.", EACH)
for length, watts in (("600 mm", 18), ("1,200 mm", 36), ("1,500 mm", 45)):
    for kind in ("LED Batten", "Vapour-Proof LED Fitting (IP65)"):
        P(code("AA-LGT", kind, length), f"{kind} {length}, {watts} W", LIGHT, "LED luminaire", f"{kind}, {length}, {watts} W.", EACH)
for watts in (100, 150, 200, 240):
    P(code("AA-LGT-HIGHBAY", watts), f"LED High-Bay {watts} W (UFO)", LIGHT, "LED high-bay luminaire, IP65", f"LED high-bay, {watts} W, for warehouses and workshops.", EACH)
for watts in (30, 150, 200, 300, 400):
    P(code("AA-LGT-FLOOD", watts), f"LED Floodlight {watts} W (IP65)", LIGHT, "LED floodlight, IP65", f"LED floodlight, {watts} W, for yards and security.", EACH)
for watts in (60, 100, 150):
    P(code("AA-LGT-STREET", watts), f"LED Street Light {watts} W", LIGHT, "LED road lighting luminaire", f"LED street and area light, {watts} W, for estates and parking.", EACH)
for name in ("Street Light Pole 6 m (Galvanised)", "Street Light Pole 8 m (Galvanised)", "Solar Street Light (All-in-One) 60 W", "Emergency Light (Twin Spot, 3 h)",
             "Emergency LED Bulkhead (3 h)", "Exit Sign (Maintained LED)", "Emergency Conversion Kit for LED Fittings", "PIR Motion Sensor (Ceiling)", "Microwave Motion Sensor",
             "Day/Night Photocell", "LED Strip 24 V, 5 m (Indoor)", "LED Strip Driver 24 V 100 W", "Track Light Spot (LED)", "Track Light Rail 2 m"):
    P(code("AA-LGT", name), name, LIGHT, "Lighting product", f"{name}.", EACH)

POWER = category(
    "generators-ups-power", "Generators, UPS & Power Protection", "CAT-95", ELEC,
    "Petrol, diesel and inverter generators from 2.5 to 100 kVA, automatic transfer switches, UPS units, voltage regulators, prepaid electricity meters, contactors and cable glands and lugs.",
    ["Backup power for homes and businesses", "Sites without grid power", "Sub-metering in complexes and rentals"],
    "Generators connected to a building's wiring need a changeover or transfer switch installed by a registered electrician, so the generator can never back-feed the grid. Run generators outdoors only.",
)
for size, fuel in (("2.5 kVA", "Petrol"), ("3.5 kVA", "Inverter Petrol"), ("5 kVA", "Petrol"), ("6.5 kVA", "Petrol"), ("8 kVA", "Petrol"), ("10 kVA", "Diesel"), ("15 kVA", "Diesel (Silent)"),
                   ("20 kVA", "Diesel (Silent)"), ("30 kVA", "Diesel (Silent)"), ("40 kVA", "Diesel (Silent)"), ("60 kVA", "Diesel (Silent)"), ("100 kVA", "Diesel (Silent)")):
    P(code("AA-PWR-GEN", size, fuel), f"{fuel} Generator {size}", POWER, "Generator set", f"{fuel} generator, {size} — single- or three-phase confirmed on the quote; sale, or hire through plant hire.", EACH)
for name in ("Automatic Transfer Switch 63 A", "Automatic Transfer Switch 100 A (3-Phase)", "Manual Changeover Switch 63 A", "Generator Inlet Plug & Socket 32 A",
             "Line-Interactive UPS 1 kVA", "Line-Interactive UPS 2 kVA", "Online UPS 3 kVA", "Online UPS 6 kVA", "Online UPS 10 kVA", "Automatic Voltage Regulator 5 kVA",
             "Prepaid Electricity Meter (Single-Phase, Split)", "Prepaid Electricity Meter (Three-Phase)", "Sub-Meter (Kilowatt-Hour, DIN-Rail)", "Contactor 25 A (DIN-Rail)",
             "Contactor 40 A (3-Pole)", "Motor Starter (DOL) 4 kW", "Cable Gland 20 mm (pack of 10)", "Cable Gland 25 mm (pack of 10)", "Cable Lugs Assorted Kit",
             "Lightning Conductor Air Terminal", "Lightning Down-Conductor Tape 25 × 3 mm (per metre)", "Surge Arrester Type 1+2 (Main Board)"):
    units = PACK10 if "pack of 10" in name else (LM if "per metre" in name else EACH)
    P(code("AA-PWR", name), name, POWER, "Power product", f"{name}.", units)
