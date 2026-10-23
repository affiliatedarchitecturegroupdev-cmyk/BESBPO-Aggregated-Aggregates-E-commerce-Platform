"""Wave D (ROADMAP 2.5): sector ranges — Prefab Buildings & Structures, Agricultural & Farm, Mining & Industrial."""
from .common import EACH, KG, LM, M2, P, category, code, fmt

PACK10 = (("PACK", "Pack (10)"),)

# =============================================================================================================
# Prefab Buildings & Structures (CAT-116..118)
# =============================================================================================================
PREFAB = "prefab-structures"
PREFAB_HANDLING = (
    "Prefab buildings are delivered and erected by the supplier on a level, prepared base (slab or plinths) — the quote confirms the base, "
    "access for delivery and what's included. Buildings beyond the National Building Regulations' exemptions need municipal approval."
)
WENDY = category(
    "wendy-houses-sheds", "Wendy Houses, Sheds & Steel Carports", "CAT-116", PREFAB,
    "Timber Wendy houses from 2 × 2 to 6 × 6 m in log-lap, shiplap and nutec, steel garden and storage sheds, steel carports and garages — supplied and erected.",
    ["Garden storage and workshops", "Backyard rooms, offices and staff quarters", "Covered parking"],
    PREFAB_HANDLING,
)
for size in ("2 × 2 m", "3 × 2 m", "3 × 3 m", "4 × 3 m", "5 × 3 m", "6 × 3 m", "6 × 4 m", "6 × 6 m"):
    for clad in ("Log-Lap Pine", "Shiplap Pine", "Nutec (Fibre-Cement)"):
        P(code("AA-PFB-WENDY", size, clad), f"Wendy House {size}, {clad}", WENDY, "Prefabricated timber-frame building",
          f"Wendy house, {size}, {clad.lower()} cladding, with door, window and roof sheeting — floor, extra windows and erection confirmed on the quote.", EACH)
for size in ("1.5 × 1.5 m", "2 × 1.5 m", "2.5 × 2 m", "3 × 2.5 m", "3 × 3 m", "4 × 3 m"):
    P(code("AA-PFB-SHED", size), f"Steel Garden Shed {size}", WENDY, "Galvanised or colour-coated steel shed", f"Steel garden and storage shed, {size}, flat-packed with sliding or hinged doors.", EACH)
for kind in ("Single", "Double", "Triple"):
    for roof in ("Flat (IBR)", "Pitched (IBR)", "Cantilever (IBR)"):
        P(code("AA-PFB-CARPORT", kind, roof), f"Steel Carport, {kind}, {roof}", WENDY, "Steel carport to SANS 10162", f"{kind} steel carport, {roof.lower()} roof, supplied and erected.", EACH)
for size in ("Single Garage 3 × 6 m", "Double Garage 6 × 6 m", "Steel Workshop 6 × 9 m", "Steel Workshop 9 × 12 m"):
    P(code("AA-PFB-GARAGE", size), f"Prefabricated Steel {size}", WENDY, "Steel portal frame building", f"Prefabricated steel {size.lower()} with IBR cladding and a roll-up door, to the supplier's design.", EACH)

LSF = category(
    "light-steel-frame", "Light Steel Frame Building Systems", "CAT-117", PREFAB,
    "Light-gauge steel studs, tracks and noggins in 89 and 140 mm, LSF roof trusses, building wrap, OSB and fibre-cement sheathing, fixings, and LSF building kits quoted per m².",
    ["Houses, extensions and second storeys", "Schools, clinics and offices", "Fast-track developments"],
    "Light steel frame buildings are designed by an engineer to SANS 517 and erected by an accredited contractor; the NHBRC requires LSF homes to be enrolled like any other.",
)
for web in (89, 140):
    for gauge in ("0.8 mm", "1.0 mm", "1.2 mm"):
        for kind in ("LSF Stud (Lipped C)", "LSF Track (Unlipped U)"):
            P(code("AA-LSF", kind, web, gauge), f"{kind} {web} mm × {gauge} (per metre)", LSF, "SANS 517 light steel frame, Z275 galvanised",
              f"{kind}, {web} mm web, {gauge} galvanised steel — rolled to length from the frame design, sold per metre.", LM)
