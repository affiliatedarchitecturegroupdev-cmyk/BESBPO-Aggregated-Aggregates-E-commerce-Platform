"""Range depth: adds the sizes, lengths and types each department is missing (docs/pricing/RANGE_DEPTH.md).

    python3 scripts/catalogue/range_depth.py && python3 scripts/public-catalogues.py

Adds products to the existing catalogues in services/pricing/data without touching what's there. Every new
product is cloned from a product of the same kind in the same category (so each catalogue's fields stay
exactly as its code expects) and is quote-only: the size or type is one South African builders' merchants
stock (Builders' catalogue and product search, Cashbuild listings), but price, make and availability are
confirmed with the supplier. Prices are added later, as benchmarks are gathered, under PRICING_POLICY.md.

Re-running is safe: products this script owns are removed and re-added.
"""
import copy
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "services/pricing/data"
CHECKED = "checked 2026-10-18"
QUOTED = "Quote-only — no retail benchmark"
SOURCE = (
    "Range depth: a size or type South African builders' merchants stock (Builders catalogue and product search, "
    f"Cashbuild listings, {CHECKED}). Make, price and availability are confirmed with the supplier on the quote."
)

FILES = {
    "masonry": "masonry_catalogue.json",
    "supplies": "supplies_catalogue.json",
    "roofing": "roofing_catalogue.json",
    "steel": "steel_catalogue.json",
    "packaged": "b2b_packaged_catalogue.json",
}
INDENT = {"supplies": 2}  # each file keeps its own layout (the rest use 1)
CATS = {k: json.loads((DATA / f).read_text(encoding="utf-8")) for k, f in FILES.items()}
OWNED = "range-depth-2026-10"  # marks products this script owns
ADDED: dict[str, list] = {k: [] for k in FILES}


