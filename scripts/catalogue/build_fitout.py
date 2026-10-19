"""Services & fit-out: five more building-supplies departments (CAT-43..56, docs/pricing/FITOUT_CATALOGUE.md).

    python3 scripts/catalogue/build_fitout.py && python3 scripts/public-catalogues.py

The range stopped at the shell of the building: nothing for the electrician, the tiler, the plumber's fit-out,
the joiner's ironmongery or the shuttering. This adds them to the building-supplies line (pricing family
SUPPLIES) in services/pricing/data/supplies_catalogue.json:

  Electrical & Solar        CAT-43 Cable, Conduit & Wiring · CAT-44 Distribution Boards & Protection
                            CAT-45 Switches, Sockets & Lighting · CAT-46 Solar & Backup Power
  Tiles & Flooring          CAT-47 Floor & Wall Tiles · CAT-48 Laminate, Vinyl & Skirting · CAT-49 Tile Trims & Tiling Accessories
  Bathroom & Kitchen        CAT-50 Toilets, Basins, Baths & Showers · CAT-51 Taps, Mixers & Valves · CAT-52 Kitchen Sinks, Traps & Waste
  Hardware & Fasteners      CAT-53 Nails, Screws, Bolts & Anchors · CAT-54 Locks, Hinges & Door Hardware
  Boards & Formwork         CAT-55 Shutterboard, Plywood & Boards · CAT-56 Formwork, Props & Scaffolding

Every product is a type and size South African builders' merchants stock (Builders product search, checked
2026-10-19) and every unit is quote-only: generic and unbranded, with make, finish, price and availability
confirmed with the supplier. Prices follow PRICING_POLICY.md (two SA retailers, list = lowest x 1.08) as
benchmarks are gathered. Tile adhesives and grouts are already in Mortars, Grouts & Admixtures; drywall screws
in Ceilings; roofing screws and timber connectors in Roofing — the new departments link to them.

Re-running is safe: categories and products this script owns are replaced.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / "services/pricing/data/supplies_catalogue.json"
OWNED = "fitout-2026-10"
QUOTED = "Quote-only — no retail benchmark"
SOURCE = (
    "Services & fit-out range: a type and size South African builders' merchants stock (Builders product search, "
    "checked 2026-10-19). Make, finish, price and availability are confirmed with the supplier on the quote."
)

CATEGORIES = [
    ("electrical-cable-conduit", "Cable, Conduit & Wiring", "CAT-43"),
    ("electrical-distribution", "Distribution Boards & Protection", "CAT-44"),
    ("switches-sockets-lighting", "Switches, Sockets & Lighting", "CAT-45"),
    ("solar-backup-power", "Solar & Backup Power", "CAT-46"),
    ("floor-wall-tiles", "Floor & Wall Tiles", "CAT-47"),
    ("flooring-skirting", "Laminate, Vinyl & Skirting", "CAT-48"),
    ("tiling-accessories", "Tile Trims & Tiling Accessories", "CAT-49"),
    ("sanitaryware", "Toilets, Basins, Baths & Showers", "CAT-50"),
    ("taps-mixers-valves", "Taps, Mixers & Valves", "CAT-51"),
    ("kitchen-sinks-waste", "Kitchen Sinks, Traps & Waste", "CAT-52"),
    ("fasteners-fixings", "Nails, Screws, Bolts & Anchors", "CAT-53"),
    ("locks-ironmongery", "Locks, Hinges & Door Hardware", "CAT-54"),
    ("boards-sheets", "Shutterboard, Plywood & Boards", "CAT-55"),
    ("formwork-scaffolding", "Formwork, Props & Scaffolding", "CAT-56"),
]

USES = {
    "electrical-cable-conduit": ["New house and extension wiring", "Rewiring and additional circuits", "Outbuildings, gates and garden lighting"],
    "electrical-distribution": ["New distribution boards", "Additional circuits and upgrades", "Earth leakage and surge protection to code"],
    "switches-sockets-lighting": ["New builds and renovations", "Kitchens, bathrooms and living areas", "Security and garden lighting"],
    "solar-backup-power": ["Backup power through load-shedding", "Grid-tied and hybrid solar", "Off-grid sites and outbuildings"],
    "floor-wall-tiles": ["Living areas, kitchens and bathrooms", "Splashbacks and shower walls", "Patios and covered stoeps"],
    "flooring-skirting": ["Bedrooms and living areas", "Renovations over existing floors", "Rental units and offices"],
    "tiling-accessories": ["Edges, steps and floor transitions", "Even joints and flat floors", "Bathroom and kitchen tiling"],
    "sanitaryware": ["New bathrooms and en-suites", "Bathroom renovations", "Staff and site ablutions"],
    "taps-mixers-valves": ["Bathrooms and kitchens", "Geyser and toilet connections", "Outside taps and garden supply"],
    "kitchen-sinks-waste": ["New kitchens and sculleries", "Laundry and utility rooms", "Replacing traps and waste"],
    "fasteners-fixings": ["Carpentry, shuttering and roofing", "Fixing to brick, block and concrete", "Steelwork and general site work"],
    "locks-ironmongery": ["Hanging new doors", "Security and outbuildings", "Cupboards and built-ins"],
    "boards-sheets": ["Concrete shuttering and formwork", "Floors, cladding and hoarding", "Cupboards, shelving and joinery"],
    "formwork-scaffolding": ["Suspended slabs and beams", "Columns and walls", "Working at height on site"],
}

HANDLING = {
    "electrical": "Electrical installation work must be done by a registered electrician, who issues a Certificate of Compliance (SANS 10142-1). Store cable and fittings dry and indoors.",
    "solar": "Solar, inverter and battery installations must be done by a registered installer, with the electrical Certificate of Compliance; grid-tied systems must also be registered with the municipality or Eskom. Store batteries upright, dry and cool.",
    "tiles": "Store boxes flat and dry, and buy every box for one area from the same batch (shade and calibre are printed on the box) — order about 10% extra for cuts and breakage.",
    "flooring": "Leave flooring packs flat in the room for 48 hours to acclimatise before laying, on a flat, dry and level floor; leave the expansion gap at walls the maker specifies.",
    "sanitary": "Check sanitaryware for chips and cracks on delivery, before it's installed. Store it upright in its packaging, and fit and seal it as the maker's instructions say.",
    "plumbing": "Fit with the jointing method the maker specifies, flush the pipes before connecting taps and valves, and pressure-test before closing up walls.",
    "hardware": "Keep fasteners and ironmongery dry and in their packs; match the fixing to the material and load — ask us if unsure.",
    "boards": "Store boards flat on level bearers, under cover and off the ground. Shutterboard faces last longer if cleaned and oiled with release agent after every pour.",
    "formwork": "Props and scaffolding must be erected, inspected and used as the Construction Regulations (2014) require, on firm bearing, by a competent person. Check every component for damage before use.",
}

ADDED = []


def slug(name):
    s = name.lower().replace("×", "x").replace("&", "and").replace("²", "2").replace("°", "")
    s = re.sub(r"(\d)\.(\d)", r"\1-\2", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def unit(code, label):
    return {
        "unit": code, "unit_label": label, "weight_kg": None, "market_benchmark_price": None, "cost_basis_percent": 100,
        "cost_per_unit": None, "markup_percent": 8, "list_price_per_unit": None, "pricing_status": QUOTED, "source_note": SOURCE,
    }


def P(sku, name, cat, standard, desc, handling, units=(("EACH", "Each"),), unit_size=None):
    ADDED.append({
        "sku": sku, "slug": slug(name), "name": name, "category_slug": cat, "grading_standard": standard,
        "roof_profile": None, "thickness_mm": None, "coating": None, "cover_width_mm": None, "list_price_per_metre": None,
        "section": None, "timber_grade": None, "timber_treatment": None, "timber_finish": None,
        "manufacturer": None, "unit_size": unit_size, "specialist_characteristics": [],
        "description": desc, "typical_uses": USES[cat], "handling_notes": HANDLING[handling],
        "units": [unit(c, l) for c, l in units], "_line": OWNED,
    })


E, SOLAR, TILES, FLOOR, SAN, PLUMB, HW, BOARDS, FORM = "electrical", "solar", "tiles", "flooring", "sanitary", "plumbing", "hardware", "boards", "formwork"

# --- CAT-43 Cable, conduit & wiring -----------------------------------------------------------------------
for size, use in (("1.5", "lighting circuits"), ("2.5", "plug circuits"), ("4", "stove, geyser and heavier circuits"), ("6", "stove and sub-board feeds")):
    for metres in (("20", "20 m"), ("100", "100 m")):
        P(f"AA-ELE-SURFIX-{size.replace('.', '')}-{metres[0]}", f"Surfix Cable 2-Core & Earth {size} mm², {metres[1]} Roll", "electrical-cable-conduit",
          "SANS 1507 flat twin and earth cable, 300/500 V",
          f"Flat twin-and-earth (Surfix) PVC cable, {size} mm² copper conductors, for {use} — run in conduit or clipped where the wiring code allows. Sold by the {metres[1]} roll.",
          E, (("ROLL", f"Roll ({metres[1]})"),))
for size in ("1.5", "2.5", "4", "6", "10", "16"):
    P(f"AA-ELE-HW-{size.replace('.', '')}", f"House Wire (Single-Core) {size} mm², 100 m Roll", "electrical-cable-conduit",
      "SANS 1507 single-core PVC-insulated conductor",
      f"Single-core PVC house wire, {size} mm² copper, for drawing through conduit — live, neutral and earth colours (red, black, green/yellow or brown, blue, green/yellow) confirmed on the quote.",
      E, (("ROLL", "Roll (100 m)"),))
for size, cores in (("2.5", "3-core"), ("4", "3-core"), ("6", "3-core"), ("10", "4-core"), ("16", "4-core")):
    P(f"AA-ELE-SWA-{size.replace('.', '')}", f"Armoured Cable (SWA) {cores} {size} mm², per Metre (on quote)", "electrical-cable-conduit",
      "SANS 1507 PVC/SWA/PVC armoured cable, 600/1000 V",
      f"Steel-wire armoured PVC cable, {cores} {size} mm², for buried and outdoor runs — feeds to outbuildings, gates, pumps and sub-boards. Cut to the length on your quote.",
      E)
P("AA-ELE-FLEX-3C-15", "Flexible Cord 3-Core 1.5 mm², 100 m Roll", "electrical-cable-conduit", "SANS 1574 PVC flexible cord",
  "Three-core flexible cord for appliance connections, extension leads and pendant lights.", E, (("ROLL", "Roll (100 m)"),))
P("AA-ELE-EARTH-BARE-10", "Bare Copper Earth Wire 10 mm², 100 m Roll", "electrical-cable-conduit", "Bare stranded copper earth conductor",
  "Bare copper conductor for the earth electrode and main earthing connection.", E, (("ROLL", "Roll (100 m)"),))
for size in ("20", "25", "32"):
    P(f"AA-ELE-CONDUIT-{size}", f"PVC Conduit {size} mm × 4 m", "electrical-cable-conduit", "SANS 61386 rigid PVC electrical conduit",
      f"Rigid PVC conduit, {size} mm, in 4 m lengths — chased into brickwork, cast into slabs or surface-mounted.", E)
    P(f"AA-ELE-CONDUIT-BEND-{size}", f"PVC Conduit Bend {size} mm", "electrical-cable-conduit", "Rigid PVC conduit fitting",
      f"Plain 90° bend for {size} mm PVC conduit.", E)
    P(f"AA-ELE-CONDUIT-COUPLER-{size}", f"PVC Conduit Coupling {size} mm", "electrical-cable-conduit", "Rigid PVC conduit fitting",
      f"Straight coupling for {size} mm PVC conduit.", E)
P("AA-ELE-CONDUIT-FLEX-20", "Flexible Corrugated Conduit 20 mm, 25 m Roll", "electrical-cable-conduit", "Corrugated PVC flexible conduit",
  "Flexible corrugated conduit for slab and ceiling runs and awkward bends.", E, (("ROLL", "Roll (25 m)"),))
for size in ("20", "25"):
    P(f"AA-ELE-JBOX-{size}", f"Conduit Junction Box {size} mm (1, 2, 3 or 4-way)", "electrical-cable-conduit", "PVC round conduit box",
      f"Round PVC junction box for {size} mm conduit, with the number of ways confirmed on the quote.", E)
for size in ("4 × 2", "4 × 4"):
    P(f"AA-ELE-WALLBOX-{size.replace(' × ', 'X')}", f"Steel Wall Box {size}", "electrical-cable-conduit", "Galvanised steel flush wall box",
      f"Galvanised steel flush box ({size}) for switches and sockets, built into brick or block walls.", E)
P("AA-ELE-TRUNKING-25", "PVC Trunking 25 × 16 mm × 2 m", "electrical-cable-conduit", "Self-adhesive PVC mini-trunking",
  "Surface PVC trunking for adding circuits without chasing walls.", E)
P("AA-ELE-TRUNKING-40", "PVC Trunking 40 × 25 mm × 2 m", "electrical-cable-conduit", "PVC mini-trunking", "Larger surface trunking for several cables.", E)
P("AA-ELE-DRAW-WIRE", "Draw Wire (Fish Tape) 15 m", "electrical-cable-conduit", "Steel draw wire", "Steel draw wire for pulling cables through conduit.", E)
P("AA-ELE-CABLE-TIES", "Cable Ties 200 mm (pack of 100)", "electrical-cable-conduit", "Nylon cable ties", "UV-stabilised nylon cable ties.", E, (("PACK", "Pack (100)"),))
P("AA-ELE-INSULATION-TAPE", "PVC Insulation Tape (pack of 10)", "electrical-cable-conduit", "PVC electrical insulation tape",
  "PVC insulation tape in mixed colours for marking and insulating.", E, (("PACK", "Pack (10)"),))

# --- CAT-44 Distribution boards & protection --------------------------------------------------------------
for ways, mount in (("6", "surface"), ("8", "surface"), ("12", "surface"), ("18", "surface"), ("24", "surface"), ("12", "flush"), ("24", "flush"), ("36", "flush")):
    P(f"AA-ELE-DB-{ways}-{mount[0].upper()}", f"Distribution Board {ways}-Way, {mount.title()} Mount (Mini-Rail)", "electrical-distribution",
      "Mini-rail (DIN) distribution board enclosure",
      f"Empty {ways}-way {mount}-mounted distribution board for DIN-rail breakers — populated with the breakers on your circuit schedule on the quote.", E)
P("AA-ELE-DB-WEATHERPROOF-4", "Weatherproof Distribution Board 4-Way (IP65)", "electrical-distribution", "IP65 enclosure",
  "Weatherproof board for pool pumps, gate motors and outdoor sub-boards.", E)
for amps in ("10", "16", "20", "32", "40", "63"):
    P(f"AA-ELE-MCB-{amps}", f"Circuit Breaker {amps} A Single Pole (Mini-Rail)", "electrical-distribution", "SANS / IEC 60898 miniature circuit breaker, 3 or 6 kA",
      f"{amps} A single-pole miniature circuit breaker for the distribution board.", E)
P("AA-ELE-MCB-DP-63", "Main Switch / Circuit Breaker 63 A Double Pole", "electrical-distribution", "IEC 60898 / 60947 double-pole breaker",
  "Double-pole main switch for the board's incoming supply.", E)
P("AA-ELE-ELCB-63", "Earth Leakage Unit 63 A Double Pole, 30 mA", "electrical-distribution", "SANS / IEC 61008 residual current device",
  "30 mA earth leakage protection, required on socket and other circuits by the wiring code.", E)
P("AA-ELE-RCBO-20", "Combined Breaker & Earth Leakage (RCBO) 20 A", "electrical-distribution", "IEC 61009 RCBO",
  "Combined overload and earth-leakage protection for a single circuit.", E)
P("AA-ELE-SURGE-DIN", "Surge Arrester, Mini-Rail (Type 2)", "electrical-distribution", "IEC 61643 Type 2 surge protective device",
  "Board-mounted surge protection against lightning and grid surges.", E)
P("AA-ELE-TIMER-DIN", "Geyser Timer, Mini-Rail", "electrical-distribution", "DIN-rail time switch", "Programmable time switch for the geyser circuit.", E)
P("AA-ELE-ISOL-GEYSER", "Geyser Isolator 30 A", "electrical-distribution", "Surface isolator", "Isolator mounted at the geyser for safe maintenance.", E)
P("AA-ELE-ISOL-STOVE", "Stove Isolator 50 A (4 × 4)", "electrical-distribution", "Flush isolator", "Isolator for the stove circuit, next to the stove.", E)
P("AA-ELE-EARTH-SPIKE", "Earth Spike 1.2 m with Clamp", "electrical-distribution", "Copper-bonded earth electrode",
  "Copper-bonded earth spike with clamp for the installation's earth electrode.", E)
P("AA-ELE-DB-BLANKS", "Distribution Board Blanks (pack of 5)", "electrical-distribution", "DIN-rail blanking plates",
  "Blanking plates for unused board ways.", E, (("PACK", "Pack (5)"),))

# --- CAT-45 Switches, sockets & lighting ------------------------------------------------------------------
for name, std, desc in (
    ("Light Switch 1-Lever 1-Way (4 × 2)", "SANS 60669 switch", "Single-lever one-way switch on a 4 × 2 plate."),
    ("Light Switch 2-Lever 1-Way (4 × 2)", "SANS 60669 switch", "Two-lever one-way switch on a 4 × 2 plate."),
    ("Light Switch 1-Lever 2-Way (4 × 2)", "SANS 60669 switch", "Two-way switch for stairs and passages switched from both ends."),
    ("Light Switch 4-Lever (4 × 4)", "SANS 60669 switch", "Four-lever switch on a 4 × 4 plate."),
    ("Single Switched Socket (4 × 2)", "SANS 164 socket outlet", "Single switched plug socket on a 4 × 2 plate."),
    ("Double Switched Socket (4 × 4)", "SANS 164 socket outlet", "Double switched plug socket on a 4 × 4 plate."),
    ("Double Socket with USB Ports (4 × 4)", "SANS 164 socket outlet", "Double plug socket with USB charging ports."),
    ("Weatherproof Socket (IP55)", "SANS 164 socket outlet, IP55", "Weatherproof outdoor plug socket with a cover."),
    ("Dimmer Switch (LED Compatible)", "SANS 60669-2-1 dimmer", "Rotary dimmer for dimmable LED lighting."),
    ("Blank Cover Plate (4 × 2 or 4 × 4)", "Cover plate", "Blank plate for unused wall boxes."),
    ("Ceiling Rose & Lamp Holder", "Ceiling rose with bayonet or E27 holder", "Ceiling rose and lamp holder for a pendant or globe."),
):
    P(f"AA-ELE-{slug(name).upper()[:28]}", name, "switches-sockets-lighting", std, desc + " Range and colour (white, black or metal finishes) confirmed on the quote.", E)
for watts in ("5", "7", "9", "12"):
    P(f"AA-ELE-LED-A60-{watts}", f"LED Globe {watts} W, E27 or B22", "switches-sockets-lighting", "LED lamp",
      f"{watts} W LED globe; warm or cool white and cap (E27 screw or B22 bayonet) confirmed on the quote.", E, (("EACH", "Each"), ("PACK", "Pack (10)")))
for name, desc in (
    ("LED Downlight 7 W (complete, dimmable)", "Recessed LED downlight for ceilings, fitting and lamp together."),
    ("LED Downlight Fitting GU10 (lamp excluded)", "Recessed downlight fitting for a GU10 lamp."),
    ("LED GU10 Lamp 5 W", "GU10 LED lamp for downlight fittings."),
    ("LED Batten Light 18 W (600 mm)", "Surface LED batten for garages, store rooms and passages."),
    ("LED Batten Light 36 W (1200 mm)", "Longer surface LED batten for workshops and garages."),
    ("Bulkhead Light, Outdoor (IP65)", "Outdoor bulkhead fitting for walls and entrances."),
    ("LED Floodlight 50 W (IP65)", "Outdoor LED floodlight for security and yards."),
    ("LED Floodlight 100 W (IP65)", "Brighter LED floodlight for yards, sites and parking."),
    ("LED Floodlight with Day/Night Sensor 30 W", "Floodlight that switches on at dusk."),
    ("Rechargeable Emergency Light", "Light that runs from its battery when the power fails."),
):
    P(f"AA-ELE-{slug(name).upper()[:30]}", name, "switches-sockets-lighting", "Light fitting", desc + " Finish confirmed on the quote.", E)

# --- CAT-46 Solar & backup power ------------------------------------------------------------------------
for watts in ("400", "450", "550"):
    P(f"AA-SOL-PANEL-{watts}", f"Solar Panel {watts} W Mono", "solar-backup-power", "Monocrystalline PV module, IEC 61215 / 61730",
      f"{watts} W monocrystalline solar panel — make and size confirmed on the quote.", SOLAR)
for kva, kind in (("3", "hybrid"), ("5", "hybrid"), ("8", "hybrid"), ("1", "backup (line-interactive)")):
    P(f"AA-SOL-INV-{kva}KVA", f"Inverter {kva} kVA / kW, {kind.split(' ')[0].title()}", "solar-backup-power", "NRS 097-2-1 listed inverter (grid-tied use)",
      f"{kva} kVA {kind} inverter — runs essentials from the battery and, for hybrid units, from solar panels. Sized to your loads on the quote.", SOLAR)
for kwh in ("2.4", "5.1", "10"):
    P(f"AA-SOL-BATT-{kwh.replace('.', '')}", f"Lithium (LiFePO4) Battery {kwh} kWh", "solar-backup-power", "LiFePO4 battery with BMS",
      f"{kwh} kWh lithium iron phosphate battery for inverter backup — compatibility with the inverter confirmed on the quote.", SOLAR)
P("AA-SOL-MOUNT-IBR", "Solar Panel Mounting Kit, IBR / Corrugated Roof (per panel)", "solar-backup-power", "Aluminium rail mounting system",
  "Rails, clamps and roof brackets for one panel on sheeted roofs.", SOLAR)
P("AA-SOL-MOUNT-TILE", "Solar Panel Mounting Kit, Tiled Roof (per panel)", "solar-backup-power", "Aluminium rail mounting system with tile hooks",
  "Rails, clamps and tile hooks for one panel on tiled roofs.", SOLAR)
P("AA-SOL-PV-CABLE-6", "Solar PV Cable 6 mm², 100 m Roll", "solar-backup-power", "EN 50618 PV cable",
  "UV-resistant DC cable between the panels and the inverter.", SOLAR, (("ROLL", "Roll (100 m)"),))
P("AA-SOL-MC4", "MC4 Connectors (pair)", "solar-backup-power", "MC4 PV connectors", "Panel connectors for solar strings.", SOLAR, (("PACK", "Pair"),))
P("AA-SOL-DC-ISOL", "DC Isolator / Combiner Box for PV Strings", "solar-backup-power", "IEC 60947-3 DC isolator",
  "DC isolation and protection between the panels and the inverter.", SOLAR)
P("AA-SOL-CHANGEOVER", "Changeover Switch 63 A (Generator / Inverter)", "solar-backup-power", "Manual changeover switch",
  "Switches the essential circuits between grid, inverter or generator supply.", SOLAR)

# --- CAT-47 Floor & wall tiles ---------------------------------------------------------------------------
def per_box(w, h, n):
    return f"Box (≈{round(w * h * n / 1e6, 2)} m²)"


for name, std, w, h, n, desc in (
    ("Ceramic Floor Tile 330 × 330 mm", "Glazed ceramic floor tile, SANS / ISO 13006", 330, 330, 14, "Glazed ceramic floor tile for living areas and bedrooms."),
    ("Ceramic Floor Tile 400 × 400 mm", "Glazed ceramic floor tile", 400, 400, 10, "Glazed ceramic floor tile in the popular 400 mm size."),
    ("Ceramic Floor Tile 500 × 500 mm", "Glazed ceramic floor tile", 500, 500, 6, "Larger-format ceramic floor tile."),
    ("Ceramic Wood-Look Floor Tile 150 × 600 mm", "Glazed ceramic floor tile", 150, 600, 16, "Timber-look ceramic plank tile."),
    ("Porcelain Floor Tile 600 × 600 mm", "Glazed or polished porcelain tile", 600, 600, 4, "Hard-wearing porcelain floor tile for high-traffic and open-plan areas."),
    ("Porcelain Floor Tile 600 × 1200 mm", "Glazed porcelain tile", 600, 1200, 2, "Large-format porcelain tile with fewer joints."),
    ("Porcelain Wood-Look Plank Tile 200 × 1200 mm", "Glazed porcelain tile", 200, 1200, 6, "Timber-look porcelain plank for living areas."),
    ("Outdoor Non-Slip Porcelain Tile 600 × 600 mm (R11)", "Porcelain tile, slip rating R11", 600, 600, 4, "Textured non-slip porcelain for patios, stoeps and pool surrounds."),
    ("Ceramic Wall Tile 250 × 400 mm", "Glazed ceramic wall tile", 250, 400, 15, "Glazed wall tile for bathrooms and kitchens."),
    ("Ceramic Wall Tile 300 × 600 mm", "Glazed ceramic wall tile", 300, 600, 8, "Larger wall tile for bathrooms and splashbacks."),
    ("Subway Wall Tile 75 × 150 mm", "Glazed ceramic wall tile", 75, 150, 44, "Classic brick-bond subway tile for splashbacks and showers."),
    ("Mosaic Tile Sheet 300 × 300 mm", "Glass or ceramic mosaic on mesh", 300, 300, 11, "Mosaic on a mesh sheet for feature walls and shower niches."),
    ("Porcelain Cladding (Stone-Look) Tile", "Porcelain wall cladding", 600, 150, 6, "Stone-look porcelain cladding for feature walls and braais."),
):
    P(f"AA-TIL-{slug(name).upper()[:30]}", name, "floor-wall-tiles", std,
      desc + " Colour, finish and the exact box size are confirmed on the quote — order about 10% extra for cuts.", TILES,
      (("PACK", per_box(w, h, n)),), unit_size=f"{w} × {h} mm")

# --- CAT-48 Laminate, vinyl & skirting -------------------------------------------------------------------
for name, std, desc, u in (
    ("Laminate Flooring 7 mm AC3 (per pack)", "EN 13329 laminate, AC3", "Click-together laminate planks for bedrooms and living areas.", "Pack (≈2.4 m²)"),
    ("Laminate Flooring 8 mm AC4 (per pack)", "EN 13329 laminate, AC4", "Heavier-duty laminate for busier areas and small offices.", "Pack (≈2.2 m²)"),
    ("Laminate Flooring 12 mm AC4 (per pack)", "EN 13329 laminate, AC4", "Thick laminate with a solid feel underfoot.", "Pack (≈1.5 m²)"),
    ("Vinyl Plank (SPC Rigid Core) 5 mm, Click (per pack)", "SPC rigid-core vinyl plank", "Waterproof rigid-core vinyl planks for kitchens and bathrooms too.", "Pack (≈2.2 m²)"),
    ("LVT Vinyl Plank, Glue-Down (per pack)", "Luxury vinyl tile, glue-down", "Thin vinyl planks glued to a smooth screed.", "Pack (≈3.3 m²)"),
    ("Vinyl Floor Tile 300 × 300 mm (per box)", "Vinyl composition tile", "Hard-wearing vinyl tiles for offices, shops and schools.", "Box (≈4.6 m²)"),
    ("Flooring Underlay 3 mm (per roll)", "Foam underlay with moisture barrier", "Underlay for laminate floors; acoustic and moisture-barrier options.", "Roll (≈15 m²)"),
):
    P(f"AA-FLR-{slug(name).upper()[:30]}", name, "flooring-skirting", std, desc + " Colour and range confirmed on the quote.", FLOOR,
      ((("ROLL" if "roll" in u.lower() else "PACK"), u),))
for name, std, desc in (
    ("MDF Skirting 70 mm × 2.7 m (Primed)", "Primed MDF skirting", "Primed MDF skirting to paint."),
    ("MDF Skirting 90 mm × 2.7 m (Primed)", "Primed MDF skirting", "Taller primed MDF skirting."),
    ("Pine Skirting 70 mm × 2.7 m", "SA pine skirting", "Pine skirting to stain or paint."),
    ("PVC Skirting 70 mm × 2.4 m", "PVC skirting", "Moisture-proof PVC skirting for wet areas and laminate."),
    ("Laminate Floor Profile (Reducer / End) 0.9 m", "Aluminium or PVC floor profile", "Transition strip between floor finishes."),
    ("Scotia / Quadrant Bead 2.4 m", "Quadrant moulding", "Covers the expansion gap where floor meets skirting."),
):
    P(f"AA-FLR-{slug(name).upper()[:30]}", name, "flooring-skirting", std, desc + " Finish confirmed on the quote.", FLOOR)

# --- CAT-49 Tile trims & tiling accessories --------------------------------------------------------------
for name, std, desc, u in (
    ("Aluminium Tile Trim, Round Edge 10 mm × 2.5 m", "Aluminium tile trim", "Finishes exposed tile edges on walls and steps.", "EACH"),
    ("Aluminium Tile Trim, Round Edge 12 mm × 2.5 m", "Aluminium tile trim", "For thicker tiles and floor edges.", "EACH"),
    ("PVC Tile Trim, Round Edge 10 mm × 2.5 m", "PVC tile trim", "PVC edge trim in white or colours.", "EACH"),
    ("Aluminium Stair Nosing 2.5 m", "Aluminium stair nosing", "Protects and finishes tiled step edges.", "EACH"),
    ("Aluminium Reducer Trim 2.5 m", "Aluminium reducer trim", "Ramps between tiled and thinner floors.", "EACH"),
    ("Tile Spacers 3 mm (pack)", "Plastic tile spacers", "Even 3 mm joints.", "PACK"),
    ("Tile Spacers 5 mm (pack)", "Plastic tile spacers", "Even 5 mm joints for floor tiles.", "PACK"),
    ("Tile Levelling System Clips (pack of 100)", "Tile levelling clips", "Keeps large tiles flat and lipping-free while the adhesive sets.", "PACK"),
    ("Tile Levelling System Wedges (pack of 100)", "Tile levelling wedges", "Reusable wedges for the levelling clips.", "PACK"),
    ("Notched Trowel 10 mm", "Tiler's notched trowel", "Spreads tile adhesive at the bed the tile size needs.", "EACH"),
    ("Rubber Grout Float", "Grout float", "Works grout into the joints.", "EACH"),
    ("Tile Cutter 800 mm", "Manual tile cutter", "Straight cuts on larger tiles.", "EACH"),
    ("Tile Grout Sealer 1 L", "Penetrating grout sealer", "Seals cement grout joints against stains.", "EACH"),
    ("Shower Channel Drain 600 mm (stainless)", "Stainless steel linear drain", "Linear drain for level-access tiled showers.", "EACH"),
    ("Square Floor Drain / Grating 100 mm", "Stainless floor drain", "Point drain for tiled showers and wet rooms.", "EACH"),
):
    P(f"AA-TLA-{slug(name).upper()[:30]}", name, "tiling-accessories", std, desc + " Tile adhesives and grouts are in Mortars, Grouts & Admixtures.", TILES,
      ((u, "Each" if u == "EACH" else "Pack"),))

# --- CAT-50 Sanitaryware ---------------------------------------------------------------------------------
for name, std, desc in (
    ("Close-Coupled Toilet Suite, Front Flush (with seat)", "SANS 497 vitreous china WC with cistern", "Close-coupled toilet with cistern and seat — floor outlet (S or P trap) confirmed on the quote."),
    ("Close-Coupled Toilet Suite, Top Flush, Dual Flush", "SANS 497 vitreous china WC with dual-flush cistern", "Water-saving dual-flush toilet suite with seat."),
    ("Low-Level Toilet Suite with Plastic Cistern", "Vitreous china pan with plastic cistern", "Economical toilet suite for rental units and site ablutions."),
    ("Wall-Hung Toilet Pan with Concealed Cistern Frame", "Wall-hung pan with in-wall frame", "Wall-hung toilet with concealed cistern and flush plate."),
    ("Toilet Seat, Standard", "Toilet seat and cover", "Replacement toilet seat and cover."),
    ("Toilet Seat, Soft-Close", "Toilet seat and cover", "Soft-close seat and cover."),
    ("Wash Basin, Wall-Hung 500 mm", "Vitreous china basin", "Wall-hung basin with brackets."),
    ("Wash Basin with Pedestal 550 mm", "Vitreous china basin and pedestal", "Basin on a pedestal that hides the trap."),
    ("Counter-Top (Vessel) Basin", "Vitreous china vessel basin", "Basin that sits on a vanity top."),
    ("Vanity Unit with Basin 600 mm", "Vanity cabinet with basin", "Floor-standing or wall-hung vanity with basin."),
    ("Acrylic Bath 1500 × 700 mm", "Acrylic bath", "Standard bath for smaller bathrooms."),
    ("Acrylic Bath 1700 × 700 mm", "Acrylic bath", "Full-length standard bath."),
    ("Freestanding Bath 1700 mm", "Acrylic freestanding bath", "Freestanding feature bath."),
    ("Shower Tray 900 × 900 mm", "Acrylic or stone-resin shower tray", "Square shower tray."),
    ("Shower Tray 1200 × 800 mm", "Acrylic or stone-resin shower tray", "Rectangular walk-in shower tray."),
    ("Shower Door / Enclosure 900 mm (Safety Glass)", "SANS 1263 safety glass enclosure", "Pivot or sliding shower door or corner enclosure."),
    ("Bath Screen (Safety Glass)", "SANS 1263 safety glass", "Hinged or fixed glass screen for a shower over the bath."),
    ("Urinal with Flush Valve", "Vitreous china urinal", "Wall urinal for offices, schools and sites."),
):
    P(f"AA-SAN-{slug(name).upper()[:30]}", name, "sanitaryware", std, desc + " Make, range and colour confirmed on the quote.", SAN)

# --- CAT-51 Taps, mixers & valves -----------------------------------------------------------------------
for name, std, desc in (
    ("Basin Pillar Tap 15 mm (pair)", "SANS 226 / 1808 tap", "Hot and cold basin pillar taps."),
    ("Basin Mixer, Single Lever", "SANS 1808 mixer", "Single-lever basin mixer."),
    ("Bath Mixer, Deck-Mounted", "SANS 1808 mixer", "Bath mixer with spout."),
    ("Bath/Shower Mixer with Hand Shower", "SANS 1808 mixer", "Wall bath mixer with diverter and hand shower."),
    ("Concealed Shower Mixer", "SANS 1808 mixer", "In-wall shower mixer with trim."),
    ("Exposed Shower Mixer", "SANS 1808 mixer", "Surface-mounted shower mixer."),
    ("Shower Head & Arm (Fixed)", "Shower head", "Fixed shower head and arm; water-saving options."),
    ("Shower Rail Kit with Hand Shower", "Shower rail kit", "Slide rail, hose and hand shower."),
    ("Kitchen Sink Mixer, Single Lever", "SANS 1808 mixer", "Single-lever sink mixer with swivel spout."),
    ("Kitchen Sink Mixer, Pull-Out", "SANS 1808 mixer", "Sink mixer with pull-out spray."),
    ("Wall-Mounted Sink Mixer", "SANS 1808 mixer", "Wall-mounted mixer for sinks."),
    ("Angle Valve 15 mm", "Angle stop valve", "Isolating angle valve for basins and toilets."),
    ("Flexible Connector 15 mm × 300 mm (braided)", "Braided flexible hose", "Connects taps and cisterns to the angle valve."),
    ("Stopcock 22 mm", "Copper-compression stopcock", "Isolating stopcock for the main supply."),
    ("Pressure Reducing Valve 22 mm", "Pressure reducing valve", "Reduces mains pressure to protect the plumbing."),
    ("Vacuum Breaker 15 mm / 22 mm", "Geyser vacuum breaker", "Geyser installation valve."),
    ("Toilet Cistern Inlet Valve", "Cistern fill valve", "Bottom- or side-entry fill valve."),
    ("Toilet Cistern Flush Valve / Mechanism", "Cistern flush valve", "Replacement flush mechanism."),
):
    P(f"AA-TAP-{slug(name).upper()[:30]}", name, "taps-mixers-valves", std, desc + " Finish and range confirmed on the quote.", PLUMB)

# --- CAT-52 Kitchen sinks, traps & waste ----------------------------------------------------------------
for name, std, desc in (
    ("Stainless Steel Sink, Single Bowl Inset", "Stainless steel sink", "Single-bowl inset sink for counter tops."),
    ("Stainless Steel Sink, Double Bowl Inset", "Stainless steel sink", "Double-bowl inset sink."),
    ("Stainless Steel Sink, Single Bowl & Drainer", "Stainless steel sink", "Bowl and drainer, left- or right-hand."),
    ("Undermount Sink, Single Bowl", "Stainless steel undermount sink", "Undermount bowl for stone and solid tops."),
    ("Granite-Composite Sink", "Composite sink", "Composite sink in black, grey or white."),
    ("Scullery / Laundry Tub, Free-Standing", "Laundry tub", "Deep tub for laundries and sculleries."),
    ("Bottle Trap 32 mm (basin)", "Plastic bottle trap", "Basin trap."),
    ("Double-Bowl Sink Trap Kit 40 mm", "Plastic trap kit", "Trap and connector for double-bowl sinks."),
    ("Sink Waste (Basket Strainer) 40 mm", "Sink waste", "Basket-strainer waste for kitchen sinks."),
    ("Basin Waste, Slotted / Click-Clack 32 mm", "Basin waste", "Basin waste with or without overflow."),
    ("Bath Waste & Overflow 40 mm", "Bath waste", "Bath waste with overflow."),
    ("Washing Machine Trap & Standpipe", "Washing machine waste", "Standpipe and trap for a washing machine."),
    ("Dishwasher / Washing Machine Valve 15 mm", "Appliance valve", "Supply valve for appliances."),
    ("Grease Trap, Plastic", "Grease trap", "Grease trap for kitchen waste."),
):
    P(f"AA-KSW-{slug(name).upper()[:30]}", name, "kitchen-sinks-waste", std, desc + " Make and size confirmed on the quote.", PLUMB)

# --- CAT-53 Nails, screws, bolts & anchors --------------------------------------------------------------
for size in ("40", "50", "75", "100", "125"):
    P(f"AA-FIX-WIRE-NAILS-{size}", f"Round Wire Nails {size} mm (5 kg box)", "fasteners-fixings", "Bright round wire nails",
      f"Bright round wire nails, {size} mm, for carpentry and shuttering.", HW, (("PACK", "Box (5 kg)"),))
for size in ("40", "65"):
    P(f"AA-FIX-CONCRETE-NAILS-{size}", f"Concrete (Masonry) Nails {size} mm (box)", "fasteners-fixings", "Hardened masonry nails",
      f"Hardened nails for fixing to brick, block and concrete, {size} mm.", HW, (("PACK", "Box"),))
P("AA-FIX-CLOUT-NAILS", "Galvanised Clout Nails 40 mm (1 kg)", "fasteners-fixings", "Galvanised clout nails", "Large-head nails for boards and felt.", HW, (("PACK", "Pack (1 kg)"),))
for size in ("4 × 30", "4 × 40", "5 × 50", "5 × 70", "6 × 100"):
    P(f"AA-FIX-WOOD-SCREWS-{size.replace(' × ', 'X')}", f"Chipboard / Wood Screws {size} mm (box of 200)", "fasteners-fixings", "Zinc-plated chipboard screws",
      f"Zinc-plated chipboard and wood screws, {size} mm, pozi drive.", HW, (("PACK", "Box (200)"),))
for size in ("6", "8", "10"):
    P(f"AA-FIX-WALL-PLUGS-{size}", f"Nylon Wall Plugs {size} mm (pack of 100)", "fasteners-fixings", "Nylon wall plugs",
      f"Nylon wall plugs for {size} mm holes in brick and block.", HW, (("PACK", "Pack (100)"),))
for size in ("M8 × 75", "M10 × 75", "M12 × 100", "M16 × 150"):
    P(f"AA-FIX-SLEEVE-ANCHOR-{size.replace(' × ', 'X').replace('M', '')}", f"Sleeve Anchor (Rawl Bolt) {size} mm (pack of 10)", "fasteners-fixings",
      "Zinc-plated sleeve anchor", f"Expanding sleeve anchors, {size} mm, for fixing to concrete and solid masonry.", HW, (("PACK", "Pack (10)"),))
for size in ("M10", "M12", "M16"):
    P(f"AA-FIX-THROUGH-BOLT-{size}", f"Through Bolt (Wedge Anchor) {size} (pack of 10)", "fasteners-fixings", "Zinc-plated wedge anchor",
      f"Wedge anchors, {size}, for heavy fixings to concrete.", HW, (("PACK", "Pack (10)"),))
for size in ("M8", "M10", "M12", "M16"):
    P(f"AA-FIX-HEX-BOLTS-{size}", f"Hex Bolts, Nuts & Washers {size} (pack of 10)", "fasteners-fixings", "Grade 8.8 zinc-plated bolts",
      f"Hexagon bolts with nuts and washers, {size}; length confirmed on the quote.", HW, (("PACK", "Pack (10)"),))
for size in ("M10 × 1 m", "M12 × 1 m", "M16 × 1 m"):
    P(f"AA-FIX-THREADED-ROD-{size.split(' ')[0]}", f"Threaded Rod {size}", "fasteners-fixings", "Zinc-plated threaded rod",
      f"Threaded rod, {size}, for anchors and hangers.", HW)
P("AA-FIX-SELF-DRILL", "Self-Drilling Screws 10g × 16 mm (box of 100)", "fasteners-fixings", "Self-drilling tek screws",
  "Tek screws for light steel and sheet metal.", HW, (("PACK", "Box (100)"),))
P("AA-FIX-FRAME-FIXINGS", "Frame Fixings 10 × 100 mm (pack of 50)", "fasteners-fixings", "Nylon frame fixings",
  "Plug and screw in one for fixing frames to masonry.", HW, (("PACK", "Pack (50)"),))
P("AA-FIX-STAPLES", "Staples for Staple Gun (box)", "fasteners-fixings", "Steel staples", "Staples for insulation, underlay and mesh.", HW, (("PACK", "Box"),))

# --- CAT-54 Locks, hinges & door hardware ---------------------------------------------------------------
for name, std, desc in (
    ("2-Lever Mortice Lock Set (with handles)", "2-lever mortice lockset", "Interior door lockset with handles and keys."),
    ("3-Lever Mortice Lock Set (with handles)", "3-lever mortice lockset", "Better-security lockset for exterior doors."),
    ("4-Lever Mortice Lock Set (with handles)", "4-lever mortice lockset", "Security lockset for exterior doors."),
    ("Cylinder Lock Set (Euro Profile)", "Euro-profile cylinder lockset", "Cylinder lock with keys for front and back doors."),
    ("Bathroom Lock Set (Privacy)", "Privacy lockset", "Bathroom lock with thumb-turn and emergency release."),
    ("Door Handles on Rose (pair)", "Lever handles on rose", "Lever handles for interior doors."),
    ("Butt Hinges 100 mm (pair)", "Steel or brass butt hinges", "Hinges for hanging timber doors; finish on the quote."),
    ("Butt Hinges 75 mm (pair)", "Steel butt hinges", "Hinges for lighter doors and cupboards."),
    ("Heavy-Duty Hinges 100 mm (pair)", "Ball-bearing hinges", "Ball-bearing hinges for heavy and solid doors."),
    ("Concealed Cupboard Hinges (pair)", "Concealed (European) hinges", "Soft-close concealed hinges for cupboards."),
    ("Tower Bolt 150 mm", "Steel tower bolt", "Surface bolt for doors and gates."),
    ("Padbolt with Hasp & Staple", "Padbolt", "Padbolt for outbuildings and gates."),
    ("Padlock 40 mm", "Brass or laminated padlock", "Padlock for gates, store rooms and containers."),
    ("Padlock 60 mm, Heavy Duty", "Heavy-duty padlock", "Heavy-duty padlock for site containers and gates."),
    ("Door Closer, Overhead", "EN 1154 door closer", "Overhead closer for exterior and office doors."),
    ("Door Stop (Floor or Wall)", "Door stop", "Floor- or wall-mounted door stop."),
    ("Window Stay & Fastener Set", "Window stay", "Stay and fastener for steel or timber windows."),
    ("Cupboard Handles (pack of 10)", "Cupboard handles", "Handles for cupboards and drawers.", ),
    ("Drawer Runners 450 mm (pair)", "Ball-bearing drawer runners", "Full-extension drawer runners."),
    ("Sliding Door Gear Set (up to 80 kg)", "Top-hung sliding door gear", "Track and hangers for interior sliding doors."),
):
    units = (("PACK", "Pack (10)"),) if "pack of 10" in name else (("EACH", "Each"),)
    P(f"AA-LCK-{slug(name).upper()[:30]}", name, "locks-ironmongery", std, desc + " Finish and range confirmed on the quote.", HW, units)

# --- CAT-55 Shutterboard, plywood & boards --------------------------------------------------------------
for name, std, desc in (
    ("Shutterply 1220 × 2440 × 18 mm", "Film-faced shuttering plywood", "Film-faced plywood for concrete formwork — smooth off-shutter finish and repeat pours."),
    ("Shutterply 1220 × 2440 × 21 mm", "Film-faced shuttering plywood", "Thicker film-faced plywood for slabs and heavier formwork."),
    ("Shutterboard (Pine) 1220 × 2440 × 18 mm", "Exterior-glue pine shutterboard", "Economy shutterboard for footings, beams and general formwork."),
    ("Pine Plywood 1220 × 2440 × 4 mm", "Pine plywood", "Thin plywood for panelling and backing."),
    ("Pine Plywood 1220 × 2440 × 12 mm", "Pine plywood", "General-purpose structural plywood."),
    ("Pine Plywood 1220 × 2440 × 18 mm", "Pine plywood", "Heavier plywood for floors, shelving and joinery."),
    ("Marine Plywood 1220 × 2440 × 18 mm", "WBP marine plywood", "Water-resistant plywood for wet areas and outdoor work."),
    ("OSB 3 Board 1200 × 2400 × 11 mm", "EN 300 OSB/3", "Oriented strand board for hoarding, cladding and sheathing."),
    ("OSB 3 Board 1200 × 2400 × 16 mm", "EN 300 OSB/3", "Thicker OSB for floors and site hoarding."),
    ("Chipboard (Particle Board) 1830 × 2750 × 16 mm", "Particle board", "Raw chipboard for shelving and carcasses."),
    ("Melamine Board, White 1830 × 2750 × 16 mm", "Melamine-faced chipboard", "White melamine board for cupboards and built-ins."),
    ("SupaWood (MDF) 1830 × 2750 × 16 mm", "Medium-density fibreboard", "MDF for painted joinery, doors and shelving."),
    ("SupaWood (MDF) 1830 × 2750 × 6 mm", "Medium-density fibreboard", "Thin MDF for backs and panels."),
    ("Masonite (Hardboard) 1220 × 2440 × 3.2 mm", "Tempered hardboard", "Hardboard for backing, floor protection and templates."),
    ("Fibre-Cement Board 1200 × 2400 × 6 mm", "Fibre-cement flat sheet", "Fibre-cement board for external cladding, eaves and wet areas."),
    ("Fibre-Cement Board 1200 × 2400 × 9 mm", "Fibre-cement flat sheet", "Thicker fibre-cement board for flooring and cladding."),
):
    P(f"AA-BRD-{slug(name).upper()[:30]}", name, "boards-sheets", std, desc + " Make and grade confirmed on the quote.", BOARDS, (("SHEET", "Sheet"),))

# --- CAT-56 Formwork, props & scaffolding ---------------------------------------------------------------
for name, std, desc in (
    ("Adjustable Steel Prop 1.8–3.0 m", "Adjustable steel prop (EN 1065)", "Telescopic steel prop for supporting slab and beam formwork."),
    ("Adjustable Steel Prop 2.2–3.6 m", "Adjustable steel prop (EN 1065)", "Taller telescopic prop for higher soffits."),
    ("Prop Head (Fork Head)", "Prop fork head", "Fork head that holds the timber bearer on a prop."),
    ("Formwork Tie Rod 15 mm × 1 m with Wing Nuts", "Formwork tie system", "Tie rod and wing nuts for wall and column formwork."),
    ("Formwork Tie Cone / Spacer Tube (pack of 50)", "PVC spacer tube", "Spacer tubes that set the wall thickness around the tie rods."),
    ("Column Clamp Set", "Steel column clamps", "Clamps that hold column formwork closed while the concrete sets."),
    ("Scaffold Frame 1.5 m × 1.2 m", "Steel frame scaffold", "Frame scaffold section."),
    ("Scaffold Cross Brace", "Scaffold cross brace", "Bracing for frame scaffolding."),
    ("Scaffold Base Jack, Adjustable", "Adjustable base jack", "Adjustable foot for levelling scaffold on uneven ground."),
    ("Scaffold Castor 150 mm (with brake)", "Scaffold castor", "Lockable castor for mobile scaffold towers."),
    ("Scaffold Plank / Board 3 m", "Scaffold board", "Working platform board for scaffolding."),
    ("Scaffold Coupler (Swivel or Right-Angle)", "EN 74 scaffold coupler", "Coupler for tube-and-clip scaffolding."),
    ("Scaffold Tube 48.3 mm × 6 m", "EN 39 scaffold tube", "Galvanised scaffold tube."),
    ("Aluminium Mobile Scaffold Tower (working height to 6 m)", "EN 1004 mobile tower", "Mobile tower for ceilings, painting and fit-out."),
):
    units = (("PACK", "Pack (50)"),) if "pack of 50" in name else (("EACH", "Each"),)
    P(f"AA-FRM-{slug(name).upper()[:30]}", name, "formwork-scaffolding", std, desc + " Hire instead of buying? Ask on the quote.", FORM, units)


def main():
    data = json.loads(PATH.read_text(encoding="utf-8"))
    owned = {c[0] for c in CATEGORIES}
    data["categories"] = [c for c in data["categories"] if c["slug"] not in owned] + [{"slug": s, "name": n, "code": code} for s, n, code in CATEGORIES]
    data["products"] = [p for p in data["products"] if p.get("_line") != OWNED]
    # SKUs and slugs must be unique across the whole store.
    taken_sku, taken_slug = set(), set()
    for f in sorted((ROOT / "services/pricing/data").glob("*_catalogue.json")):
        if f == PATH:
            continue
        for p in json.loads(f.read_text(encoding="utf-8")).get("products", []):
            taken_sku.add(p.get("sku"))
            taken_slug.add(p.get("slug"))
    for p in data["products"]:
        taken_sku.add(p["sku"])
        taken_slug.add(p["slug"])
    clashes = []
    seen_sku, seen_slug = set(), set()
    for p in ADDED:
        base = re.sub(r"[^A-Z0-9-]+", "-", p["sku"]).strip("-")
        p["sku"], n = base, 2
        while p["sku"] in seen_sku:  # truncated names can collide within the range: number them
            p["sku"], n = f"{base}-{n}", n + 1
        if p["sku"] in taken_sku or p["sku"] in seen_sku:
            clashes.append(("sku", p["sku"]))
        if p["slug"] in taken_slug or p["slug"] in seen_slug:
            clashes.append(("slug", p["slug"]))
        seen_sku.add(p["sku"])
        seen_slug.add(p["slug"])
    if clashes:
        sys.exit(f"Duplicate SKUs or slugs: {clashes[:10]}")
    data["products"].extend(ADDED)
    PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    by_cat = {}
    for p in ADDED:
        by_cat[p["category_slug"]] = by_cat.get(p["category_slug"], 0) + 1
    print(f"{len(ADDED)} products in {len(CATEGORIES)} categories:", by_cat)


if __name__ == "__main__":
    main()