for name, units in (("LSF Roof Truss (to design, per m² of roof)", M2), ("LSF Wall Panel (Pre-Assembled, per m²)", M2), ("LSF House Kit (to design, per m² of floor)", M2),
                    ("LSF Top-Hat Batten 0.55 mm (per metre)", LM), ("Breathable Building Wrap 1.5 × 50 m", (("ROLL", "Roll (75 m²)"),)), ("OSB Sheathing 9 mm 1.22 × 2.44 m", (("SHEET", "Sheet"),)),
                    ("Fibre-Cement Weatherboard 9 mm 1.2 × 3.0 m", (("SHEET", "Sheet"),)), ("Fibre-Cement Plank Cladding 8 × 200 mm × 3.6 m", EACH), ("LSF Wafer-Head Screws (box of 1,000)", (("PACK", "Box (1,000)"),)),
                    ("LSF Hex-Head Screws (box of 1,000)", (("PACK", "Box (1,000)"),)), ("LSF Hold-Down Bracket", EACH), ("LSF Strap Bracing 30 × 1.0 mm (per metre)", LM), ("Thermal Break Tape 50 mm × 30 m", EACH)):
    P(code("AA-LSF-ACC", name), name, LSF, "Light steel frame component", f"{name}.", units)

MOD = category(
    "modular-buildings", "Modular & Container Buildings", "CAT-118", PREFAB,
    "Modular classrooms, clinics, offices and ablution blocks, container conversions, panel-built site camps and park homes — designed, delivered and installed to order.",
    ["Schools and clinics", "Mines, construction camps and remote sites", "Offices, guard houses and kiosks"],
    PREFAB_HANDLING,
)
for name in ("Modular Classroom 6 × 9 m", "Modular Classroom 6 × 12 m", "Modular Clinic Unit 6 × 12 m", "Modular Office 3 × 6 m", "Modular Office 6 × 12 m", "Modular Ablution Block (Male/Female)",
             "Modular Accommodation Unit (2 Rooms)", "Container Conversion: Office 6 m", "Container Conversion: Spaza / Kiosk 6 m", "Container Conversion: Coffee Shop 6 m", "Container Conversion: Ablution 6 m",
             "Container Conversion: Accommodation 12 m", "Panel-Built Site Camp (per m²)", "Park Home 36 m²", "Park Home 54 m²", "Guard House (Brick-Look, Prefab)", "Prefab Toilet Block (Single)", "Prefab Generator Room"):
    P(code("AA-PFB-MOD", name), name, MOD, "Prefabricated modular building", f"{name}, designed and installed to order — finishes and services confirmed on the quote.", M2 if "per m²" in name else EACH)

# =============================================================================================================
# Agricultural & Farm (CAT-119..121)
# =============================================================================================================
AGRI = "agricultural-farm"
FARMF = category(
    "farm-fencing-gates", "Farm Fencing, Gates & Cattle Grids", "CAT-119", AGRI,
    "Galvanised farm gates from 2.4 to 6 m, game and stock fencing, Bonnox-type field fence, high-tensile and smooth wire, strainer and corner posts, staples, droppers, cattle grids and wire tools.",
    ["Livestock and game farms", "Smallholdings and lodges", "Fencing along roads and boundaries"],
    "Fence lines are strained from braced strainer and corner posts; check boundary positions before fencing. Electric fencing on farms follows SANS 60335-2-76 for the energiser.",
)
for height in (1.2, 1.5, 1.8):
    for width in (2.4, 3.0, 3.6, 4.2, 4.8, 6.0):
        P(code("AA-AGR-GATE", fmt(height), fmt(width)), f"Galvanised Farm Gate {fmt(height)} × {fmt(width)} m", FARMF, "Hot-dip galvanised tubular farm gate",
          f"Tubular galvanised farm gate, {fmt(height)} m high, {fmt(width)} m wide, with hinges and latch.", EACH)