def slug(name):
    s = name.lower().replace("×", "x").replace("&", "and").replace("µ", "u").replace("°", "-deg").replace("²", "2").replace("³", "3")
    s = re.sub(r"(\d)\.(\d)", r"\1-\2", s)
    s = re.sub(r"(\d),(\d)", r"\1-\2", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def template(cat, sku):
    for p in CATS[cat]["products"]:
        if p["sku"] == sku:
            return p
    raise KeyError(f"{cat}: no template {sku}")


def quote_unit(base_unit, code=None, label=None):
    u = copy.deepcopy(base_unit)
    if code:
        u["unit"] = code
    if label:
        u["unit_label"] = label
    for k in ("market_benchmark_price", "cost_per_unit", "list_price_per_unit"):
        if k in u:
            u[k] = None
    if "weight_kg" in u and code:
        u["weight_kg"] = None
    u["pricing_status"] = QUOTED
    u["source_note"] = SOURCE
    return u


# Typical uses for a new product when the call doesn't give its own: the category's, not the template's
# (a template's uses are specific to it — a bolster's aren't a tape measure's).
CAT_USES = {
    "bricks-blocks": ["Load-bearing and boundary walls", "Houses, outbuildings and site buildings"],
    "lintels-dpc-wall-accessories": ["Over door and window openings", "Damp-proofing and ventilating brick walls"],
    "paving-kerbs-edging": ["Driveways, patios and paths", "Estate roads and parking areas"],
    "retaining-erosion-control": ["Retaining walls and terraces", "Slope and channel protection"],
    "pipes-fittings": ["House and site drainage", "Connections to municipal sewers and stormwater"],
    "precast-drainage": ["Site and road stormwater", "Sewer and stormwater manholes"],
    "geosynthetics-membranes": ["Roads, drains and retaining walls", "Under floor slabs and on site"],
    "concrete-roof-tiles": ["Pitched tiled roofs", "Re-roofing and extensions"],
    "doors-frames": ["New builds, alterations and replacements", "Houses, flats and offices"],
    "windows-frames": ["Houses, outbuildings and site buildings", "Standard-size openings in brick and block walls"],
    "fencing-wire-posts": ["Boundary, security and farm fencing", "Site and temporary fencing"],
    "gates-security": ["Driveway and pedestrian access", "Home and business security"],
    "water-tanks-geysers": ["Water storage and hot water", "Homes, schools, farms and sites"],
    "water-supply-soil-pipe": ["Water supply, drainage and plumbing", "New builds and repairs"],
    "ceilings-drywall": ["Ceilings and drywall partitions", "Homes, offices and shop fit-outs"],
    "site-tools": ["Bricklaying, plastering and general site work", "Contractors and DIY"],
    "ppe-site-safety": ["Site safety and OHS Act compliance", "Contractors' and workers' protective equipment"],
    "waterproofing-sealants": ["Roofs, parapets and wet areas", "Foundations and below-ground walls"],
    "paint-coatings": ["Painting, protecting and maintaining buildings", "New builds and repaints"],
    "roof-flashings-fixings": ["Finishing and fixing sheeted roofs", "Ridges, edges and roof-to-wall junctions"],
    "roof-insulation-rainwater": ["Roof insulation and rainwater", "New roofs and retrofits"],
    "structural-steel": ["Steel structures, frames and fabrication", "Gates, burglar bars and brackets"],
    "steel-fixing-accessories": ["Reinforced concrete work", "Fixing and anchoring on site"],
    "mortars-grouts-admixtures": ["Tiling, plastering, screeds and concrete work", "Repairs and specialist concrete"],
}


def add(cat, tpl_sku, sku, name, desc, *, units=None, uses=None, handling=None, standard=None, **fields):
    """A product cloned from tpl_sku. units: [(code, label)] — default: the template's first unit."""
    t = template(cat, tpl_sku)
    p = copy.deepcopy(t)
    p.update({"sku": sku, "slug": slug(name), "name": name, "description": desc})
    if standard is not None:
        p["grading_standard"] = standard
    p["typical_uses"] = uses if uses is not None else CAT_USES[p["category_slug"]]
    if "unit_size" in p and "unit_size" not in fields:
        p["unit_size"] = None  # never inherit the template's size
    if handling is not None:
        p["handling_notes"] = handling
    for k in ("manufacturer", "brand"):
        if k in p:
            p[k] = None
    if "specialist_characteristics" in p:
        p["specialist_characteristics"] = []
    for k, v in fields.items():
        p[k] = v
    base = t["units"][0]
    p["units"] = [quote_unit(base, c, l) for c, l in units] if units else [quote_unit(base)]
    p["_range"] = OWNED
    ADDED[cat].append(p)
    return p


def per_m2(size):
    """Units per m² of single-leaf wall face with 10 mm joints, from a "length × width × height mm" size (as the masonry line counts them)."""
    length, _, height = (int(x) for x in size.replace(" mm", "").split(" × "))
    return round(1_000_000 / ((length + 10) * (height + 10)), 1)


def mm(n):
    return f"{n / 1000:.1f} m"


# =============================================================================================
# Masonry & precast (masonry_catalogue.json)
# =============================================================================================
LINTEL_USES = ["Over door and window openings", "Garage and wide openings (longer lengths)"]
for length in (900, 2100, 2700, 3300, 3900, 4200, 4500, 4800, 5100, 5400, 6000, 6600):
    add("masonry", "AA-MAS-LINTEL-1200", f"AA-MAS-LINTEL-{length}", f"Prestressed Concrete Lintel {mm(length)}",
        f"Precast prestressed concrete lintel, {mm(length)} long, in the standard single-leaf section (about 110 × 75 mm) — "
        "one per 110 mm brick leaf, with the end bearing and opening span the maker's span table allows.",
        unit_size=f"{mm(length)} long", uses=LINTEL_USES)
for length in (1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300, 3600, 4200, 4800, 5400, 6000):
    add("masonry", "AA-MAS-LINTEL-1200", f"AA-MAS-LINTEL-MAXI-{length}", f"Maxi Prestressed Concrete Lintel 140 mm, {mm(length)}",
        f"Prestressed concrete lintel in the wider maxi section (about 140 × 75 mm), {mm(length)} long — for walls built in "
        "maxi bricks (290 × 140 × 90 mm) and 140 mm blockwork.",
        unit_size=f"{mm(length)} long, 140 mm wide", uses=["Over openings in maxi-brick and 140 mm block walls"])
for length in (1500, 1800, 2700, 3600, 4200, 5100, 6000):
    add("masonry", "AA-MAS-LINTEL-1200", f"AA-MAS-LINTEL-150-{length}", f"Wide Prestressed Concrete Lintel 150 mm, {mm(length)}",
        f"Prestressed concrete lintel, about 150 × 75 mm, {mm(length)} long — the wider section for thicker leaves and "
        "heavier loads, to the maker's span table.", unit_size=f"{mm(length)} long, 150 mm wide", uses=LINTEL_USES)
for length in (1200, 1800, 2100, 2400, 2700, 3000, 3600, 4200, 4800):
    add("masonry", "AA-MAS-LINTEL-1200", f"AA-MAS-LINTEL-BLOCK-{length}", f"Precast Concrete Block Lintel 140 mm, {mm(length)}",
        f"Precast reinforced concrete lintel made for concrete-block walls, about 140 mm wide, {mm(length)} long — sized "
        "to sit in the block coursing over doors and windows.", unit_size=f"{mm(length)} long", masonry_class="Block lintel",
        uses=["Over openings in concrete-block walls", "Outbuildings, boundary walls and low-cost housing"])
for width, roll in ((450, 40), (600, 40)):
    add("masonry", "AA-MAS-DPC-110", f"AA-MAS-DPC-{width}", f"Damp-Proof Course 375 µm, {width} mm × {roll} m",
        f"Embossed polyethylene damp-proof course, 375 µm, {width} mm wide in a {roll} m roll — for cavity walls, sills and "
        "wide leaves.", unit_size=f"{width} mm × {roll} m roll")

BRICK_HANDLING = "Stack on a level, firm base, close to where they're laid; keep face bricks covered so they stay clean."
for sku, name, cls, desc in (
    ("AA-MAS-BRK-FBA", "Clay Face Brick (FBA) 222 × 106 × 73 mm", "Clay face brick (FBA)",
     "Clay face brick in the aesthetic FBA grade — chosen for its texture and colour variation, for feature and boundary walls. Colour range confirmed on the quote."),
    ("AA-MAS-BRK-SATIN", "Clay Satin Face Brick (FBS) 222 × 106 × 73 mm", "Clay face brick (FBS)",
     "Smooth satin-finish clay face brick, FBS grade, for clean-lined facades. Colour (light, dark, multi-tone) confirmed on the quote."),
    ("AA-MAS-BRK-TRAV", "Clay Travertine Face Brick (FBS) 222 × 106 × 73 mm", "Clay face brick (FBS)",
     "Travertine-textured clay face brick, FBS grade — the most common face finish on SA houses. Colour range confirmed on the quote."),
    ("AA-MAS-BRK-RUSTIC", "Clay Rustic Face Brick (FBS) 222 × 106 × 73 mm", "Clay face brick (FBS)",
     "Rustic, textured clay face brick for walls left unplastered. Colour range confirmed on the quote."),
    ("AA-MAS-BRK-NFX", "Clay Foundation Brick (NFX) 222 × 106 × 73 mm", "Clay stock brick (NFX)",
     "Non-facing extra (NFX) clay brick — the harder stock brick for foundations, below-ground work and damp conditions."),
    ("AA-MAS-BRK-SEMIFACE", "Clay Semi-Face Brick 222 × 106 × 73 mm", "Clay semi-face brick",
     "Semi-face clay brick — a consistent stock brick neat enough to leave unplastered on outbuildings and boundary walls."),
    ("AA-MAS-BRK-PLASTER", "Clay Plaster Brick (Yard) 222 × 106 × 73 mm", "Clay plaster brick",
     "Economical clay plaster brick for walls that will be plastered."),
):
    add("masonry", "AA-MAS-CLAY-FBS", sku, name, desc, masonry_class=cls, handling=BRICK_HANDLING, unit_size="222 × 106 × 73 mm",
        uses=["Face-brick houses, boundary and feature walls"] if "Face" in name else ["Foundations, plastered walls and outbuildings"])
add("masonry", "AA-MAS-CLAY-FBS", "AA-MAS-BRK-CLADDING", "Clay Brick Cladding Tile 222 × 73 × 9 mm",
    "Thin clay brick slips (about 9 mm) glued to plastered or concrete walls for a face-brick look — feature walls, columns and renovations.",
    masonry_class="Brick cladding", unit_size="222 × 9 × 73 mm", units_per_m2=per_m2("222 × 9 × 73 mm"))
for mpa in (7, 14):
    add("masonry", "AA-MAS-CEM-IMPERIAL", f"AA-MAS-CEM-STOCK-{mpa}MPA", f"Cement Stock Brick {mpa} MPa 222 × 106 × 73 mm",
        f"Concrete (cement) stock brick, {mpa} MPa nominal strength{' — the stronger brick for load-bearing and foundation work' if mpa == 14 else ''}.",
        masonry_class="Cement stock brick", unit_size="222 × 106 × 73 mm")
for code, name, size, desc in (
    ("AA-MAS-BLOCK-90-HOLLOW", "Hollow Concrete Block 90 mm (390 × 90 × 190 mm)", "390 × 90 × 190 mm", "Hollow 90 mm concrete block for internal partitions and boundary walls."),
    ("AA-MAS-BLOCK-140-SOLID", "Solid Concrete Block 140 mm (390 × 140 × 190 mm)", "390 × 140 × 190 mm", "Solid 140 mm concrete block for load-bearing walls and foundations."),
    ("AA-MAS-BLOCK-190-SOLID", "Solid Concrete Block 190 mm (390 × 190 × 190 mm)", "390 × 190 × 190 mm", "Solid 190 mm concrete block for heavy load-bearing and retaining work."),
    ("AA-MAS-BLOCK-140-HALF", "Half Concrete Block 140 mm (190 × 140 × 190 mm)", "190 × 140 × 190 mm", "Half-length 140 mm block to finish courses at corners, ends and openings without cutting."),
    ("AA-MAS-BLOCK-140-U", "Concrete Lintel (U) Block 140 mm", "390 × 140 × 190 mm", "U-shaped 140 mm block that's filled with reinforcement and concrete to form bond beams and lintels in block walls."),
    ("AA-MAS-BLOCK-190-U", "Concrete Lintel (U) Block 190 mm", "390 × 190 × 190 mm", "U-shaped 190 mm block for reinforced bond beams and lintels."),
    ("AA-MAS-BLOCK-140-FAIR", "Fair-Face Concrete Block 140 mm", "390 × 140 × 190 mm", "Fair-face (smooth, even-coloured) 140 mm block to leave unplastered."),
):
    add("masonry", "AA-MAS-BLOCK-140", code, name, desc, unit_size=size, units_per_m2=per_m2(size))

PAVER_HANDLING = "Lay on a compacted base and 25–30 mm of bedding sand; vibrate in and brush jointing sand into the joints."
for colour in ("Charcoal", "Red", "Terracotta", "Tan"):
    add("masonry", "AA-PAV-BEVEL-50", f"AA-PAV-BEVEL-50-{colour.upper()}", f"Bevel Paver, {colour}, 50 mm (200 × 100 mm)",
        f"Bevelled-edge concrete paver, 50 mm, {colour.lower()} — patios, paths and light-traffic driveways.", handling=PAVER_HANDLING,
        unit_size="200 × 100 × 50 mm")
for colour in ("Charcoal", "Red"):
    add("masonry", "AA-PAV-INTERLOCK-60", f"AA-PAV-INTERLOCK-60-{colour.upper()}", f"Interlocking Paver, {colour}, 60 mm",
        f"Interlocking concrete paver, 60 mm, {colour.lower()} — driveways and parking for cars.", handling=PAVER_HANDLING, unit_size="60 mm thick")
for colour in ("Charcoal", "Red"):
    add("masonry", "AA-PAV-INTERLOCK-80", f"AA-PAV-INTERLOCK-80-{colour.upper()}", f"Interlocking Paver, {colour}, 80 mm (heavy duty)",
        f"Heavy-duty 80 mm interlocking concrete paver, {colour.lower()} — trucks, loading areas and municipal roads.", handling=PAVER_HANDLING,
        unit_size="80 mm thick")
for thick in (50, 73):
    add("masonry", "AA-PAV-CLAY", f"AA-PAV-CLAY-{thick}", f"Clay Paver {thick} mm (200 × 100 mm)",
        f"Fired clay paver, {thick} mm{' — heavier duty for driveways' if thick == 73 else ''}. Colour and finish (smooth, bevelled, rustic) confirmed on the quote.",
        handling=PAVER_HANDLING)
for size in ("300 × 300 × 50", "400 × 400 × 50", "500 × 500 × 50", "450 × 450 × 40 (non-slip)"):
    s = size.split(" (")[0]
    add("masonry", "AA-PAV-SLAB-450", f"AA-PAV-SLAB-{slug(s).upper()}", f"Paving Slab, Grey, {size} mm",
        f"Concrete paving slab, {size} mm — patios, pool surrounds and garden paths.", handling=PAVER_HANDLING, units_per_m2=None, unit_size=f"{s} mm")
for size in ("225 × 225 × 40", "300 × 300 × 40", "450 × 225 × 40", "330 × 330 × 50"):
    add("masonry", "AA-PAV-SLAB-450", f"AA-PAV-GARDEN-{slug(size).upper()}", f"Garden Paver {size} mm",
        f"Textured concrete garden paver (flagstone / sandstone finish), {size} mm, for paths and patios. Colour confirmed on the quote.",
        handling=PAVER_HANDLING, units_per_m2=None, unit_size=f"{size} mm")
add("masonry", "AA-PAV-SLAB-450", "AA-PAV-COBBLE", "Cobble Paver (Old-World Finish)",
    "Tumbled, aged-look concrete cobble paver for driveways and courtyards. Size and colour confirmed on the quote.", handling=PAVER_HANDLING, units_per_m2=None)
add("masonry", "AA-PAV-SLAB-450", "AA-PAV-STEPPING", "Stepping Stone (Round or Square)",
    "Concrete stepping stone for lawns and gardens. Shape, size and finish confirmed on the quote.", handling=PAVER_HANDLING, units_per_m2=None)
KERB_HANDLING = "Set on a concrete bed and haunch the back; joint with mortar."
for code, name, desc in (
    ("AA-PAV-KERB-MOUNT", "Concrete Kerb, Mountable, 1,000 mm", "Mountable (rollover) precast concrete kerb for driveway crossings and residential roads."),
    ("AA-PAV-KERB-SEMI", "Concrete Kerb, Semi-Mountable, 1,000 mm", "Semi-mountable precast concrete kerb for estate roads and parking islands."),
    ("AA-PAV-KERB-CHANNEL", "Concrete Channel (Gutter) Block, 1,000 mm", "Precast concrete channel laid against the kerb to carry road stormwater."),
    ("AA-PAV-KERB-GARDEN-500", "Garden Edging, Concrete, 500 mm", "Short concrete garden edging for lawns, beds and paving edges."),
    ("AA-PAV-KERB-GARDEN-150", "Concrete Garden Kerb 1000 × 65/75 × 150 mm", "Light concrete kerb for paths, driveways and paving edges."),
):
    add("masonry", "AA-PAV-ROAD-KERB", code, name, desc, handling=KERB_HANDLING, unit_size="500 mm long" if "500" in name else "1,000 mm long")

for code, name, desc in (
    ("AA-RET-L11", "Terraforce L11 Retaining Block", "Terraforce L11 open-face concrete retaining block, the smaller sibling of the L22, for lower plantable walls and terraces."),
    ("AA-RET-4X4", "Terraforce 4x4 Retaining Block", "Terraforce 4x4 trapezoidal retaining block for steeper, closed-face walls."),
    ("AA-RET-VR18-SMOOTH", "Gravity Retaining Block, Smooth Face (about 300 × 175 × 180 mm)", "Solid concrete gravity retaining-wall block with a smooth face, built dry and stepped back. Colour confirmed on the quote."),
    ("AA-RET-VR18-ROCK", "Gravity Retaining Block, Rock Face (about 300 × 175 × 180 mm)", "Solid concrete gravity retaining-wall block with a split rock face. Colour confirmed on the quote."),
):
    add("masonry", "AA-RET-TERRAFORCE-L22", code, name, desc)
for size in ("1 × 1 × 1 m", "1.5 × 1 × 1 m", "2 × 1 × 0.5 m", "3 × 1 × 1 m", "4 × 1 × 1 m"):
    add("masonry", "AA-RET-GABION-BASKET", f"AA-RET-GABION-{slug(size).upper()}", f"Gabion Basket {size}",
        f"Galvanised (or PVC-coated) woven-mesh gabion basket, {size}, filled on site with rock. Mesh and wire coating confirmed on the quote.",
        unit_size=size)
for size in ("3 × 2 × 0.23 m", "4 × 2 × 0.3 m", "6 × 2 × 0.3 m"):
    add("masonry", "AA-RET-GABION-MATTRESS", f"AA-RET-RENO-{slug(size).upper()}", f"Gabion Mattress (Reno) {size}",
        f"Woven-mesh gabion mattress, {size}, for channel and slope protection.", unit_size=size)

PIPE_HANDLING = "Bed and surround the pipe in selected bedding material, lay to the drawn fall and test before backfilling."
for code, name, desc in (
    ("AA-DRN-PIPE-110-CL34", "uPVC Sewer Pipe 110 mm × 6 m (Class 34)", "Solid-wall uPVC underground sewer pipe, 110 mm, Class 34 — the standard house drain."),
    ("AA-DRN-PIPE-160-CL34", "uPVC Sewer Pipe 160 mm × 6 m (Class 34)", "uPVC underground sewer pipe, 160 mm, Class 34 — main drains and connections to the municipal sewer."),
    ("AA-DRN-PIPE-200-CL34", "uPVC Sewer Pipe 200 mm × 6 m (Class 34)", "uPVC underground sewer pipe, 200 mm, for estate and complex reticulation."),
    ("AA-DRN-PIPE-250-CL34", "uPVC Sewer Pipe 250 mm × 6 m (Class 34)", "uPVC underground sewer pipe, 250 mm, for bulk sewer lines."),
    ("AA-DRN-PIPE-160-PERF", "Perforated Subsoil Drain Pipe 160 mm × 6 m", "Perforated subsoil drainage pipe, 160 mm, for larger French drains and field drainage."),
    ("AA-DRN-PIPE-110-FLEX-PERF", "Flexible Perforated Drain Pipe 110 mm (coil)", "Corrugated flexible perforated drain pipe in a coil, wrapped or unwrapped in geotextile — garden and retaining-wall drainage."),
):
    add("masonry", "AA-DRN-PIPE-UG-110", code, name, desc, handling=PIPE_HANDLING, unit_size="coil" if "coil" in name else name.split("Pipe ")[1].split(" (")[0])
for size in (110, 160):
    for kind, label in (("BEND-11", "Bend 11.25°"), ("BEND-22", "Bend 22.5°"), ("JUNC-87", "Junction 87.5°"), ("COUPLER", "Coupler (double socket)"),
                        ("IE", "Inspection Eye (access fitting)"), ("PLUG", "End Plug")):
        if size == 110 and kind in ():
            continue
        add("masonry", "AA-DRN-BEND-110-45", f"AA-DRN-FIT-{size}-{kind}", f"Underground {label} {size} mm",
            f"uPVC underground drainage fitting, {label.lower()}, {size} mm, to match Class 34 sewer pipe.", handling=PIPE_HANDLING)
for code, name, desc in (
    ("AA-DRN-FIT-160-BEND-45", "Underground Bend 160 mm × 45°", "uPVC underground bend, 160 mm × 45°."),
    ("AA-DRN-FIT-160-BEND-87", "Underground Bend 160 mm × 87.5°", "uPVC underground bend, 160 mm × 87.5°."),
    ("AA-DRN-FIT-160-JUNC-45", "Underground Junction 160 mm × 45°", "uPVC underground junction, 160 mm × 45°."),
    ("AA-DRN-FIT-160X110-REDUCER", "Underground Reducer 160 × 110 mm", "uPVC reducer to join a 110 mm branch to a 160 mm drain."),
    ("AA-DRN-FIT-110-GULLY", "Gully (Yard Trap) 110 mm", "uPVC gully with a water-seal trap to take sink, shower and yard water into the drain."),
    ("AA-DRN-FIT-110-GULLY-HEAD", "Gully Head & Grid 110 mm", "Raising piece and grid for a 110 mm gully."),
    ("AA-DRN-FIT-110-VENT-VALVE", "Air Admittance (Vent) Valve 110 mm", "Air admittance valve that ventilates a drain stack inside the roof space."),
    ("AA-DRN-FIT-110-SADDLE", "Saddle Junction 160 × 110 mm", "Saddle fitting to connect a new 110 mm branch to an existing 160 mm drain."),
):
    add("masonry", "AA-DRN-BEND-110-45", code, name, desc, handling=PIPE_HANDLING)

DRAIN_HANDLING = "Lift with suitable equipment; lay on a prepared bed to the engineer's levels and joint as specified."
for dia in (375, 525, 750, 900, 1050, 1200):
    add("masonry", "AA-PRC-CONC-PIPE-300", f"AA-PRC-CONC-{dia}", f"Concrete Pipe {dia} mm",
        f"Precast concrete stormwater / culvert pipe, {dia} mm internal diameter. Class (load rating), joint type and length confirmed on the quote.",
        handling=DRAIN_HANDLING, unit_size=f"{dia} mm diameter")
for dia in (750, 1250, 1500):
    add("masonry", "AA-PRC-MANHOLE-RING-1000", f"AA-PRC-MH-RING-{dia}", f"Manhole Ring {dia:,} mm",
        f"Precast concrete manhole ring, {dia:,} mm internal diameter. Height confirmed on the quote.", handling=DRAIN_HANDLING, unit_size=f"{dia:,} mm diameter")
for code, name, desc in (
    ("AA-PRC-MH-COVER-LD", "Manhole Cover & Frame, Light Duty (pedestrian)", "Light-duty manhole cover and frame for gardens and footpaths. Material (concrete, composite or cast iron) confirmed on the quote."),
    ("AA-PRC-MH-COVER-HD", "Manhole Cover & Frame, Heavy Duty (traffic)", "Heavy-duty manhole cover and frame rated for vehicle traffic."),
    ("AA-PRC-MH-COVER-SLAB", "Manhole Cover Slab", "Precast reinforced concrete cover slab with an access opening, to top a manhole ring."),
    ("AA-PRC-MH-BASE", "Manhole Base / Benching Unit", "Precast manhole base so the chamber needn't be cast in situ."),
    ("AA-PRC-SUMP", "Precast Catch Pit / Sump", "Precast concrete catch pit to collect stormwater and silt."),
    ("AA-PRC-KERB-INLET", "Kerb Inlet Unit", "Precast kerb inlet that takes road stormwater into the drain."),
    ("AA-PRC-GRID-INLET", "Grid Inlet with Grating", "Precast inlet with a grating for parking areas and yards."),
    ("AA-PRC-CHANNEL-HD", "Channel Drain with Grate, Heavy Duty, 1 m", "Heavy-duty channel drain with a ductile-iron or galvanised grate for driveways and loading areas."),
    ("AA-PRC-CHANNEL-150", "Channel Drain 150 mm Wide with Grate, 1 m", "Wider 150 mm channel drain for larger paved areas."),
    ("AA-PRC-CHANNEL-PIT", "Channel Drain Sump / Outlet Unit", "Outlet pit that connects a channel-drain run to the underground drain."),
    ("AA-PRC-U-DRAIN", "Precast U-Drain Section", "Open precast U-channel for site and farm stormwater."),
    ("AA-PRC-HEADWALL", "Precast Culvert Headwall", "Precast headwall for the inlet or outlet of a pipe culvert."),
):
    add("masonry", "AA-PRC-MANHOLE-COVER", code, name, desc, handling=DRAIN_HANDLING)

for code, name, desc, tpl in (
    ("AA-GEO-NW-A4", "Nonwoven Geotextile, Medium Grade (A4-type)", "Medium-weight nonwoven needle-punched geotextile for separation and filtration under roads and drains.", "AA-GEO-NONWOVEN-A2"),
    ("AA-GEO-NW-A6", "Nonwoven Geotextile, Heavy Grade (A6-type)", "Heavy-weight nonwoven geotextile for protection layers and heavy-duty separation.", "AA-GEO-NONWOVEN-A2"),
    ("AA-GEO-WOVEN", "Woven Geotextile (Stabilisation)", "Woven polypropylene geotextile for ground stabilisation under fill and roads.", "AA-GEO-NONWOVEN-A2"),
    ("AA-GEO-GEOCELL", "Geocell (Cellular Confinement)", "Expanding honeycomb cells filled with soil or stone to stabilise slopes and access roads.", "AA-GEO-GEOGRID"),
    ("AA-GEO-EROSION", "Erosion Control Blanket", "Biodegradable or synthetic blanket that holds topsoil and seed on slopes until grass takes.", "AA-GEO-GEOGRID"),
    ("AA-GEO-DRAIN-COMP", "Drainage Composite (Cuspated Sheet)", "Dimpled drainage sheet with a filter fabric behind retaining and basement walls.", "AA-GEO-GEOGRID"),
    ("AA-GEO-DPM-375", "Damp-Proof Membrane 375 µm", "Heavier 375 µm polyethylene damp-proof membrane under surface beds. Roll size confirmed on the quote.", "AA-GEO-DPM-250"),
    ("AA-GEO-DPM-150", "Construction Film 150 µm", "Lighter polyethylene sheeting for covering, curing and protection on site.", "AA-GEO-DPM-250"),
):
    add("masonry", tpl, code, name, desc)

for code, name, desc, tpl in (
    ("AA-TIL-DR-BLACK", "Concrete Roof Tile, Double Roman — Black", "Double Roman concrete roof tile in black.", "AA-TIL-DOUBLE-ROMAN"),
    ("AA-TIL-DR-TERRACOTTA", "Concrete Roof Tile, Double Roman — Terracotta", "Double Roman concrete roof tile in terracotta.", "AA-TIL-DOUBLE-ROMAN"),
    ("AA-TIL-DR-ANTIQUE", "Concrete Roof Tile, Double Roman — Antique Finish", "Double Roman concrete roof tile in an antique (aged) finish. Shade confirmed on the quote.", "AA-TIL-DOUBLE-ROMAN"),
    ("AA-TIL-SLATE", "Concrete Roof Tile, Slate Profile", "Flat slate-profile concrete roof tile. Colour confirmed on the quote.", "AA-TIL-FLAT"),
    ("AA-TIL-SLATE-ANTIQUE", "Concrete Roof Tile, Slate Profile — Antique Finish", "Slate-profile concrete roof tile in an antique finish.", "AA-TIL-FLAT"),
    ("AA-TIL-RIDGE-V", "Concrete Ridge Tile, V-Shaped", "V-shaped concrete ridge tile.", "AA-TIL-RIDGE"),
    ("AA-TIL-RIDGE-TAPER", "Concrete Ridge Tile, Tapered (Half-Round)", "Tapered half-round concrete ridge tile.", "AA-TIL-RIDGE"),
    ("AA-TIL-HIP-STARTER", "Concrete Hip Starter Tile", "Hip starter (end) tile that closes the bottom of a hip ridge.", "AA-TIL-RIDGE"),
    ("AA-TIL-RIDGE-END", "Concrete Ridge End (Gable) Tile", "Closed ridge-end tile for gable ends.", "AA-TIL-RIDGE"),
    ("AA-TIL-VERGE", "Concrete Verge Tile", "Verge tile that finishes the roof edge at a gable.", "AA-TIL-RIDGE"),
    ("AA-TIL-VENT", "Roof Tile Vent", "Ventilation tile to air the roof space, matched to the tile profile.", "AA-TIL-RIDGE"),
    ("AA-TIL-CLIPS", "Roof Tile Clips & Nails (box)", "Tile clips and nails that hold tiles down in high-wind areas, matched to the profile.", "AA-TIL-RIDGE"),
):
    add("masonry", tpl, code, name, desc, **({"unit_size": "About 420 × 330 mm"} if "Double Roman" in name else {}))


# =============================================================================================
# Building supplies (supplies_catalogue.json)
# =============================================================================================
STEEL_WINDOWS = [
    # Builders' fenestration catalogue: steel window frames, FX7 profile (width × height in mm).
    ("NC1", 533, 949), ("NC2", 1022, 949), ("NC4", 1511, 949), ("NC11", 2000, 949),
    ("NE11", 2000, 654), ("NG2", 1022, 359), ("ND2", 1022, 1245), ("ND7", 1022, 1245), ("ND4", 1511, 1245),
    ("ND11", 2000, 1245), ("ND11F", 2000, 1245), ("ND511", 2000, 1540), ("ND511F", 2000, 1540),
    ("E1", 533, 654), ("E2", 1022, 659), ("C1", 533, 949), ("C22", 2000, 949), ("D1", 533, 1245), ("D4", 1511, 1245),
    ("D22", 2000, 1245), ("D522", 2000, 1540),
]
for code, w, h in STEEL_WINDOWS:
    add("supplies", "AA-WIN-STL-NE1", f"AA-WIN-STL-{code}", f"Steel Window Frame {code} FX7",
        f"Standard {code} steel window in the FX7 profile, {w} × {h} mm, red-oxide primed and ready to build in. The pane and opening "
        "layout is the maker's standard drawing for the type; handing (left / right) and glazing are confirmed on the quote.",
        unit_size=f"{w} × {h} mm", standard="SANS 727 steel window, FX7 profile, red oxide primed")

WOOD_WINDOWS = [
    # Builders' fenestration catalogue: hardwood windows (width × height in mm).
    ("WD1", 584, 584), ("WC1", 584, 887), ("WC1F", 584, 887), ("WC1SP", 584, 887), ("WC2", 1128, 887), ("WC22", 1128, 887),
    ("WC2SP", 1128, 887), ("WC22SP", 1128, 887), ("WC3", 1672, 887), ("WC3SP", 1672, 887), ("WD22SP", 1128, 584), ("WD3", 1672, 584),
    ("WB22SP", 1128, 1187), ("WB3", 1672, 1187), ("WB4SP", 2216, 1187), ("WA1", 584, 1487), ("WA1SP", 584, 1487), ("WA22", 1128, 1487),
    ("WA3SP", 1672, 1487), ("WA4", 2216, 1487), ("WA4SP", 2216, 1487), ("WF1", 937, 887),
]
WOOD_HANDLING = "Seal all faces before fitting and protect from plaster and weather; re-seal yearly on exposed walls."
for code, w, h in WOOD_WINDOWS:
    add("supplies", "AA-WIN-STL-NE1", f"AA-WIN-WOOD-{code}", f"Wooden Window {code}",
        f"Standard {code} hardwood window, {w} × {h} mm, with galvanised hinges and brass handles and stays as the maker supplies them. "
        "Sashes and fixed lights follow the maker's drawing for the type; handing and glazing are confirmed on the quote.",
        unit_size=f"{w} × {h} mm", standard="Hardwood window frame (kiln-dried tropical hardwood)", handling=WOOD_HANDLING)

ALU_WINDOWS = [(600, 600), (600, 900), (900, 900), (1200, 900), (1200, 1200), (1500, 600), (1500, 1200), (1800, 600), (1800, 1200),
               (1800, 1500), (1800, 1800), (2100, 1800), (600, 1800), (1500, 1800)]
for w, h in ALU_WINDOWS:
    add("supplies", "AA-WIN-ALU-1212", f"AA-WIN-ALU-{w}X{h}", f"Aluminium Window {w} × {h} mm (Top-Hung)",
        f"Standard aluminium top-hung window for a {w} × {h} mm opening, glazed. Colour (bronze, natural, white or charcoal), "
        "vents and clear or obscure glass are confirmed on the quote.", unit_size=f"{w} × {h} mm")
for w, h in ((300, 2100), (600, 2100)):
    add("supplies", "AA-WIN-ALU-1212", f"AA-WIN-ALU-SIDELIGHT-{w}", f"Aluminium Sidelight {w} × {h} mm",
        f"Fixed aluminium sidelight, {w} × {h} mm, beside a front door. Colour and glass confirmed on the quote.", unit_size=f"{w} × {h} mm")
for w, h in ((600, 600), (600, 900), (900, 900)):
    add("supplies", "AA-WIN-ALU-1212", f"AA-WIN-ALU-OBS-{w}X{h}", f"Aluminium Window {w} × {h} mm (Obscure Glass)",
        f"Aluminium top-hung window, {w} × {h} mm, with obscure glass for bathrooms and toilets.", unit_size=f"{w} × {h} mm")

DOOR = "813 × 2032 mm"
for code, name, desc in (
    ("AA-DOR-FLUSH-PRIMED", f"Flush Interior Door, Pre-Primed {DOOR}", "Smooth hardboard-faced flush interior door, pre-primed for painting."),
    ("AA-DOR-MOULDED", f"Moulded-Panel Interior Door {DOOR}", "Hollow-core interior door with deep-moulded panel faces, primed white."),
    ("AA-DOR-CAPE-DUTCH-6L", f"Cape Dutch 6-Light Glazed Door {DOOR}", "Cape Dutch door with six glazed lights, white."),
    ("AA-DOR-COVENTRY-2L", f"2-Light Glazed Interior Door {DOOR}", "Interior door with two glazed lights, white."),
    ("AA-DOR-MEDIUM-DUTY", f"Medium-Duty Interior Door {DOOR}", "Medium-duty (semi-solid) interior door for offices and rentals."),
    ("AA-DOR-SOLID-6P", f"6-Panel Solid Timber Door {DOOR}", "Solid timber six-panel door. Species confirmed on the quote."),
    ("AA-DOR-SOLID-10P", f"10-Panel Solid Timber Door {DOOR}", "Solid timber ten-panel door."),
    ("AA-DOR-MIXED-8P", f"8-Panel Mixed-Timber Door {DOOR}", "Eight-panel door in mixed timber — the economical exterior panel door."),
    ("AA-DOR-HORIZONTAL", f"Horizontal-Slat Exterior Door {DOOR}", "Contemporary horizontal-slat timber door."),
    ("AA-DOR-FIRE", f"Fire Door {DOOR}", "Fire-rated door for garages, plant rooms and escape routes. Rating and certification confirmed on the quote."),
    ("AA-DOR-STABLE-FL", f"Framed & Ledged Stable Door {DOOR}", "Framed and ledged door split into top and bottom leaves (stable door)."),
    ("AA-DOR-STABLE-8P", f"8-Panel Stable Door {DOOR}", "Eight-panel timber stable door."),
    ("AA-DOR-GLASS-18L", f"18-Light Glass Door {DOOR}", "Timber door with eighteen glazed lights for patios and back doors."),
    ("AA-DOR-GLASS-FULL", f"Full-Glass Timber Door {DOOR}", "Timber door with a single full-height glass panel."),
    ("AA-DOR-SECURITY-6P", f"6-Panel Security Door {DOOR}", "Heavy six-panel exterior door with a reinforced core."),
    ("AA-DOR-PIVOT-1200", "Pivot Door 1200 × 2032 mm (Pre-Hung)", "Wide timber pivot front door, pre-hung in its frame. Design and species confirmed on the quote."),
    ("AA-DOR-FOLDING-810", "Folding Service Door 810 × 2030 mm", "PVC concertina folding door for cupboards, laundries and service openings."),
):
    add("supplies", "AA-DOR-HC-813", code, name, desc, unit_size=name.split("Door ")[-1].split(" (")[0] if "mm" in name else None)
for w in (1500, 2100, 2400, 3000):
    add("supplies", "AA-DOR-SLD-ALU-1800", f"AA-DOR-ALU-SLIDE-{w}", f"Aluminium Sliding Door {w} × 2100 mm",
        f"Aluminium sliding patio door, {w} × 2100 mm, glazed. Colour (bronze or natural) and panel layout confirmed on the quote.")
for w in (1800, 2400):
    add("supplies", "AA-DOR-SLD-ALU-1800", f"AA-DOR-WOOD-SLIDE-{w}", f"Wooden Sliding Door {w} × 2132 mm",
        f"Hardwood sliding patio door, {w} × 2132 mm. Handing (left / right) confirmed on the quote.")
add("supplies", "AA-DOR-SLD-ALU-1800", "AA-DOR-GARAGE-ROLLUP-SINGLE", "Roll-Up Garage Door, Single, 2450 × 2100 mm",
    "Single roll-up steel garage door, 2450 × 2100 mm. Colour and finish (galvanised, white, brown) confirmed on the quote; motor optional.",
    handling="Fit into a square, plumb opening on a level floor; motors and their wiring are for a qualified installer.", unit_size="2450 × 2100 mm")
add("supplies", "AA-DOR-SLD-ALU-1800", "AA-DOR-GARAGE-DOUBLE", "Garage Door, Double (to opening size)",
    "Double garage door — roll-up or sectional — made to the opening size. Type, size, colour and motor confirmed on the quote.",
    handling="Fit into a square, plumb opening on a level floor; motors and their wiring are for a qualified installer.")
for code, name, desc in (
    ("AA-DOR-FRM-115-DREB", "Steel Door Frame 813 × 2032 mm (Half-Brick, Double Rebate)", "Heavy-duty double-rebate steel door frame for half-brick (115 mm) walls."),
    ("AA-DOR-FRM-115-STABLE", "Steel Door Frame 813 × 2032 mm (Half-Brick, Stable)", "Steel frame for a stable door in a half-brick (115 mm) wall."),
    ("AA-DOR-FRM-115-COMBI", "Steel Combi Door Frame 813 × 2032 mm (115 mm)", "Steel combi frame for a door with a fanlight, half-brick wall. Opening in or out confirmed on the quote."),
    ("AA-DOR-FRM-140", "Steel Door Frame 813 × 2032 mm (140 mm wall)", "Steel door frame for 140 mm (maxi-brick or block) walls."),
    ("AA-DOR-FRM-ECONOMY", "Steel Door Frame 813 × 2032 mm (Economy Duty)", "Lighter economy-duty steel door frame for internal half-brick walls."),
    ("AA-DOR-FRM-WOOD-76", "Hardwood Door Frame 813 × 2032 mm (76 × 38 mm)", "Hardwood door frame, 76 × 38 mm section, no sill."),
    ("AA-DOR-FRM-WOOD-90", "Hardwood Door Frame 813 × 2032 mm (90 × 55 mm)", "Heavier hardwood door frame, 90 × 55 mm section, no sill."),
    ("AA-DOR-FRM-WOOD-SILL", "Hardwood Door Frame with Sill 813 × 2032 mm", "Hardwood exterior door frame with a sill. Opening in or out confirmed on the quote."),
    ("AA-DOR-FRM-WOOD-1210", "Hardwood Double Door Frame 1210 × 2032 mm", "Hardwood frame for a pair of doors or a wide door, 1210 mm."),
    ("AA-DOR-FRM-WOOD-1612", "Hardwood Double Door Frame 1612 × 2032 mm", "Hardwood frame for a pair of doors, 1612 mm."),
    ("AA-DOR-FRM-DRYWALL", "Drywall Door Frame Kit", "Door frame kit made for drywall (stud) partitions."),
):
    add("supplies", "AA-DOR-FRM-STL-115", code, name, desc)

FENCE_HANDLING = "Strain mesh and wire between well-anchored straining posts; set posts in concrete at the corners and gates."
for h in (900, 1500, 2100, 2400):
    add("supplies", "AA-FEN-DMESH-1200", f"AA-FEN-DIAMOND-{h}", f"Diamond Mesh Fencing {h / 1000:.1f} m × 30 m",
        f"Galvanised diamond-mesh fencing, {h / 1000:.1f} m high, 30 m roll. Aperture and wire gauge (or PVC coating) confirmed on the quote.",
        handling=FENCE_HANDLING)
for h in (1200, 1800):
    add("supplies", "AA-FEN-DMESH-1200", f"AA-FEN-DIAMOND-PVC-{h}", f"Diamond Mesh Fencing, PVC-Coated, {h / 1000:.1f} m × 30 m",
        f"Green PVC-coated diamond-mesh fencing, {h / 1000:.1f} m high, 30 m roll — longer-lasting at the coast.", handling=FENCE_HANDLING)
for h in (900, 1200, 1800):
    add("supplies", "AA-FEN-DMESH-1200", f"AA-FEN-NETTING-{h}", f"Hexagonal Wire Netting {h / 1000:.1f} m × 50 m",
        f"Galvanised hexagonal (chicken) wire netting, {h / 1000:.1f} m high — poultry runs, gardens and plaster lath. Aperture confirmed on the quote.",
        handling=FENCE_HANDLING)
for h in (1200, 1800):
    add("supplies", "AA-FEN-DMESH-1200", f"AA-FEN-WELDED-{h}", f"Welded Mesh Fencing {h / 1000:.1f} m × 30 m",
        f"Galvanised welded-mesh fencing roll, {h / 1000:.1f} m high, for boundaries and animal enclosures.", handling=FENCE_HANDLING)
for h in (1800, 2100, 2400):
    add("supplies", "AA-FEN-PAL-1830", f"AA-FEN-CLEARVU-{h}", f"Clear-View Mesh Fence Panel {h / 1000:.1f} m",
        f"Anti-climb, anti-cut clear-view (358-type) welded mesh panel, {h / 1000:.1f} m high, with posts and clamps to suit. Finish confirmed on the quote.",
        handling=FENCE_HANDLING)
for h in (2100, 2400):
    add("supplies", "AA-FEN-PAL-1830", f"AA-FEN-PAL-PANEL-{h}", f"Palisade Fence Panel {h / 1000:.1f} × 3.0 m",
        f"Steel palisade fence panel, {h / 1000:.1f} m high × 3.0 m, galvanised or primed. Pale profile (W or D) confirmed on the quote.",
        handling=FENCE_HANDLING)
for length in (2100, 3000, 3300):
    add("supplies", "AA-FEN-PAL-POST-76", f"AA-FEN-PAL-POST-{length}", f"Palisade Post Square 76 mm × {length / 1000:.1f} m",
        f"Square 76 mm palisade post, {length / 1000:.1f} m, for palisade panels — set in concrete.", handling=FENCE_HANDLING)
for length in (1000, 1350, 3250):
    add("supplies", "AA-FEN-YSTD-1850", f"AA-FEN-YSTD-{length}", f"Y-Standard Fence Post {length / 1000:.2f} m".replace(".00 m", ".0 m"),
        f"Steel Y-standard fence post, {length / 1000:.2f} m, driven in for mesh and wire fences.".replace(".00 m", ".0 m"), handling=FENCE_HANDLING)
for code, name, desc in (
    ("AA-FEN-STRAIN-POST", "Straining Post with Stays", "Steel straining post with stays for the corners, ends and gate openings of a wire fence."),
    ("AA-FEN-DROPPER-WOOD", "Treated Wooden Fence Dropper", "Treated timber dropper that keeps fence wires spaced between posts."),
    ("AA-FEN-RAZOR-730", "Razor Wire Coil 730 mm", "Concertina razor-wire coil, 730 mm diameter, for wall and fence tops."),
    ("AA-FEN-RAZOR-450", "Razor Wire Coil 450 mm", "Smaller 450 mm razor-wire coil."),
    ("AA-FEN-TENSIONER", "Wire Strainer / Tensioner", "Ratchet strainer to tension fence wire."),
    ("AA-FEN-WIRE-16", "Galvanised Wire 1.6 mm", "Galvanised binding and tie wire, 1.6 mm. Coil mass confirmed on the quote."),
    ("AA-FEN-WIRE-25", "Galvanised Wire 2.5 mm", "Galvanised fence line wire, 2.5 mm. Coil mass confirmed on the quote."),
    ("AA-FEN-ELEC-ENERGISER", "Electric Fence Energiser", "Electric fence energiser for a residential perimeter. Joule rating confirmed on the quote."),
    ("AA-FEN-ELEC-WIRE", "Electric Fence Wire (Aluminium / Stainless)", "Conductor wire for electric fences. Material and coil length confirmed on the quote."),
    ("AA-FEN-ELEC-BRACKETS", "Electric Fence Wall-Top Brackets", "Wall-top brackets for 4- to 8-line electric fences."),
    ("AA-FEN-ELEC-INSULATORS", "Electric Fence Insulators (pack)", "Bobbin and strain insulators for electric fence lines."),
    ("AA-FEN-PICKET-PANEL", "Treated Pine Picket Fence Panel 1.2 × 1.2 m", "Treated timber picket fence panel for gardens."),
):
    add("supplies", "AA-FEN-GW-315-2", code, name, desc, handling=FENCE_HANDLING)

GATE_HANDLING = "Fit to the maker's instructions on sound brickwork or posts; gate motors, electric fences and their wiring are for a qualified installer."
for code, name, desc in (
    ("AA-GATE-DIAMOND-PAIR-1200", "Diamond Mesh Gate, Pair, 3.0 × 1.2 m", "Pair of galvanised diamond-mesh gates for a 3 m opening, 1.2 m high."),
    ("AA-GATE-DIAMOND-SINGLE-1200", "Diamond Mesh Gate, Single, 1.2 × 0.9 m", "Single galvanised diamond-mesh pedestrian gate, 0.9 m wide × 1.2 m high."),
    ("AA-GATE-PALISADE-SINGLE", "Palisade Pedestrian Gate", "Steel palisade pedestrian gate to match palisade fencing. Height confirmed on the quote."),
    ("AA-GATE-PALISADE-SLIDING", "Palisade Sliding Driveway Gate (to opening)", "Steel palisade sliding gate made to the driveway opening, with track and rollers."),
    ("AA-GATE-SWING-PAIR", "Steel Swing Driveway Gates (to opening)", "Pair of steel swing gates made to the opening. Design and finish confirmed on the quote."),
    ("AA-GATE-TRELLIS-1800", "Trellis Security Gate 1800 × 2150 mm", "Aluminium or steel trellis (fold-back) security gate for a 1.8 m opening."),
    ("AA-GATE-TRELLIS-2200", "Trellis Security Gate 2200 × 2150 mm", "Trellis security gate for a 2.2 m patio opening."),
    ("AA-GATE-TRELLIS-2500", "Trellis Security Gate 2500 × 2150 mm", "Trellis security gate for a 2.5 m patio opening."),
    ("AA-GATE-SECURITY-DOUBLE", "Security Gate for Doorways (Double)", "Double-leaf steel security gate for wide doorways."),
    ("AA-GATE-MOTOR-SLIDING", "Sliding Gate Motor Kit", "Sliding gate motor kit with remotes and rack. Gate mass rating confirmed on the quote; installation optional."),
    ("AA-GATE-MOTOR-SWING", "Swing Gate Motor Kit (Double)", "Motor kit for a pair of swing gates."),
    ("AA-GATE-ROLLER-200", "Gate Roller 200 kg", "V-groove gate roller rated to 200 kg."),
    ("AA-GATE-ROLLER-400", "Gate Roller 400 kg", "V-groove gate roller rated to 400 kg."),
    ("AA-GATE-ROLLER-600", "Gate Roller 600 kg", "Heavy V-groove gate roller rated to 600 kg."),
    ("AA-GATE-TRACK", "Sliding Gate Track (per metre)", "Angle or V-track for sliding gates, laid in concrete."),
    ("AA-GATE-LOCK", "Security Gate Lock", "Lever or cylinder lock for steel security gates."),
):
    add("supplies", "AA-GATE-DM-0918", code, name, desc, handling=GATE_HANDLING)
for w, h in ((530, 450), (530, 700), (530, 1000), (530, 1270), (460, 1000), (950, 410)):
    for pattern in ("Diamond", "Brick"):
        add("supplies", "AA-GATE-DM-0918", f"AA-GATE-BBAR-{pattern.upper()}-{w}X{h}", f"Burglar Bar, {pattern} Pattern, {w} × {h} mm",
            f"Steel or aluminium burglar bar in a {pattern.lower()} pattern for a {w} × {h} mm window opening. Colour confirmed on the quote.",
            unit_size=f"{w} × {h} mm", handling=GATE_HANDLING, uses=["Window security for homes and businesses"])

TANK_HANDLING = "Stand tanks on a level, smooth concrete or compacted-sand base the full size of the tank."
for litres, kind in ((250, "Horizontal"), (500, "Horizontal"), (750, "Slimline Vertical"), (1000, "Vertical"), (1000, "Slimline Vertical"),
                     (1500, "Vertical"), (2000, "Vertical"), (2200, "Slimline Vertical"), (2500, "Vertical"), (5000, "Horizontal"), (10000, "Vertical")):
    add("supplies", "AA-TNK-AT-5000", f"AA-TNK-{litres}-{slug(kind).upper()}", f"{kind} Water Tank {litres:,} L",
        f"UV-stabilised polyethylene water tank, {litres:,} L, {kind.lower()}. Colour and make confirmed on the quote.", handling=TANK_HANDLING)
for litres in (2000, 6000):
    add("supplies", "AA-TNK-AT-5000", f"AA-TNK-SEPTIC-{litres}", f"Septic Tank {litres:,} L",
        f"Polyethylene septic tank, {litres:,} L, for on-site sewage where there's no municipal sewer — sized and approved with your plans.",
        handling="Install to the approved drawing, on a level bed, and backfill evenly while the tank is filled with water.")
for litres in (50, 100, 200, 250):
    add("supplies", "AA-GEY-150-600", f"AA-GEY-{litres}", f"Electric Geyser {litres} L, 600 kPa",
        f"High-pressure electric geyser, {litres} L, 600 kPa. Orientation (vertical / horizontal) and make confirmed on the quote; "
        "install by a registered plumber with the SANS 10254 safety valves and drip tray.")
for litres in (150, 200):
    add("supplies", "AA-GEY-150-600", f"AA-GEY-SOLAR-{litres}", f"Solar Geyser {litres} L (Frost-Resistant)",
        f"Frost-resistant solar water heater, {litres} L, with collector. Installation by an accredited installer.")
for code, name, desc in (
    ("AA-GEY-KIT-600", "Geyser Installation Kit 600 kPa", "Pressure control valve, safety valve and vacuum breakers for a 600 kPa geyser installation."),
    ("AA-GEY-PCV-600", "Geyser Pressure Control Valve 600 kPa (22 mm)", "Pressure control valve for a 600 kPa geyser, 22 mm."),
    ("AA-GEY-ELEMENT-2KW", "Geyser Element 2 kW", "Replacement geyser element, 2 kW. Fitting type (boss or spiral) confirmed on the quote."),
    ("AA-GEY-ELEMENT-3KW", "Geyser Element 3 kW", "Replacement geyser element, 3 kW."),
    ("AA-GEY-ELEMENT-4KW", "Geyser Element 4 kW", "Replacement geyser element, 4 kW."),
    ("AA-GEY-THERMOSTAT", "Geyser Thermostat", "Replacement geyser thermostat with leads."),
    ("AA-GEY-DRIPTRAY", "Geyser Drip Tray", "Drip tray with outlet to sit under a geyser, as SANS 10254 requires."),
    ("AA-GEY-BLANKET", "Geyser Insulation Blanket", "Insulating blanket to cut a geyser's standing heat loss."),
):
    add("supplies", "AA-GEY-150-600", code, name, desc)

PLUMB_HANDLING = "Install to SANS 10252 by a registered plumber; pressure-test before closing walls or trenches."
for code, name, desc, tpl in (
    ("AA-PLB-POLYCOP-15-50", "Polycop Pipe 15 mm × 50 m Roll", "Polycop composite water pipe, 15 mm, 50 m roll.", "AA-PLB-POLYCOP-15-25"),
    ("AA-PLB-POLYCOP-15-100", "Polycop Pipe 15 mm × 100 m Roll", "Polycop composite water pipe, 15 mm, 100 m roll.", "AA-PLB-POLYCOP-15-25"),
    ("AA-PLB-POLYCOP-22-100", "Polycop Pipe 22 mm × 100 m Roll", "Polycop composite water pipe, 22 mm, 100 m roll.", "AA-PLB-POLYCOP-15-25"),
    ("AA-PLB-COPPER-22", "Copper Pipe 22 mm × 5.5 m (Class 0)", "Class 0 copper water pipe, 22 mm, 5.5 m.", "AA-PLB-COPPER-15"),
    ("AA-PLB-COPPER-28", "Copper Pipe 28 mm × 5.5 m (Class 0)", "Class 0 copper water pipe, 28 mm, 5.5 m.", "AA-PLB-COPPER-15"),
):
    add("supplies", tpl, code, name, desc, handling=PLUMB_HANDLING)
for size in (15, 22):
    for kind, label in (("ELBOW", "Elbow 90°"), ("TEE", "Equal Tee"), ("COUPLER", "Straight Coupler"), ("CXMI", "Coupler, Copper × Male Iron"),
                        ("CXFI", "Coupler, Copper × Female Iron"), ("COMP-ELBOW", "Compression Elbow"), ("COMP-TEE", "Compression Tee")):
        add("supplies", "AA-PLB-COPPER-15", f"AA-PLB-CU-{kind}-{size}", f"Copper {label} {size} mm",
            f"Copper (or brass compression) fitting, {label.lower()}, {size} mm, for copper and Polycop pipe.", handling=PLUMB_HANDLING,
            units=[("EACH", "Each")])
for size in (15, 20, 22, 25):
    add("supplies", "AA-PLB-COPPER-15", f"AA-PLB-GATE-VALVE-{size}", f"Gate Valve {size} mm",
        f"Brass gate valve, {size} mm, to isolate a water line.", handling=PLUMB_HANDLING, units=[("EACH", "Each")])
for size in (15, 22):
    add("supplies", "AA-PLB-COPPER-15", f"AA-PLB-BALL-VALVE-{size}", f"Ball Valve {size} mm",
        f"Quarter-turn brass ball valve, {size} mm.", handling=PLUMB_HANDLING, units=[("EACH", "Each")])
for size in (20, 25, 32, 40, 50):
    add("supplies", "AA-PLB-POLYCOP-15-25", f"AA-PLB-HDPE-{size}", f"HDPE Water Pipe {size} mm (PE100, PN10, coil)",
        f"HDPE PE100 water pipe, {size} mm, PN10 pressure class, in a coil — municipal connections, boreholes and site water. Coil length confirmed on the quote.",
        handling=PLUMB_HANDLING)
for size in (50, 63, 75, 90, 110):
    for cls in (9, 12):
        add("supplies", "AA-PLB-SV-110-6", f"AA-PLB-PVC-PRESS-{size}-C{cls}", f"uPVC Pressure Pipe {size} mm × 6 m (Class {cls})",
            f"uPVC pressure pipe, {size} mm, Class {cls}, 6 m, for water mains and irrigation lines.", handling=PLUMB_HANDLING)
for size in (40, 50):
    add("supplies", "AA-PLB-SV-110-6", f"AA-PLB-WASTE-{size}", f"Waste Pipe {size} mm × 6 m",
        f"uPVC waste pipe, {size} mm, for basins, sinks and showers.", handling=PLUMB_HANDLING)
    for kind, label in (("BEND", "Bend 90°"), ("TEE", "Tee"), ("TRAP", "Bottle / P-Trap")):
        add("supplies", "AA-PLB-SV-110-6", f"AA-PLB-WASTE-{kind}-{size}", f"Waste {label} {size} mm",
            f"uPVC waste fitting, {label.lower()}, {size} mm.", handling=PLUMB_HANDLING, units=[("EACH", "Each")])
for code, name, desc in (
    ("AA-PLB-SOIL-BEND-110", "Soil Bend 110 mm × 87.5°", "uPVC soil and vent bend, 110 mm."),
    ("AA-PLB-SOIL-JUNC-110", "Soil Junction 110 mm × 87.5°", "uPVC soil and vent junction, 110 mm."),
    ("AA-PLB-SOIL-PAN-CONN", "WC Pan Connector 110 mm", "Flexible or rigid pan connector from the toilet to the soil pipe."),
    ("AA-PLB-SOIL-VENT-COWL", "Vent Cowl 110 mm", "Vent cowl to cap the top of a soil vent pipe."),
    ("AA-PLB-STOPCOCK-15", "Stopcock 15 mm", "Brass stopcock to shut off the water supply, 15 mm."),
    ("AA-PLB-TAP-GARDEN", "Garden Tap 15 mm", "Brass garden (hose-union) tap, 15 mm."),
):
    add("supplies", "AA-PLB-SV-110-6", code, name, desc, handling=PLUMB_HANDLING, units=[("EACH", "Each")])

CEIL_HANDLING = "Store boards flat and dry, off the floor; fix to brandering or the drywall grid at the spacings the maker specifies."
for thick, kind in ((9, "Standard"), (12, "Standard"), (12, "Moisture-Resistant"), (15, "Fire-Rated")):
    for w, length in ((1200, 2400), (1200, 2700), (1200, 3000)):
        add("supplies", "AA-CLG-RHINO-64-1200-3000", f"AA-CLG-GYP-{thick}-{slug(kind).upper()}-{length}",
            f"Gypsum Board {thick} mm {kind} {w} × {length} mm",
            f"{kind} gypsum plasterboard, {thick} mm, {w} × {length} mm, for drywall partitions and ceilings."
            + (" Green-faced board for bathrooms and kitchens." if kind == "Moisture-Resistant" else "")
            + (" Fire-rated core for fire-rated walls and ceilings." if kind == "Fire-Rated" else ""),
            handling=CEIL_HANDLING, unit_size=f"{w} × {length} × {thick} mm")
for thick in (4, 6, 9):
    for w, length in ((900, 2400), (1200, 2400), (1200, 3000), (1200, 3600)):
        if thick == 9 and length != 3000:
            continue
        add("supplies", "AA-CLG-RHINO-64-1200-3000", f"AA-CLG-FC-{thick}-{w}X{length}", f"Fibre-Cement Ceiling Board {thick} mm {w} × {length} mm",
            f"Fibre-cement ceiling and drywall board, {thick} mm, {w} × {length} mm — moisture-resistant for eaves, verandas and bathrooms.",
            handling=CEIL_HANDLING, unit_size=f"{w} × {length} × {thick} mm")
for finish in ("Gloss White", "Silver Pattern", "Wood Grain"):
    add("supplies", "AA-CLG-PVC-6-300", f"AA-CLG-PVC-{slug(finish).upper()}", f"PVC Ceiling Board 300 mm × 3.9 m ({finish})",
        f"Tongue-and-groove PVC ceiling board, 300 mm × 3.9 m, {finish.lower()} finish.", handling=CEIL_HANDLING)
for size, length in ((90, 3.0), (90, 3.6), (125, 3.0), (125, 3.6)):
    add("supplies", "AA-CLG-COVE-75-3000", f"AA-CLG-COVE-{size}-{int(length * 1000)}", f"Gypsum Cove Cornice {size} mm × {length:.1f} m",
        f"Gypsum cove cornice, {size} mm, {length:.1f} m length.", handling=CEIL_HANDLING)
for size in (75, 100):
    add("supplies", "AA-CLG-COVE-75-3000", f"AA-CLG-POLY-CORNICE-{size}", f"Polystyrene Cornice {size} mm × 2 m",
        f"Lightweight polystyrene cornice, {size} mm, 2 m length. Profile confirmed on the quote.", handling=CEIL_HANDLING)
for profile, size in (("Stud", 51), ("Stud", 63.5), ("Stud", 76), ("Track", 51), ("Track", 63.5), ("Track", 76)):
    for length in (2700, 3000, 3600):
        if profile == "Track" and length != 3000:
            continue
        s = f"{size:g}"
        add("supplies", "AA-CLG-RHINO-64-1200-3000", f"AA-CLG-DRY-{profile.upper()}-{slug(s)}-{length}", f"Drywall {profile} {s} mm × {length / 1000:.1f} m",
            f"Galvanised steel drywall {profile.lower()}, {s} mm, {length / 1000:.1f} m, for partition framing.", handling=CEIL_HANDLING,
            units=[("EACH", "Each")])
for code, name, desc, unit in (
    ("AA-CLG-DRY-CHANNEL-3600", "Ceiling Channel (Furring) 3.6 m", "Galvanised ceiling furring channel, 3.6 m, for suspended plasterboard ceilings.", ("EACH", "Each")),
    ("AA-CLG-DRY-SCREWS", "Drywall Screws 25 mm (box of 1000)", "Fine-thread drywall screws, 25 mm, box of 1,000.", ("PACK", "Box of 1,000")),
    ("AA-CLG-DRY-SCREWS-38", "Drywall Screws 38 mm (box of 1000)", "Drywall screws, 38 mm, for double board layers.", ("PACK", "Box of 1,000")),
    ("AA-CLG-JOINT-TAPE", "Paper Joint Tape 50 mm × 150 m", "Paper jointing tape for plasterboard joints.", ("ROLL", "Roll")),
    ("AA-CLG-MESH-TAPE", "Fibreglass Mesh Joint Tape 48 mm × 90 m", "Self-adhesive fibreglass mesh tape for board joints and cracks.", ("ROLL", "Roll")),
    ("AA-CLG-JOINT-COMPOUND", "Jointing Compound 20 kg", "Powder jointing compound for taping and finishing plasterboard joints.", ("EACH", "20 kg bag")),
    ("AA-CLG-CORNER-BEAD", "Corner Bead 3 m", "Metal or PVC corner bead to protect plastered and drywall corners.", ("EACH", "Each")),
    ("AA-CLG-ACCESS-PANEL", "Ceiling Access Panel 600 × 600 mm", "Hinged access hatch for the ceiling void.", ("EACH", "Each")),
    ("AA-CLG-BRACKETS", "Ceiling Brackets & Hangers (box)", "Brackets and hangers to suspend brandering or ceiling grids.", ("PACK", "Box")),
    ("AA-CLG-SUSPENDED-TILE", "Suspended Ceiling Tile 600 × 600 mm", "Mineral-fibre or gypsum tile for exposed-grid suspended ceilings (offices and shops).", ("EACH", "Each")),
    ("AA-CLG-SUSPENDED-GRID", "Suspended Ceiling Grid (Main & Cross Tees)", "Exposed T-grid for 600 × 600 mm suspended ceilings.", ("EACH", "Each")),
    ("AA-CLG-SKIM-PRIMER", "Plaster Bonding Primer 5 L", "Bonding primer before skim-coating board or smooth concrete.", ("EACH", "5 L")),
):
    add("supplies", "AA-CLG-RHINO-64-1200-3000", code, name, desc, handling=CEIL_HANDLING, units=[unit])

TOOL = ("EACH", "Each")
for code, name, desc in (
    ("AA-TL-TROWEL-250", "Brick Trowel 250 mm", "Brick trowel, 250 mm."),
    ("AA-TL-TROWEL-300", "Brick Trowel 300 mm", "Brick trowel, 300 mm."),
    ("AA-TL-POINTING-TROWEL", "Pointing Trowel", "Small pointing trowel for joints and repairs."),
    ("AA-TL-STEEL-FLOAT", "Steel Plastering Float", "Steel finishing float for plaster and screeds."),
    ("AA-TL-PLASTIC-FLOAT", "Plastic Float", "Plastic float for a textured plaster finish."),
    ("AA-TL-WOOD-FLOAT", "Wooden Float", "Wooden float for screeds and concrete."),
    ("AA-TL-JOINTER", "Brick Jointer", "Jointer to strike mortar joints in face brickwork."),
    ("AA-TL-LEVEL-1800", "Spirit Level 1800 mm", "Aluminium spirit level, 1800 mm."),
    ("AA-TL-LEVEL-400", "Spirit Level 400 mm", "Aluminium spirit level, 400 mm."),
    ("AA-TL-STRAIGHTEDGE", "Aluminium Straight Edge 2.4 m", "Aluminium straight edge for screeds and plaster."),
    ("AA-TL-TAPE-5", "Tape Measure 5 m", "Steel tape measure, 5 m."),
    ("AA-TL-TAPE-8", "Tape Measure 8 m", "Steel tape measure, 8 m."),
    ("AA-TL-TAPE-30", "Long Tape Measure 30 m", "Fibreglass long tape for setting out."),
    ("AA-TL-CHALK-LINE", "Chalk Line Reel", "Chalk line for marking straight lines."),
    ("AA-TL-SQUARE", "Builder's Square", "Steel builder's square for setting out corners."),
    ("AA-TL-PICK", "Pick with Handle", "Pick with handle for breaking hard ground."),
    ("AA-TL-MATTOCK", "Mattock (Badza) with Handle", "Mattock for digging and trenching."),
    ("AA-TL-CROWBAR", "Crowbar 1.5 m", "Steel crowbar for levering and breaking."),
    ("AA-TL-SLEDGE-3", "Sledgehammer 3.2 kg", "Sledgehammer, 3.2 kg."),
    ("AA-TL-SLEDGE-6", "Sledgehammer 6.3 kg", "Heavy sledgehammer, 6.3 kg."),
    ("AA-TL-CLAW-HAMMER", "Claw Hammer", "Claw hammer for carpentry and shuttering."),
    ("AA-TL-SQUARE-SHOVEL", "Square-Mouth Shovel", "Square-mouth shovel for mixing and loading."),
    ("AA-TL-LONG-SHOVEL", "Long-Handle Shovel", "Long-handle shovel for trenching."),
    ("AA-TL-RAKE", "Landscape Rake", "Wide rake for levelling soil, sand and stone."),
    ("AA-TL-BARROW-85", "Builder's Wheelbarrow 85 L", "Heavy-duty builder's wheelbarrow, 85 L."),
    ("AA-TL-BUCKET", "Builder's Bucket 15 L", "Heavy-duty builder's bucket."),
    ("AA-TL-MIXING-TUB", "Mortar Mixing Tub", "Plastic mixing tub for mortar and plaster."),
    ("AA-TL-TILE-CUTTER", "Manual Tile Cutter 600 mm", "Manual tile cutter, 600 mm cutting length."),
    ("AA-TL-HACKSAW", "Hacksaw", "Hacksaw with blade for pipe and steel."),
    ("AA-TL-GRINDER-115", "Angle Grinder 115 mm", "Angle grinder, 115 mm."),
    ("AA-TL-GRINDER-230", "Angle Grinder 230 mm", "Large angle grinder, 230 mm, for cutting steel and masonry."),
    ("AA-TL-CUT-DISC", "Steel Cutting Discs 115 mm (pack)", "Thin cutting discs for steel."),
    ("AA-TL-DIAMOND-BLADE", "Diamond Blade 230 mm", "Diamond blade for cutting brick, block, paving and concrete."),
    ("AA-TL-MASONRY-BITS", "Masonry Drill Bit Set", "Set of masonry drill bits."),
    ("AA-TL-RUBBER-MALLET", "Rubber Mallet", "Rubber mallet for laying paving and tiles."),
):
    add("supplies", "AA-TL-BOLSTER-100", code, name, desc, units=[TOOL])

for code, name, desc in (
    ("AA-PPE-EARMUFFS", "Ear Muffs", "Hearing protection ear muffs."),
    ("AA-PPE-EARPLUGS", "Disposable Ear Plugs (box)", "Disposable foam ear plugs."),
    ("AA-PPE-FFP2", "Dust Masks FFP2 (box)", "FFP2 respirator masks for cement, cutting and sanding dust."),
    ("AA-PPE-FFP3", "Dust Masks FFP3 (box)", "FFP3 respirator masks for fine silica dust."),
    ("AA-PPE-RESPIRATOR", "Half-Face Respirator with Filters", "Reusable half-face respirator with replaceable filters."),
    ("AA-PPE-FACE-SHIELD", "Face Shield", "Clear face shield for grinding and cutting."),
    ("AA-PPE-GOGGLES", "Safety Goggles", "Sealed safety goggles for splashes and dust."),
    ("AA-PPE-WELD-HELMET", "Welding Helmet (Auto-Darkening)", "Auto-darkening welding helmet."),
    ("AA-PPE-CONTI-SUIT", "Conti Suit (Overalls)", "Two-piece work overalls. Size confirmed on the quote."),
    ("AA-PPE-RAIN-SUIT", "Rain Suit", "PVC rain suit."),
    ("AA-PPE-REFLECTIVE-JACKET", "Reflective Jacket", "High-visibility reflective jacket."),
    ("AA-PPE-GUMBOOTS", "Gumboots, Steel Toe", "Steel-toe gumboots for wet work and concrete."),
    ("AA-PPE-SAFETY-SHOES", "Safety Shoes, Steel Toe", "Low-cut steel-toe safety shoes."),
    ("AA-PPE-RUBBER-GLOVES", "Rubber / PVC Gloves", "PVC gloves for cement and chemicals."),
    ("AA-PPE-KNEE-PADS", "Knee Pads", "Knee pads for tiling, paving and flooring."),
    ("AA-PPE-HARNESS", "Full-Body Safety Harness", "Full-body harness for work at height."),
    ("AA-PPE-LANYARD", "Shock-Absorbing Lanyard", "Lanyard with shock absorber for a safety harness."),
    ("AA-PPE-FIRST-AID-3", "First Aid Kit (Regulation 3)", "Workplace first-aid kit to Regulation 3."),
    ("AA-PPE-FIRST-AID-7", "First Aid Kit (Regulation 7)", "Larger workplace first-aid kit to Regulation 7."),
    ("AA-PPE-EXTINGUISHER-45", "Fire Extinguisher 4.5 kg DCP", "Dry chemical powder fire extinguisher, 4.5 kg."),
    ("AA-PPE-EXTINGUISHER-9", "Fire Extinguisher 9 kg DCP", "Dry chemical powder fire extinguisher, 9 kg."),
    ("AA-PPE-SAFETY-SIGNS", "Construction Site Safety Signs", "Site safety signage (PPE required, no entry, danger). Signs confirmed on the quote."),
    ("AA-PPE-CONES", "Traffic Cones 750 mm", "Reflective traffic cones for site and road works."),
    ("AA-PPE-BARRIER-MESH", "Barrier Mesh Orange 1 × 50 m", "Orange plastic barrier mesh to fence off excavations and work zones."),
):
    add("supplies", "AA-PPE-HARDHAT", code, name, desc, units=[TOOL])

WP_HANDLING = "Apply to a clean, sound, dry surface after priming, at the coverage and number of coats the maker specifies."
for code, name, desc, unit in (
    ("AA-WP-BITUMEN-PRIMER-5", "Bitumen Primer 5 L", "Bitumen primer before torch-on membranes and bitumen coatings.", ("EACH", "5 L")),
    ("AA-WP-BITUMEN-PRIMER-20", "Bitumen Primer 20 L", "Bitumen primer, 20 L.", ("EACH", "20 L")),
    ("AA-WP-TORCH-4", "Torch-On Waterproofing Membrane 4 mm × 1 m × 10 m", "Heavier 4 mm torch-on bitumen membrane for flat concrete roofs.", ("ROLL", "Roll")),
    ("AA-WP-TORCH-MINERAL", "Torch-On Membrane, Mineral Finish, 4 mm × 10 m", "Torch-on membrane with a mineral-chip top surface that needs no paint.", ("ROLL", "Roll")),
    ("AA-WP-LIQUID-5", "Liquid Waterproofing Membrane 5 L", "Water-based liquid rubber / acrylic waterproofing for roofs and parapets. Colour confirmed on the quote.", ("EACH", "5 L")),
    ("AA-WP-LIQUID-20", "Liquid Waterproofing Membrane 20 L", "Liquid waterproofing membrane, 20 L.", ("EACH", "20 L")),
    ("AA-WP-CEMENTITIOUS", "Cementitious Waterproofing (2-part) 20 kg", "Two-part cementitious waterproof coating for showers, basements, water tanks and pools.", ("EACH", "20 kg kit")),
    ("AA-WP-FABRIC-100", "Waterproofing Membrane Fabric 100 mm × 50 m", "Polyester reinforcing fabric bedded into liquid waterproofing.", ("ROLL", "Roll")),
    ("AA-WP-FABRIC-150", "Waterproofing Membrane Fabric 150 mm × 50 m", "Reinforcing fabric, 150 mm.", ("ROLL", "Roll")),
    ("AA-WP-FABRIC-1000", "Waterproofing Membrane Fabric 1 m × 50 m", "Full-width reinforcing fabric for whole-roof systems.", ("ROLL", "Roll")),
    ("AA-WP-FLASHING-TAPE", "Self-Adhesive Flashing Tape 150 mm × 10 m", "Bitumen-backed flashing tape for roof joints, gutters and parapets.", ("ROLL", "Roll")),
    ("AA-WP-DAMP-PROOF", "Clear Damp-Proofing Liquid 5 L", "Clear silicone water-repellent for face brick and plaster.", ("EACH", "5 L")),
    ("AA-WP-BITUMEN-PAINT", "Bitumen Paint 5 L", "Black bitumen coating for foundations, steel and below-ground concrete.", ("EACH", "5 L")),
    ("AA-WP-PU-SEALANT", "Polyurethane Joint Sealant 600 ml", "Flexible polyurethane sealant for movement joints and paving.", ("EACH", "600 ml sausage")),
    ("AA-WP-ROOF-SEALER", "Roof Sealer (Crack & Leak) 1 kg", "Fibre-reinforced roof sealer for laps, bolts and cracks.", ("EACH", "1 kg")),
    ("AA-WP-EXPANSION-FILLER", "Expansion Joint Filler Board 10 mm", "Compressible filler board for expansion joints in slabs.", ("SHEET", "Sheet")),
    ("AA-WP-WATERSTOP", "PVC Waterstop (per metre)", "PVC waterstop cast into construction joints in water-retaining concrete.", ("EACH", "Per metre")),
    ("AA-WP-CRACK-FILLER", "Crack Filler 2 kg", "Exterior crack filler for plaster and masonry.", ("EACH", "2 kg")),
):
    add("supplies", "AA-WP-LAYKOLD-20", code, name, desc, handling=WP_HANDLING, units=[unit])

PAINT_HANDLING = "Prepare and prime the surface first; apply at the maker's coverage and recoat times. Keep tins sealed and out of the sun."
for code, name, desc, unit in (
    ("AA-PNT-PVA-INT-20", "Interior PVA 20 L (White)", "Matt interior PVA for ceilings and walls.", ("EACH", "20 L")),
    ("AA-PNT-PVA-INT-5", "Interior PVA 5 L (White)", "Matt interior PVA, 5 L.", ("EACH", "5 L")),
    ("AA-PNT-EXT-ACRYLIC-20", "Exterior Acrylic 20 L", "Durable exterior acrylic for plastered walls. Colour confirmed on the quote.", ("EACH", "20 L")),
    ("AA-PNT-LOW-SHEEN-20", "Low-Sheen Acrylic 20 L", "Washable low-sheen acrylic for interiors and exteriors.", ("EACH", "20 L")),
    ("AA-PNT-TEXTURED-20", "Textured Wall Coating 20 L", "Textured exterior coating that hides hairline cracks.", ("EACH", "20 L")),
    ("AA-PNT-ENAMEL-1", "Gloss Enamel 1 L", "Solvent-based gloss enamel for metal and wood.", ("EACH", "1 L")),
    ("AA-PNT-UNDERCOAT-5", "Universal Undercoat 5 L", "Undercoat for wood and metal before enamel.", ("EACH", "5 L")),
    ("AA-PNT-RED-OXIDE-5", "Red Oxide Metal Primer 5 L", "Red oxide primer for steel windows, frames and gates.", ("EACH", "5 L")),
    ("AA-PNT-ZINC-PRIMER-5", "Zinc Phosphate Metal Primer 5 L", "Anti-corrosive primer for steel and galvanised metal.", ("EACH", "5 L")),
    ("AA-PNT-WOOD-PRIMER-5", "Wood Primer 5 L", "Primer for bare timber before paint.", ("EACH", "5 L")),
    ("AA-PNT-WOOD-SEALER-5", "Exterior Wood Sealer 5 L", "Water- or solvent-based sealer for timber doors, windows and decks.", ("EACH", "5 L")),
    ("AA-PNT-VARNISH-1", "Polyurethane Varnish 1 L", "Clear polyurethane varnish.", ("EACH", "1 L")),
    ("AA-PNT-STOEP-5", "Floor (Stoep) Paint 5 L", "Hard-wearing floor paint for stoeps and concrete floors. Colour confirmed on the quote.", ("EACH", "5 L")),
    ("AA-PNT-ROOF-5", "Roof Paint 5 L", "Acrylic roof paint for sheeting and tiles. Colour confirmed on the quote.", ("EACH", "5 L")),
    ("AA-PNT-PAVING-20", "Paving Paint 20 L", "Paving and driveway paint. Colour confirmed on the quote.", ("EACH", "20 L")),
    ("AA-PNT-ROAD-MARKING-20", "Road-Marking Paint 20 L", "Road-marking paint (white or yellow) for parking bays and lines.", ("EACH", "20 L")),
    ("AA-PNT-THINNERS-5", "Thinners 5 L", "Lacquer or general thinners for cleaning and thinning solvent paints.", ("EACH", "5 L")),
    ("AA-PNT-BRUSH-SET", "Paint Brush Set", "Paint brush set (25–100 mm).", ("EACH", "Set")),
    ("AA-PNT-ROLLER-230", "Paint Roller 230 mm with Tray", "Paint roller, 230 mm, with tray.", ("EACH", "Set")),
    ("AA-PNT-MASKING-TAPE", "Masking Tape 48 mm", "Masking tape, 48 mm.", ("ROLL", "Roll")),
    ("AA-PNT-SANDPAPER", "Sandpaper Assorted (pack)", "Sandpaper in assorted grits.", ("PACK", "Pack")),
    ("AA-PNT-PLASTER-PATCH-5", "Plaster Patch 5 kg", "Interior plaster patch for holes and chases.", ("EACH", "5 kg")),
):
    add("supplies", "AA-PNT-DUR-MATT-20-W", code, name, desc, handling=PAINT_HANDLING, units=[unit])


# =============================================================================================
# Roofing accessories, insulation and rainwater (roofing_catalogue.json)
# =============================================================================================
for code, name, desc in (
    ("AA-ROF-RIDGE-IBR-ZINC", "IBR Ridge Capping, Zincalume®", "IBR ridge capping in Zincalume®, to match Zincalume® sheeting."),
    ("AA-ROF-RIDGE-IBR-PAINTED", "IBR Ridge Capping, Pre-Painted", "Pre-painted IBR ridge capping to match coloured sheeting."),
    ("AA-ROF-RIDGE-CORR-ZINC", "Roll-Top Ridge for Corrugated, Zincalume®", "Roll-top ridge for corrugated Zincalume® sheeting."),
    ("AA-ROF-VALLEY", "Valley Gutter Flashing", "Valley flashing where two roof slopes meet. Material and girth confirmed on the quote."),
    ("AA-ROF-APRON", "Apron / Wall Flashing", "Apron flashing where the roof meets a wall."),
    ("AA-ROF-EAVES-FLASHING", "Eaves / Drip Flashing", "Eaves flashing that drips water into the gutter."),
    ("AA-ROF-CONCEALED-RIDGE", "Concealed-Fix Ridge Capping", "Ridge capping for concealed-fix (clip-lock) roofs."),
    ("AA-ROF-CLIPS", "Concealed-Fix Roof Clips (box)", "Clips that fix concealed-fix sheeting to the purlins."),
    ("AA-ROF-SCREWS-25", "Roof Tek Screws 5.5 × 25 mm (box of 100)", "Self-drilling tek screws, 5.5 × 25 mm, for flashings and side laps."),
    ("AA-ROF-SCREWS-45", "Roof Tek Screws for Timber 5.5 × 45 mm (box of 100)", "Tek screws for corrugated sheeting on timber."),
    ("AA-ROF-SCREWS-90", "Roof Tek Screws for Timber 5.5 × 90 mm (box of 100)", "Long tek screws for IBR on timber with insulation."),
    ("AA-ROF-WASHERS", "Roof Sealing Washers (bag)", "EPDM-bonded sealing washers for roof fixings."),
    ("AA-ROF-FASCIA-150", "Fibre-Cement Fascia Board, 150 mm × 3.6 m", "Fibre-cement fascia board, 150 mm × 3.6 m."),
    ("AA-ROF-FASCIA-PVC", "PVC Fascia Board, 225 mm × 6 m", "Maintenance-free PVC fascia and barge board."),
    ("AA-ROF-FASCIA-CONNECTOR", "Fascia Board Connectors & Corners", "Joiners and corners for PVC fascia."),
    ("AA-ROF-POLYCARB-IBR", "Polycarbonate Translucent Sheet, IBR Profile", "Translucent polycarbonate roof sheet in the IBR profile, for daylight. Length confirmed on the quote."),
    ("AA-ROF-POLYCARB-CORR", "Polycarbonate Translucent Sheet, Corrugated", "Translucent polycarbonate sheet in the corrugated profile."),
    ("AA-ROF-WHIRLYBIRD", "Roof Ventilator (Whirlybird)", "Wind-driven roof ventilator to clear hot air from the roof space."),
):
    add("roofing", "AA-ROF-FLASHING-BARGE", code, name, desc, units=[("EACH", "Each")])
for code, name, desc in (
    ("AA-ROF-INSUL-GLASS-100", "Glass-Wool Ceiling Insulation 100 mm", "Glass-wool insulation, 100 mm. Roll size confirmed on the quote."),
    ("AA-ROF-INSUL-GLASS-50", "Glass-Wool Ceiling Insulation 50 mm", "Glass-wool insulation, 50 mm, for retrofits and walls."),
    ("AA-ROF-INSUL-POLY-100", "Polyester Ceiling Insulation 100 mm", "Polyester insulation, 100 mm."),
    ("AA-ROF-INSUL-POLY-145", "Polyester Ceiling Insulation 145 mm", "Polyester insulation, 145 mm, for higher R-values."),
    ("AA-ROF-INSUL-BLANKET-SHEETING", "Roof Insulation Blanket under Sheeting (foil-faced)", "Foil-faced insulation blanket laid over purlins under sheet roofs."),
    ("AA-ROF-INSUL-THERMAL-BOARD", "Thermal Insulation Board (Polystyrene)", "Expanded or extruded polystyrene board for walls, slabs and roofs. Thickness confirmed on the quote."),
):
    add("roofing", "AA-ROF-INSUL-GLASSWOOL-135", code, name, desc)
for code, name, desc in (
    ("AA-ROF-GUTTER-PVC-3M", "PVC Gutter, 3 m length", "uPVC eaves gutter, 3 m length."),
    ("AA-ROF-GUTTER-PVC-4M", "PVC Gutter, 4 m length", "uPVC eaves gutter, 4 m length."),
    ("AA-ROF-GUTTER-PVC-45M", "PVC Gutter, 4.5 m length", "uPVC eaves gutter, 4.5 m length."),
    ("AA-ROF-GUTTER-SQUARE-6M", "PVC Square (Box) Gutter, 6 m", "uPVC square-line high-capacity gutter, 6 m."),
    ("AA-ROF-GUTTER-SEAMLESS", "Seamless Aluminium Gutter (per metre)", "Seamless aluminium gutter roll-formed on site, priced per metre. Colour confirmed on the quote."),
    ("AA-ROF-GUTTER-GALV", "Galvanised Steel Gutter, 6 m", "Galvanised steel gutter for industrial and farm buildings."),
):
    add("roofing", "AA-ROF-GUTTER-PVC-6M", code, name, desc)
for code, name, desc in (
    ("AA-ROF-DOWNPIPE-SQUARE", "PVC Square Downpipe 100 × 75 mm, 3 m", "uPVC square downpipe, 100 × 75 mm, 3 m."),
    ("AA-ROF-DOWNPIPE-STEEL", "Galvanised Steel Downpipe, 2.7 m", "Galvanised steel downpipe, round or square, 2.7 m."),
    ("AA-ROF-DOWNPIPE-BEND", "Downpipe Offset Bend", "Offset bend to bring a downpipe from the gutter outlet to the wall."),
    ("AA-ROF-DOWNPIPE-SHOE", "Downpipe Shoe", "Shoe at the foot of a downpipe."),
    ("AA-ROF-DOWNPIPE-BRACKET", "Downpipe Brackets (pack)", "Wall brackets for downpipes."),
    ("AA-ROF-GUTTER-OUTLET", "Gutter Running Outlet", "Running outlet that connects the gutter to a downpipe."),
    ("AA-ROF-GUTTER-STOPEND", "Gutter Stop End", "Stop end to close the end of a gutter."),
    ("AA-ROF-GUTTER-CORNER", "Gutter Corner (90°)", "External or internal 90° gutter corner."),
    ("AA-ROF-GUTTER-BRACKET", "Gutter Fascia Brackets (pack)", "Fascia brackets for gutters."),
    ("AA-ROF-GUTTER-CONNECTOR", "Gutter Connector (Union)", "Union to join two gutter lengths."),
    ("AA-ROF-RAIN-ADAPTOR", "Rainwater Tank Downpipe Adaptor", "Adaptor to run a downpipe into a water tank inlet."),
):
    add("roofing", "AA-ROF-DOWNPIPE-PVC-3M", code, name, desc, units=[("EACH", "Each")])


# =============================================================================================
# Structural steel (steel_catalogue.json)
# =============================================================================================
STEEL_HANDLING = "Confirm section, grade and length against the engineer's drawings. Cutting, drilling and galvanising are quoted separately."


def steel(sku, name, desc, size, family="Structural steel", unit=("LENGTH_6M", "6 m length")):
    add("steel", "AA-STL-STR-ANGLE-40X40X3", sku, name, desc, units=[unit], handling=STEEL_HANDLING, section_size=size, steel_family=family)


for a, t in ((25, 3), (25, 5), (30, 3), (30, 5), (40, 5), (40, 6), (50, 3), (50, 5), (50, 6), (65, 6), (75, 6), (75, 8), (100, 8), (100, 10)):
    steel(f"AA-STL-STR-ANGLE-{a}X{a}X{t}", f"Equal Angle {a} x {a} x {t} mm", f"Mild-steel equal angle, {a} x {a} x {t} mm, 6 m length.", f"{a} x {a} x {t} mm")
for a, b, t in ((50, 25, 3), (75, 50, 6), (100, 75, 8)):
    steel(f"AA-STL-STR-UNANGLE-{a}X{b}X{t}", f"Unequal Angle {a} x {b} x {t} mm", f"Mild-steel unequal angle, {a} x {b} x {t} mm, 6 m length.", f"{a} x {b} x {t} mm")
for w, t in ((20, 3), (25, 3), (25, 5), (30, 3), (30, 5), (40, 3), (40, 5), (50, 5), (50, 6), (75, 8), (100, 10)):
    steel(f"AA-STL-STR-FLAT-{w}X{t}", f"Flat Bar {w} x {t} mm", f"Mild-steel flat bar, {w} x {t} mm, 6 m length.", f"{w} x {t} mm")
for a, t in ((19, 1.6), (25, 1.6), (25, 2), (32, 1.6), (38, 1.6), (40, 2), (40, 3), (50, 3), (76, 2), (76, 3), (100, 3)):
    steel(f"AA-STL-STR-SQTUBE-{a}X{t:g}", f"Square Tube {a} x {a} x {t:g} mm", f"Square hollow section, {a} x {a} x {t:g} mm, 6 m length.", f"{a} x {a} x {t:g} mm")
for a, b, t in ((50, 25, 1.6), (50, 25, 2), (76, 38, 2), (100, 50, 2), (100, 50, 3), (150, 50, 3)):
    steel(f"AA-STL-STR-RECTUBE-{a}X{b}X{t:g}", f"Rectangular Tube {a} x {b} x {t:g} mm", f"Rectangular hollow section, {a} x {b} x {t:g} mm, 6 m length.", f"{a} x {b} x {t:g} mm")
for d, t in ((25.4, 1.6), (31.8, 1.6), (38.1, 1.6), (50.8, 2), (76.2, 2), (101.6, 3)):
    steel(f"AA-STL-STR-RNDTUBE-{d:g}X{t:g}".replace(".", "-"), f"Round Tube {d:g} x {t:g} mm", f"Round tube, {d:g} mm outside diameter x {t:g} mm wall, 6 m length.", f"{d:g} x {t:g} mm")
for d in (10, 12, 16, 20, 25):
    steel(f"AA-STL-STR-RNDBAR-{d}", f"Round Bar {d} mm", f"Mild-steel round bar, {d} mm, 6 m length (not rebar).", f"{d} mm round")
for d in (10, 12, 16):
    steel(f"AA-STL-STR-SQBAR-{d}", f"Square Bar {d} mm", f"Mild-steel square bar, {d} mm, 6 m length.", f"{d} mm square")
for depth in (100, 120, 140, 160, 180, 200, 240, 270, 300):
    steel(f"AA-STL-STR-IPE-{depth}", f"IPE {depth} I-Beam", f"Parallel-flange IPE {depth} I-beam. Length (6, 9 or 12 m) confirmed on the quote.", f"IPE {depth}",
          unit=("TONNE", "Tonne"))
for size in ("152 x 89 x 16", "203 x 133 x 25", "254 x 146 x 31", "305 x 165 x 40", "356 x 171 x 45", "406 x 178 x 54"):
    steel(f"AA-STL-STR-UB-{slug(size).upper()}", f"Universal Beam {size} kg/m", f"Universal beam (I-section) {size} kg/m. Length confirmed on the quote.", f"{size} kg/m",
          unit=("TONNE", "Tonne"))
for size in ("152 x 152 x 23", "152 x 152 x 30", "203 x 203 x 46", "254 x 254 x 73"):
    steel(f"AA-STL-STR-UC-{slug(size).upper()}", f"Universal Column {size} kg/m", f"Universal column (H-section) {size} kg/m. Length confirmed on the quote.", f"{size} kg/m",
          unit=("TONNE", "Tonne"))
for size in ("100 x 50", "140 x 60", "160 x 65", "180 x 70", "200 x 75", "260 x 90"):
    steel(f"AA-STL-STR-PFC-{slug(size).upper()}", f"Parallel-Flange Channel (PFC) {size} mm", f"Hot-rolled parallel-flange channel, {size} mm. Length confirmed on the quote.", f"{size} mm",
          unit=("TONNE", "Tonne"))
for size in ("75 x 50 x 20 x 2", "100 x 50 x 20 x 2", "125 x 50 x 20 x 2", "150 x 65 x 20 x 2.5", "200 x 75 x 20 x 2.5"):
    steel(f"AA-STL-STR-LIPPED-{slug(size).upper()}", f"Lipped Channel {size} mm", f"Cold-formed lipped channel (purlins and girts), {size} mm, 6 m length.", f"{size} mm")
for t in (3, 4.5, 6, 8, 10, 12, 16, 20):
    steel(f"AA-STL-STR-PLATE-{t:g}".replace(".", "-"), f"Steel Plate {t:g} mm (2500 x 1200)", f"Mild-steel plate, {t:g} mm, 2500 x 1200 mm sheet. Grade and cutting confirmed on the quote.",
          f"{t:g} x 2500 x 1200 mm", unit=("SHEET", "Sheet"))
for t in (0.8, 1.0, 1.6, 2.0):
    steel(f"AA-STL-STR-SHEET-{t:g}".replace(".", "-"), f"Steel Sheet {t:g} mm (2450 x 1225)", f"Cold-rolled or galvanised steel sheet, {t:g} mm, 2450 x 1225 mm.",
          f"{t:g} x 2450 x 1225 mm", unit=("SHEET", "Sheet"))
steel("AA-STL-STR-CHECKER", "Checker (Tread) Plate 3 mm", "Mild-steel checker plate, 3 mm (on plain), for stair treads and covers. Sheet size confirmed on the quote.", "3 mm",
      unit=("SHEET", "Sheet"))
steel("AA-STL-STR-EXPANDED", "Expanded Metal Mesh Sheet", "Expanded metal mesh sheet for screens, security and walkways. Pattern confirmed on the quote.", "Sheet",
      unit=("SHEET", "Sheet"))
for code, name, desc in (
    ("AA-STL-ACC-TIEWIRE-125", "Binding (Tie) Wire 1.25 mm", "Soft annealed tie wire, 1.25 mm, for tying rebar."),
    ("AA-STL-ACC-RECESS-SPACER", "Wheel Spacers for Columns and Walls (bag)", "Plastic wheel spacers that keep column and wall bars at the right cover."),
    ("AA-STL-ACC-SLAB-CHAIRS-HD", "Heavy-Duty High Chairs for Slabs (bag)", "Tall plastic or steel high chairs for the top mat in thick slabs."),
    ("AA-STL-ACC-ANCHOR-BOLTS", "Holding-Down (Anchor) Bolts", "Cast-in holding-down bolts for steel baseplates. Size confirmed on the quote."),
    ("AA-STL-ACC-CHEMICAL-ANCHOR", "Chemical Anchor (Resin) 400 ml", "Injection resin for anchoring rebar and bolts into concrete."),
):
    add("steel", "AA-STL-ACC-TIE-WIRE", code, name, desc, units=[("EACH", "Each")])


# =============================================================================================
# Mortars, grouts, adhesives & admixtures (b2b_packaged_catalogue.json)
# =============================================================================================
MORTAR_HANDLING = "Mix and apply to the maker's technical data sheet; keep bags dry and use within the shelf life."
for code, name, desc, unit in (
    ("AA-GRT-TILE-ADH-CERAMIC", "Ceramic Tile Adhesive 20 kg", "Cement-based adhesive for ceramic wall and floor tiles.", ("EACH", "20 kg bag")),
    ("AA-GRT-TILE-ADH-PORCELAIN", "Porcelain Tile Adhesive 20 kg", "Polymer-modified adhesive for porcelain and large-format tiles.", ("EACH", "20 kg bag")),
    ("AA-GRT-TILE-ADH-FLEX", "Flexible Tile Adhesive 20 kg", "Flexible adhesive for tile-on-tile, underfloor heating and slight movement.", ("EACH", "20 kg bag")),
    ("AA-GRT-TILE-ADH-RAPID", "Rapid-Set Tile Adhesive 20 kg", "Fast-setting tile adhesive for quick turnaround.", ("EACH", "20 kg bag")),
    ("AA-GRT-TILE-GROUT-5", "Wall & Floor Tile Grout 5 kg", "Cement-based tile grout. Colour confirmed on the quote.", ("EACH", "5 kg bag")),
    ("AA-GRT-TILE-GROUT-20", "Wall & Floor Tile Grout 20 kg", "Cement-based tile grout, 20 kg.", ("EACH", "20 kg bag")),
    ("AA-GRT-EPOXY-GROUT", "Epoxy Tile Grout 5 kg", "Stain- and chemical-resistant epoxy grout for kitchens, showers and pools.", ("EACH", "5 kg kit")),
    ("AA-GRT-BONDING-LIQUID-5", "Bonding Liquid 5 L", "PVA bonding liquid to improve plaster and screed adhesion.", ("EACH", "5 L")),
    ("AA-GRT-SBR-5", "SBR Bonding & Waterproofing Additive 5 L", "Styrene-butadiene rubber additive for bonding coats, repairs and water-resistant mortars.", ("EACH", "5 L")),
    ("AA-GRT-LATEX-ADDITIVE", "Latex Additive for Tile Adhesive 5 L", "Latex additive that makes adhesive and grout more flexible and water-resistant.", ("EACH", "5 L")),
    ("AA-GRT-PREMIX-PLASTER", "Premixed Plaster 40 kg", "Ready-blended plaster — just add water.", ("EACH", "40 kg bag")),
    ("AA-GRT-PREMIX-SCREED", "Premixed Screed 40 kg", "Ready-blended screed for floors.", ("EACH", "40 kg bag")),
    ("AA-GRT-SELF-LEVEL", "Self-Levelling Screed 25 kg", "Self-levelling underlayment for flat floors before vinyl, laminate or tiles.", ("BAG_25KG", "25 kg bag")),
    ("AA-GRT-REPAIR-MORTAR", "Concrete Repair Mortar 25 kg", "Polymer-modified repair mortar for spalled concrete and edges.", ("BAG_25KG", "25 kg bag")),
    ("AA-GRT-WATERPROOF-ADD", "Waterproofing Admixture for Mortar & Concrete", "Integral waterproofing admixture for plaster, mortar and concrete.", ("EACH", "Each")),
    ("AA-GRT-MORTAR-PLAST", "Mortar Plasticiser", "Plasticiser that improves workability of brick mortar and plaster in place of lime.", ("EACH", "Each")),
    ("AA-GRT-CURING", "Concrete Curing Compound 20 L", "Spray-on curing membrane that slows water loss from fresh concrete.", ("EACH", "20 L")),
    ("AA-GRT-RELEASE", "Shutter Release Agent 20 L", "Release agent for formwork so concrete strips cleanly.", ("EACH", "20 L")),
    ("AA-GRT-FIBRES", "Polypropylene Concrete Fibres (bag)", "Micro-fibres added to concrete and screeds to control plastic shrinkage cracking.", ("EACH", "Bag")),
    ("AA-GRT-EPOXY-ANCHOR", "Epoxy Bonding Agent (new-to-old concrete) 1 kg", "Epoxy bonding agent for joining new concrete to old.", ("EACH", "1 kg kit")),
):
    add("packaged", "AA-GRT-NSHRINK-001", code, name, desc, units=[unit], handling=MORTAR_HANDLING)


# =============================================================================================
# Write
# =============================================================================================
def main():
    all_slugs, all_skus = {}, {}
    for cat, data in CATS.items():
        data["products"] = [p for p in data["products"] if p.get("_range") != OWNED]
        for p in data["products"]:
            all_slugs[p["slug"]] = p["sku"]
            all_skus[p["sku"]] = cat
    # Other catalogues' slugs and SKUs (aggregates, ready-mix) must not collide either.
    for f in ("pricing_framework.json", "additional_aggregates.json", "ready_mix_catalogue.json"):
        for p in json.loads((DATA / f).read_text(encoding="utf-8"))["products"]:
            if p.get("slug"):
                all_slugs[p["slug"]] = p.get("sku", p["name"])
            if p.get("sku"):
                all_skus[p["sku"]] = f
    added = 0
    for cat, products in ADDED.items():
        for p in products:
            if p["sku"] in all_skus:
                sys.exit(f"duplicate SKU {p['sku']} (already in {all_skus[p['sku']]})")
            if p["slug"] in all_slugs:
                sys.exit(f"duplicate slug {p['slug']} ({p['sku']} vs {all_slugs[p['slug']]})")
            all_skus[p["sku"]] = cat
            all_slugs[p["slug"]] = p["sku"]
        CATS[cat]["products"].extend(products)
        added += len(products)
    for cat, f in FILES.items():
        (DATA / f).write_text(json.dumps(CATS[cat], ensure_ascii=False, indent=INDENT.get(cat, 1)) + "\n", encoding="utf-8")
        print(f"{f}: {len(CATS[cat]['products'])} products ({len(ADDED[cat])} from range depth)")
    print(f"added {added}")


if __name__ == "__main__":
    main()