for height in (0.9, 1.2, 1.5, 1.8, 2.4):
    for kind in ("Field Fence (Knotted, Hinge-Joint)", "Game Fence (Knotted)"):
        if kind.startswith("Game") and height < 1.8:
            continue
        P(code("AA-AGR-FIELD", kind, fmt(height)), f"{kind} {fmt(height)} m × 50 m", FARMF, "Galvanised knotted wire fence", f"{kind}, {fmt(height)} m high, 50 m roll — line-wire spacing confirmed on the quote.", (("ROLL", "Roll (50 m)"),))
for wire, sizes in (("High-Tensile Smooth Wire", ("2.24 mm", "2.5 mm", "2.8 mm")), ("Mild-Steel Smooth Wire", ("2.5 mm", "3.15 mm", "4 mm")), ("Barbed Wire (High-Tensile)", ("1.7 mm",))):
    for size in sizes:
        P(code("AA-AGR-WIRE", wire, size), f"{wire} {size}, 50 kg Coil", FARMF, "SANS 675 galvanised fencing wire", f"{wire}, {size}, sold by the 50 kg coil.", (("ROLL", "Coil (50 kg)"),))
for name, units in (("Fencing Staples 40 mm (by the kg)", KG), ("Steel Strainer Post 2.4 m (Angle)", EACH), ("Steel Corner Post with Stays 2.4 m", EACH), ("Steel Dropper 1.2 m", (("EACH", "Each"), ("BUNDLE", "Bundle (confirmed on quote)"))),
                    ("Wire Strainer (Monkey Strainer)", EACH), ("Wire Tensioner / Ratchet (pack of 10)", PACK10), ("Gripple Wire Joiner (pack of 20)", (("PACK", "Pack (20)"),)), ("Fence Pliers", EACH),
                    ("Wire Spinner (Jenny)", EACH), ("Cattle Grid 3.6 × 2.4 m (Steel)", EACH), ("Cattle Grid 4.8 × 2.4 m (Steel)", EACH), ("Cattle Grid Precast Bases (Set)", EACH),
                    ("Livestock Crush Pen (Steel)", EACH), ("Sheep/Goat Handling Panel 2.4 m", EACH), ("Cattle Handling Panel 3 m", EACH), ("Farm Electric Fence Energiser (Solar) 4 J", EACH),
                    ("Farm Electric Fence Energiser (Mains) 12 J", EACH), ("Polywire / Polytape Electric Fence 200 m", EACH), ("Electric Fence Tread-In Posts (pack of 10)", PACK10)):
    P(code("AA-AGR-FEN", name), name, FARMF, "Farm fencing product", f"{name}.", units)

WATERF = category(
    "livestock-water-dams", "Troughs, Dam Liners & Farm Water", "CAT-120", AGRI,
    "Plastic and concrete drinking troughs, ball and float valves, HDPE dam liners per m², farm water tanks, reservoir tanks, windpump parts and stock-water pipe.",
    ["Livestock water points", "Farm dams and reservoirs", "Irrigation storage"],
    "Dam liners are welded and installed by a specialist on a prepared, stone-free base. Check water-use authorisation for new dams with the Department of Water and Sanitation.",
)
for size in ("200 L", "500 L", "1,000 L", "2,500 L"):
    for mat in ("Plastic", "Concrete"):
        P(code("AA-AGR-TROUGH", size, mat), f"{mat} Drinking Trough {size}", WATERF, "Livestock water trough", f"{mat} livestock drinking trough, {size}.", EACH)
for name in ("Trough Float Valve 20 mm", "Trough Float Valve 25 mm (High-Flow)", "Ball Valve Protection Box", "Poultry Drinker (Automatic)", "Pig Nipple Drinker (pack of 10)"):
    P(code("AA-AGR-VALVE", name), name, WATERF, "Stock-water fitting", f"{name}.", PACK10 if "pack of 10" in name else EACH)
for thickness in ("0.5 mm", "0.75 mm", "1.0 mm", "1.5 mm", "2.0 mm"):
    P(code("AA-AGR-LINER", thickness), f"HDPE Dam Liner {thickness} (per m², Welded)", WATERF, "HDPE geomembrane (GRI-GM13)", f"HDPE dam liner, {thickness}, supplied and welded — sold per m².", M2)
for name, units in (("PVC Dam Liner 0.5 mm (per m²)", M2), ("Dam Liner Protection Geotextile (per m²)", M2), ("Corrugated Steel Reservoir Tank 50,000 L (Lined)", EACH), ("Corrugated Steel Reservoir Tank 100,000 L (Lined)", EACH),
                    ("Corrugated Steel Reservoir Tank 200,000 L (Lined)", EACH), ("Farm Water Tank 5,000 L", EACH), ("Farm Water Tank 10,000 L", EACH), ("Farm Water Tank 20,000 L", EACH),
                    ("Windpump Pump Cylinder 2½ in", EACH), ("Windpump Leathers Set", EACH), ("Stock-Water HDPE Pipe 32 mm × 100 m", (("ROLL", "Roll (100 m)"),)), ("Stock-Water HDPE Pipe 40 mm × 100 m", (("ROLL", "Roll (100 m)"),))):
    P(code("AA-AGR-WTR", name), name, WATERF, "Farm water product", f"{name}.", units)

TUNNEL = category(
    "shade-net-tunnels", "Shade Net, Tunnels & Crop Protection", "CAT-121", AGRI,
    "Agricultural shade net from 20 to 80%, hail and bird net, greenhouse film, tunnel kits, poly-tunnel hoops and fittings, ground cover and mulch film.",
    ["Vegetable and nursery tunnels", "Orchards and vineyards", "Livestock shade and kraals"],
    "Tension nets on a frame designed for wind load, and replace greenhouse film at the end of its UV life (typically 3–4 seasons).",
)
for density in (20, 30, 40, 55, 70, 80):
    for width in (3, 6):
        P(code("AA-AGR-SHADE", density, width), f"Agricultural Shade Net {density}%, {width} m Wide", TUNNEL, "UV-stabilised HDPE knitted shade net",
          f"Knitted shade net, {density}% shade, {width} m wide — sold per metre or by the 50 m roll; colour confirmed on the quote.", LM + (("ROLL", "Roll (50 m)"),))
for name, units in (("Hail Net (per m²)", M2), ("Bird Net (per m²)", M2), ("Insect Net 50-Mesh (per m²)", M2), ("Greenhouse Film 150 µm UV (per m²)", M2), ("Greenhouse Film 200 µm UV (per m²)", M2),
                    ("Ground Cover (Woven) 1 m × 100 m", (("ROLL", "Roll (100 m)"),)), ("Ground Cover (Woven) 2 m × 100 m", (("ROLL", "Roll (100 m)"),)), ("Silver/Black Mulch Film 1.2 × 400 m", EACH),
                    ("Tunnel Kit 8 × 30 m (Steel Hoops, Film, Fittings)", EACH), ("Tunnel Kit 10 × 30 m", EACH), ("Tunnel Hoop 8 m (Galvanised)", EACH), ("Shade-Net House Kit 10 × 20 m", EACH),
                    ("Net Clips (pack of 100)", (("PACK", "Pack (100)"),)), ("Wiggle Wire & Lock Channel 2 m", EACH), ("Hand Seeder", EACH), ("Seedling Trays 200-Cavity (pack of 10)", PACK10)):
    P(code("AA-AGR-TUN", name), name, TUNNEL, "Crop protection product", f"{name}.", units)

# =============================================================================================================
# Mining & Industrial (CAT-122..124)
# =============================================================================================================
MINE = "mining-industrial"
MINE_HANDLING = "Mining and industrial products are supplied to the buyer's specification and the Mine Health and Safety Act's requirements; send the specification, drawing or tender reference with the quote."
GRATE = category(
    "steel-grating-treads", "Steel Grating, Stair Treads & Walkways", "CAT-122", MINE,
    "Galvanised serrated and plain steel floor grating, stair treads, walkway panels, expanded-metal and perforated sheet, handrail standards and kick plates — cut and banded to size.",
    ["Plant floors, walkways and platforms", "Stairs and access ladders", "Drain covers and trench grating"],
    MINE_HANDLING + " Grating is clipped or welded down as the design requires.",
)
for bar in ("25 × 3 mm", "25 × 5 mm", "32 × 5 mm", "40 × 5 mm"):
    for kind in ("Plain", "Serrated"):
        P(code("AA-MIN-GRATE", bar, kind), f"Galvanised Steel Floor Grating {bar} Bearing Bar, {kind} (per m²)", GRATE, "Hot-dip galvanised pressure-locked or welded grating",
          f"Steel floor grating, {bar} bearing bars, {kind.lower()}, galvanised — cut and banded to the panel sizes on the drawing, per m².", M2)
for width in (600, 750, 900, 1000):
    P(code("AA-MIN-TREAD", width), f"Galvanised Grating Stair Tread {width} mm", GRATE, "Galvanised grating stair tread with nosing", f"Grating stair tread, {width} mm wide, with anti-slip nosing and end plates.", EACH)
for name, units in (("Expanded Metal Sheet (Heavy) 2.5 × 1.25 m", (("SHEET", "Sheet"),)), ("Perforated Steel Sheet 1.5 mm 2.5 × 1.25 m", (("SHEET", "Sheet"),)), ("Grating Fixing Clips (pack of 10)", PACK10),
                    ("Handrail Standard (Galvanised, 2-Rail)", EACH), ("Kick Plate 100 × 6 mm (per metre)", LM), ("Galvanised Trench Grating 300 mm (per metre)", LM), ("Galvanised Trench Grating 450 mm (per metre)", LM),
                    ("FRP (Fibreglass) Grating 38 mm (per m²)", M2), ("Galvanised Cat Ladder with Cage (per metre)", LM), ("Aluminium Chequer Plate 3 mm 2.5 × 1.25 m", (("SHEET", "Sheet"),))):
    P(code("AA-MIN-GRT", name), name, GRATE, "Industrial access product", f"{name}.", units)

MCON = category(
    "mining-consumables", "Mining Consumables & Underground Support", "CAT-123", MINE,
    "Shotcrete and gunite mixes, roof-bolting mesh, rock bolts and resin capsules, roof-support packs, brattice cloth, ventilation ducting, underground signage and mining PPE.",
    ["Underground support", "Mine ventilation", "Shafts, tunnels and declines"],
    MINE_HANDLING,
)
for name, units in (("Shotcrete Dry Mix 25 kg", EACH), ("Shotcrete Dry Mix 1 t Bulk Bag", EACH), ("Fibre-Reinforced Shotcrete Mix 25 kg", EACH), ("Shotcrete Accelerator (Alkali-Free) 1,000 L IBC", EACH),
                    ("Steel Fibres for Shotcrete 20 kg", EACH), ("Macro Synthetic Fibres 5 kg", EACH), ("Weld Mesh for Roof Bolting 5.6 mm, 100 × 100 (per sheet)", (("SHEET", "Sheet"),)),
                    ("Diamond Mesh for Roof Support (Galvanised) (per m²)", M2), ("Rock Bolt (Rebar) 20 mm × 1.8 m with Plate & Nut", EACH), ("Rock Bolt (Rebar) 20 mm × 2.4 m with Plate & Nut", EACH),
                    ("Split-Set Friction Bolt 39 mm × 1.8 m", EACH), ("Resin Capsule (Fast) 25 × 500 mm (box)", (("PACK", "Box (confirmed on quote)"),)), ("Resin Capsule (Slow) 25 × 500 mm (box)", (("PACK", "Box (confirmed on quote)"),)),
                    ("Cable Anchor 15.2 mm (per metre)", LM), ("Grout Pack (Pre-Stressing Pack Bag)", EACH), ("Brattice Cloth (Fire-Resistant) (per m²)", M2), ("Flexible Ventilation Duct 600 mm × 20 m", EACH),
                    ("Flexible Ventilation Duct 760 mm × 20 m", EACH), ("Flexible Ventilation Duct 1,000 mm × 20 m", EACH), ("Ventilation Duct Coupling 600 mm", EACH), ("Underground Reflective Sign (Mine)", EACH),
                    ("Mining Cap Lamp (LED, Rechargeable)", EACH), ("Self-Rescuer (Mining)", EACH), ("Mining Hard Hat with Lamp Bracket", EACH), ("Reflective Mining Overall (Two-Piece)", EACH),
                    ("Mining Gumboots (Steel Toe)", EACH), ("Conveyor Belt Fastener Kit", EACH), ("Conveyor Idler Roller 127 mm", EACH)):
    P(code("AA-MIN-CON", name), name, MCON, "Mining consumable, to the mine's specification", f"{name}.", units)

INDF = category(
    "industrial-flooring-linings", "Industrial Flooring, Linings & Wear Protection", "CAT-124", MINE,
    "Heavy-duty epoxy and polyurethane-cement floors, chemical-resistant linings, acid-resistant bricks and mortars, wear-resistant ceramic and rubber linings, bund coatings and anti-slip treatments.",
    ["Factories, food plants and warehouses", "Chemical bunds, tanks and sumps", "Chutes, hoppers and conveyors"],
    MINE_HANDLING + " Floors and linings are installed by a specialist applicator for the system guarantee.",
)
for name in ("Polyurethane-Cement Screed 9 mm (Food Grade) (per m², installed)", "Heavy-Duty Epoxy Mortar Floor 6 mm (per m², installed)", "Epoxy Coating System (Warehouse, 2 Coats) (per m², installed)",
             "Anti-Static Epoxy Floor (per m², installed)", "Chemical-Resistant Bund Lining (Vinylester) (per m², installed)", "Acid-Resistant Tile Lining (per m², installed)",
             "Wear-Resistant Ceramic Lining (Alumina) (per m², installed)", "Rubber Wear Lining 10 mm (per m², installed)", "Polyurea Spray Coating (per m², installed)", "Floor Line Marking (Epoxy, per metre)"):
    P(code("AA-MIN-FLR", name), name, INDF, "Industrial floor or lining system", f"{name.split(' (per')[0]} — specified, supplied and installed, quoted from the area and condition.", LM if "per metre" in name else M2)
for name, units in (("Acid-Resistant Brick 230 × 114 × 38 mm", EACH), ("Acid-Resistant Mortar (Furan) 25 kg Kit", EACH), ("Chemical-Resistant Epoxy Grout 10 kg", EACH),
                    ("Rubber Lining Sheet 6 mm 1.2 × 10 m", (("ROLL", "Roll (12 m²)"),)), ("Ceramic Wear Tile 150 × 100 × 12 mm (box of 25)", (("PACK", "Box (25)"),)), ("Wear-Resistant Plate (Bisalloy-Type) 8 mm (per m²)", M2),
                    ("UHMWPE Liner Sheet 10 mm (per m²)", M2), ("Industrial Anti-Slip Tape 50 mm × 18 m", EACH), ("Rack Protector (Upright Guard)", EACH), ("Steel Safety Barrier (Warehouse) 2 m", EACH),
                    ("Column Guard (Steel)", EACH), ("Spill Kit 240 L (Chemical)", EACH), ("Drum Bund Pallet (4 Drums)", EACH), ("Dock Leveller (to order)", EACH), ("Dock Bumper 450 mm", EACH)):
    P(code("AA-MIN-IND", name), name, INDF, "Industrial product", f"{name}.", units)
