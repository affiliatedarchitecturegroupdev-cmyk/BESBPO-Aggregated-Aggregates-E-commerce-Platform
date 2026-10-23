"""Wave A (ROADMAP 2.2): Timber, Poles & Decking; Garden, Lawn & Landscaping; Outdoor Living."""
from .common import EACH, KG, LM, M2, P, category, code, fmt

# =============================================================================================================
# Timber, Poles & Decking — the existing roof & structural timber department, widened (CAT-57..62)
# =============================================================================================================
TIMBER = "timber"
POLE_HANDLING = (
    "Treated timber must carry the treater's brand and hazard class. Wear gloves and a dust mask when cutting, "
    "treat every cut end with preservative, and never burn off-cuts of CCA- or creosote-treated timber."
)
POLES = category(
    "treated-poles-droppers", "Treated Poles, Droppers & Laths", "CAT-57", TIMBER,
    "SANS 457 CCA- and creosote-treated eucalyptus and pine poles from 50 to 250 mm diameter and 1.8 to 9 m long, half-rounds, droppers, laths and vineyard poles.",
    ["Fencing, carports and pergolas", "Lapas, shade structures and pole buildings", "Vineyards, orchards and farm work"],
    POLE_HANDLING,
)
pole_lengths = {
    "50–75": (1.8, 2.1, 2.4, 3.0, 3.6, 4.2),
    "75–100": (1.8, 2.1, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0),
    "100–125": (2.1, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0, 7.2),
    "125–150": (2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0, 7.2, 9.0),
    "150–175": (2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0, 7.2, 9.0),
    "175–200": (3.0, 3.6, 4.2, 4.8, 6.0, 7.2, 9.0),
    "200–225": (3.6, 4.2, 4.8, 6.0, 7.2, 9.0),
    "225–250": (4.8, 6.0, 7.2, 9.0),
}
for dia, lengths in pole_lengths.items():
    for length in lengths:
        P(code("AA-TMB-POLE-CCA", dia.replace("–", ""), fmt(length)), f"CCA Treated Pole {dia} mm × {fmt(length)} m", POLES,
          "SANS 457 wooden pole, CCA treated to SANS 10005 (H4, in-ground)",
          f"Round CCA-treated eucalyptus or pine pole, {dia} mm diameter at the top, {fmt(length)} m long — for fencing, carports, pergolas and pole structures. "
          "Species and treatment certificate confirmed on the quote.", EACH, f"{dia} mm × {fmt(length)} m")
for dia in ("75–100", "100–125"):
    for length in (1.8, 2.1, 2.4):
        P(code("AA-TMB-HALFPOLE", dia.replace("–", ""), fmt(length)), f"CCA Treated Half-Round Pole {dia} mm × {fmt(length)} m", POLES,
          "SANS 457 wooden pole, CCA treated (H4)", f"Split half-round treated pole, {dia} mm, {fmt(length)} m — for post-and-rail fencing, edging and garden work.", EACH)
for dia in ("150–175", "175–200", "200–225", "225–250"):
    for length in (6.0, 7.2, 9.0, 11.0):
        P(code("AA-TMB-POLE-CREO", dia.replace("–", ""), fmt(length)), f"Creosote Treated Pole {dia} mm × {fmt(length)} m", POLES,
          "SANS 457 wooden pole, creosote treated (H5)",
          f"Heavy-duty creosote-treated pole, {dia} mm × {fmt(length)} m, for utility, farm and structural use where poles stand in wet ground. Sold on order.", EACH)
for size, length in (("25–38", 1.2), ("25–38", 1.5), ("25–38", 1.8), ("38–50", 1.5), ("38–50", 1.8), ("38–50", 2.1)):
    P(code("AA-TMB-DROPPER", size.replace("–", ""), fmt(length)), f"Treated Dropper {size} mm × {fmt(length)} m", POLES,
      "SANS 457 dropper, CCA treated", f"Round treated dropper, {size} mm × {fmt(length)} m, for spacing fence wires between posts.", (("EACH", "Each"), ("BUNDLE", "Bundle (confirmed on quote)")))
for length in (1.8, 2.4, 3.0, 3.6):
    P(code("AA-TMB-LATH", fmt(length)), f"Treated Split Lath 38 × 19 mm × {fmt(length)} m", POLES, "SANS 457 lath, CCA treated",
      f"Treated split lath, {fmt(length)} m, for trellises, vineyard work and light fencing.", (("EACH", "Each"), ("BUNDLE", "Bundle (confirmed on quote)")))
for dia, length in (("50–75", 2.4), ("50–75", 2.7), ("75–100", 2.4), ("75–100", 2.7), ("75–100", 3.0)):
    P(code("AA-TMB-VINEPOLE", dia.replace("–", ""), fmt(length)), f"Vineyard & Orchard Pole {dia} mm × {fmt(length)} m", POLES,
      "SANS 457 wooden pole, CCA treated (H4)", f"Treated pole for vineyard and orchard trellis lines, {dia} mm × {fmt(length)} m. Volumes quoted per load.", EACH)

ENG = category(
    "engineered-timber", "Engineered Timber & Glulam", "CAT-58", TIMBER,
    "Glued-laminated (glulam) beams from 65 × 180 to 135 × 630 mm, timber I-joists, LVL, finger-jointed PAR pine and laminated pine panels.",
    ["Long-span roofs and exposed beams", "Floors and mezzanines", "Joinery, shelving and built-ins"],
    "Store engineered timber flat on bearers, under cover and dry. Glulam and LVL sizes are designed by an engineer for the span and load — send the drawing with your quote.",
)
for width, depths in ((65, (180, 225, 270, 315)), (90, (225, 270, 315, 360, 405)), (115, (270, 315, 360, 405, 450, 495)), (135, (360, 405, 450, 495, 540, 585, 630))):
    for depth in depths:
        P(code("AA-TMB-GLULAM", width, depth), f"Glulam Beam {width} × {depth} mm", ENG, "SANS 1460 laminated timber (glulam)",
          f"Glued-laminated SA pine beam, {width} × {depth} mm, made to the length on your quote (up to the laminator's maximum) — for exposed and long-span beams.", LM)
for depth in (200, 240, 300, 360):
    P(code("AA-TMB-IJOIST", depth), f"Timber I-Joist {depth} mm", ENG, "Engineered timber I-joist, to the maker's span tables",
      f"Engineered timber I-joist, {depth} mm deep, for timber floors and flat roofs — sized from the maker's span tables for your layout.", LM)
for thickness, depth in ((45, 200), (45, 240), (45, 300), (45, 360), (63, 300), (63, 360), (75, 400)):
    P(code("AA-TMB-LVL", thickness, depth), f"LVL Beam {thickness} × {depth} mm", ENG, "Laminated veneer lumber (LVL), structural grade",
      f"Laminated veneer lumber beam, {thickness} × {depth} mm — lintels, beams and headers where solid timber won't span.", LM)
for size in ("22 × 44", "22 × 69", "22 × 94", "22 × 144", "32 × 69", "32 × 94", "32 × 144", "44 × 69"):
    P(code("AA-TMB-FJPAR", size.replace(" × ", "X")), f"Finger-Jointed PAR Pine {size} mm", ENG, "Finger-jointed, planed all round (PAR) SA pine",
      f"Clear finger-jointed pine, planed all round, {size} mm — for trims, frames, shelving and joinery. Sold per metre in the lengths available.", LM)
for width in (300, 400, 500, 600):
    for length in (1.8, 2.4):
        P(code("AA-TMB-LAMPANEL", width, fmt(length)), f"Laminated Pine Panel 18 × {width} mm × {fmt(length)} m", ENG, "Edge-glued laminated pine panel",
          f"Edge-glued laminated pine board, 18 mm thick, {width} mm wide, {fmt(length)} m long — for shelving, tops and furniture.", EACH)

HARD = category(
    "hardwoods-par-timber", "Hardwoods & PAR Timber", "CAT-59", TIMBER,
    "Meranti and saligna planed all round (PAR) from 19 × 44 to 76 × 76 mm, and pine PAR — for door and window frames, joinery and trims, sold per metre.",
    ["Door and window frames", "Joinery, furniture and shelving", "Trims, beads and handrails"],
    "Keep hardwood flat, under cover and out of the sun until it's fixed. Pre-drill hardwood for nails and screws near the ends, and seal or oil exposed faces.",
)
PAR_SIZES = ("19 × 44", "19 × 69", "19 × 94", "19 × 144", "22 × 44", "22 × 69", "22 × 94", "22 × 144", "22 × 220", "32 × 44", "32 × 69", "32 × 94", "32 × 144", "32 × 220", "38 × 38", "38 × 76", "38 × 114", "44 × 69", "50 × 76", "76 × 76")
for species, std, note in (
    ("Meranti", "Imported meranti (dark red), PAR", "Meranti — the joiner's standard for frames, doors and trims"),
    ("Saligna", "SA eucalyptus saligna (grandis), kiln-dried PAR", "South African saligna — a hard, stable local hardwood for frames and furniture"),
    ("Pine", "SA pine, kiln-dried PAR", "Clear kiln-dried pine — for trims, shelving and painted joinery"),
):
    for size in PAR_SIZES:
        P(code("AA-TMB-PAR", species, size.replace(" × ", "X")), f"{species} PAR {size} mm", HARD, std,
          f"{note}, planed all round to {size} mm. Sold per metre; lengths from the supplier's stock are confirmed on the quote.", LM)

DECK = category(
    "decking-cladding", "Decking, Cladding & Battens", "CAT-60", TIMBER,
    "Treated pine, balau and garapa decking, composite deck boards, deck joists and screws, shiplap, log-lap and tongue-and-groove cladding and ceiling boards, and battens.",
    ["Decks, patios and pool surrounds", "Wall cladding and ceilings", "Battens for roofing, ceilings and boards"],
    "Leave decking stacked flat with spacers for a few days on site before fixing, keep 5 mm gaps between boards, use stainless or coated deck screws, and oil the deck before and after laying.",
)
for size in ("22 × 69", "32 × 69", "32 × 94", "32 × 114", "38 × 114", "38 × 152"):
    P(code("AA-TMB-DECK-PINE", size.replace(" × ", "X")), f"Treated Pine Decking {size} mm (H3)", DECK, "SA pine, CCA treated H3 (above ground, exterior)",
      f"Treated pine deck board, {size} mm, reeded or smooth — for decks and walkways. Sold per metre; lengths confirmed on the quote.", LM)
for species, sizes in (("Balau", ("19 × 90", "19 × 140", "21 × 145")), ("Garapa", ("19 × 90", "21 × 145"))):
    for size in sizes:
        P(code("AA-TMB-DECK", species, size.replace(" × ", "X")), f"{species} Hardwood Decking {size} mm", DECK, f"Imported {species.lower()} hardwood decking, kiln-dried",
          f"Dense {species.lower()} hardwood deck board, {size} mm — durable, for decks, pool surrounds and boardwalks. Sold per metre.", LM)
for colour in ("Grey", "Charcoal", "Teak", "Walnut"):
    for length in (3.6, 5.4):
        P(code("AA-TMB-DECK-WPC", colour, fmt(length)), f"Composite Deck Board 140 × 25 mm × {fmt(length)} m, {colour}", DECK, "Wood-plastic composite (WPC) decking",
          f"Hollow wood-plastic composite deck board, {colour.lower()}, {fmt(length)} m — no oiling, for decks and pool surrounds. Fixed with hidden clips.", EACH)
for size in ("38 × 114", "38 × 152", "50 × 152", "50 × 228"):
    P(code("AA-TMB-JOIST", size.replace(" × ", "X")), f"Treated Pine Deck Joist {size} mm (H3)", DECK, "SA pine S5, CCA treated H3",
      f"S5 treated pine joist, {size} mm, for deck sub-frames. Sold per metre.", LM)
for name, desc, unit_label in (
    ("Stainless Steel Deck Screw 4 × 40 mm (pack of 200)", "Stainless deck screws for 19–22 mm hardwood decking.", "Pack (200)"),
    ("Stainless Steel Deck Screw 5 × 60 mm (pack of 200)", "Stainless deck screws for 32–38 mm pine decking.", "Pack (200)"),
    ("Coated Deck Screw 5 × 60 mm (pack of 500)", "Corrosion-coated deck screws for treated pine.", "Pack (500)"),
    ("Composite Deck Hidden Clips & Screws (pack of 100)", "Hidden fixing clips for composite deck boards.", "Pack (100)"),
):
    P(code("AA-TMB-DECKFIX", name), name, DECK, "Deck fixing", desc, (("PACK", unit_label),))
P("AA-TMB-DECK-STARTER", "Composite Deck Starter Clips (pack of 20)", DECK, "Deck fixing", "Starter clips for the first composite deck board.", (("PACK", "Pack (20)"),))
P("AA-TMB-DECK-FASCIA", "Composite Deck Fascia Board 2.2 m", DECK, "WPC fascia", "Composite fascia for finishing deck edges.", EACH)
for profile, sizes in (("Shiplap Cladding", ("16 × 94", "22 × 144")), ("Log-Lap Cladding", ("22 × 144", "32 × 144")), ("Tongue & Groove", ("12 × 94", "16 × 94", "19 × 94", "22 × 144"))):
    for size in sizes:
        P(code("AA-TMB", profile, size.replace(" × ", "X")), f"Pine {profile} {size} mm", DECK, "SA pine, kiln-dried, treated on request",
          f"Pine {profile.lower()}, {size} mm — for walls, Wendy houses and ceilings. Sold per metre; treated (H3) for exterior use on request.", LM)
for size in ("25 × 38", "25 × 50", "38 × 38", "38 × 50"):
    P(code("AA-TMB-BATTEN", size.replace(" × ", "X")), f"Treated Pine Batten {size} mm", DECK, "SA pine, CCA treated H2/H3",
      f"Treated pine batten, {size} mm, for roof tiles, ceilings, cladding and boards. Sold per metre or by the bundle.", LM + (("BUNDLE", "Bundle (confirmed on quote)"),))

MINE = category(
    "industrial-mining-timber", "Industrial & Mining Timber", "CAT-61", TIMBER,
    "Mining props and pack timber, treated pine and hardwood sleepers, and crate, pallet and rough-sawn industrial timber by the cubic metre.",
    ["Mine support and packs", "Crates, pallets and packaging", "Garden sleepers, retaining and steps"],
    "Industrial and mining timber is sold by the load. Specifications (species, moisture, treatment and tolerances) follow the buyer's or mine's specification — send it with the quote.",
)
for dia in ("100–125", "125–150", "150–175", "175–200", "200–225"):
    for length in (1.2, 1.5, 1.8, 2.1, 2.4, 3.0):
        P(code("AA-TMB-MINEPROP", dia.replace("–", ""), fmt(length)), f"Mining Prop {dia} mm × {fmt(length)} m", MINE, "Eucalyptus mining prop, to the mine's specification",
          f"Eucalyptus mining prop, {dia} mm × {fmt(length)} m, debarked — sold by the load to the mine's specification.", EACH)
for name, desc in (
    ("Mining Pack Timber (mat packs), per m³", "Rough-sawn eucalyptus for pack and mat construction underground."),
    ("Rough-Sawn Pine Crate Timber, per m³", "Rough-sawn pine in crate and packaging sizes, sizes confirmed on the quote."),
    ("Pallet Timber (Kiln-Dried, ISPM 15 heat-treated), per m³", "Pallet-grade pine, heat-treated and stamped for export packaging (ISPM 15)."),
    ("Rough-Sawn Eucalyptus Industrial Timber, per m³", "Rough-sawn eucalyptus for cribbing, blocking and industrial use."),
):
    P(code("AA-TMB-IND", name), name, MINE, "Industrial timber, to the buyer's specification", desc, (("CUBIC_METRE", "Per m³"),))
for name, size in (("Treated Pine Sleeper", "150 × 75 mm × 2.4 m"), ("Treated Pine Sleeper", "200 × 100 mm × 2.4 m"), ("Treated Pine Sleeper", "228 × 114 mm × 2.4 m"),
                   ("Hardwood Sleeper (Reclaimed)", "250 × 150 mm × 2.4 m"), ("Hardwood Sleeper (New)", "250 × 150 mm × 2.4 m"), ("Hardwood Sleeper Half", "250 × 150 mm × 1.2 m")):
    P(code("AA-TMB-SLEEPER", name, size), f"{name} {size}", MINE, "Treated pine (H4) or hardwood sleeper",
      f"{name}, {size}, for garden steps, retaining edges, raised beds and landscaping.", EACH)

KITS = category(
    "timber-structure-kits", "Carport, Pergola & Lapa Kits", "CAT-62", TIMBER,
    "Treated-pole and sawn-timber kits for single and double carports, pergolas from 3 × 3 to 6 × 6 m and round lapas from 5 to 10 m — poles, beams, purlins and fixings, with roofing to order.",
    ["Home carports and patio pergolas", "Lapas and entertainment areas", "Farm and lodge shade structures"],
    "Kits are supplied unassembled with a parts list. Footings, height and any roofing are confirmed on the quote — structures over the National Building Regulations' exemptions need approved plans.",
)
for kind, sizes in (("Pole Carport Kit", ("Single 3 × 6 m", "Double 6 × 6 m", "Triple 9 × 6 m")),
                    ("Pole Pergola Kit", ("3 × 3 m", "3 × 4.5 m", "4 × 4 m", "4.5 × 6 m", "6 × 6 m")),
                    ("Sawn-Timber Pergola Kit", ("3 × 3 m", "3 × 4.5 m", "4.5 × 6 m")),
                    ("Round Lapa Pole Frame (thatch-ready)", ("5 m", "6 m", "8 m", "10 m")),
                    ("Square Lapa Pole Frame (thatch-ready)", ("5 × 5 m", "6 × 6 m"))):
    for size in sizes:
        P(code("AA-TMB-KIT", kind, size), f"{kind} {size}", KITS, "Treated pole and timber kit (H3/H4), to the supplier's design",
          f"{kind}, {size}: treated poles, beams, purlins and fixings with a parts list — roofing (IBR, shade net, polycarbonate or thatch) added on the quote.", EACH)

# =============================================================================================================
# Garden, Lawn & Landscaping (CAT-63..68)
# =============================================================================================================
GARDEN = "garden-landscaping"
LAWN = category(
    "instant-lawn-seed", "Instant Lawn & Lawn Seed", "CAT-63", GARDEN,
    "Kikuyu, LM, buffalo, Cynodon, Zoysia, paspalum and kweek instant lawn per m² or by the pallet, and lawn seed — delivered fresh from the grower.",
    ["New gardens and complexes", "Patching and replacing lawn", "Sports fields and estates"],
    "Instant lawn is perishable: lay it on the day it arrives, on prepared, levelled and watered soil, and water daily for the first two weeks. Delivery days follow the grower's cutting schedule.",
)
for grass, desc in (
    ("Kikuyu", "hard-wearing and fast-growing — the sunny-garden standard"),
    ("LM Berea", "soft, low-maintenance and tolerates some shade"),
    ("Buffalo (Shade-Tolerant)", "broad-leaf grass for semi-shade and coastal gardens"),
    ("Cynodon (Royal Cape Type)", "fine, drought-tolerant grass for full sun"),
    ("Cynodon Fine-Leaf Hybrid", "fine-textured grass for estates, bowling and golf surfaces"),
    ("Zoysia", "dense, slow-growing, low-mowing lawn"),
    ("Seashore Paspalum", "salt-tolerant grass for coastal and borehole-irrigated gardens"),
    ("Kweek", "indigenous couch grass, hardy and drought-tolerant"),
):
    P(code("AA-GDN-LAWN", grass), f"{grass} Instant Lawn", LAWN, "Instant lawn, cut to order by the grower",
      f"{grass} instant lawn in rolls or slabs: {desc}. Sold per m² or by the pallet (m² per pallet confirmed with the grower).", M2 + (("PACK", "Pallet (m² on quote)"),))
for seed, sizes in (("Kikuyu Lawn Seed", ("500 g", "1 kg", "5 kg")), ("Evergreen Lawn Seed Mix (cool-season)", ("1 kg", "5 kg")), ("Cynodon Lawn Seed", ("500 g", "1 kg")), ("Lawn Patch Seed Mix", ("1 kg",))):
    for size in sizes:
        P(code("AA-GDN-SEED", seed, size), f"{seed} {size}", LAWN, "Registered lawn seed", f"{seed}, {size} pack, for new lawns and over-seeding.", EACH)

SOIL = category(
    "soils-compost-mulch", "Soils, Compost & Mulch", "CAT-64", GARDEN,
    "Topsoil, compost, manure, lawn dressing, potting and seedling mixes, bark nuggets and mulch, vermiculite and perlite — bagged, or bulk by the m³ on a tipper.",
    ["Preparing beds and new lawns", "Top-dressing and mulching", "Pots, planters and seedlings"],
    "Bulk soils are delivered by tipper and tipped where the truck can reach — keep the drop-off clear. Bagged growing media keep best out of the sun and rain.",
)
for name, desc in (
    ("Topsoil", "screened topsoil for beds and levelling"),
    ("General Compost", "matured compost to dig into beds"),
    ("Mushroom Compost", "spent mushroom compost — rich soil conditioner"),
    ("Kraal Manure", "composted kraal manure for beds and vegetable gardens"),
    ("Lawn Dressing", "fine screened dressing for top-dressing and levelling lawns"),
    ("Potting Soil", "general potting medium for pots and planters"),
    ("Pine Bark Nuggets", "decorative bark mulch for beds"),
    ("Pine Bark Mulch (fine)", "fine bark mulch to keep moisture in"),
    ("Acid Compost", "acid compost for azaleas, camellias and blueberries"),
    ("Palm & Cycad Mix", "free-draining mix for palms and cycads"),
):
    for size in ("30 dm³", "50 dm³"):
        P(code("AA-GDN-SOIL", name, size), f"{name} {size} Bag", SOIL, "Bagged growing medium", f"{name}: {desc}. {size} bag.", EACH)
for name in ("Seedling Mix", "Cactus & Succulent Mix", "Vermiculite", "Perlite", "Coir (Coco Peat) Block"):
    P(code("AA-GDN-MEDIA", name), f"{name} 5 dm³", SOIL, "Bagged growing medium", f"{name} in a 5 dm³ pack, for seedlings, pots and soil mixes.", EACH)
for name in ("Topsoil", "Screened Topsoil", "Topsoil & Compost Blend", "General Compost", "Mushroom Compost", "Kraal Manure", "Lawn Dressing", "Pine Bark Nuggets"):
    P(code("AA-GDN-BULK", name), f"{name}, Bulk", SOIL, "Bulk growing medium, by the tipper load",
      f"{name} delivered loose by tipper truck, per m³ (6 m³ and 10 m³ loads typical).", (("CUBIC_METRE", "Per m³"),))

FERT = category(
    "fertiliser-lawn-care", "Fertiliser & Lawn Care", "CAT-65", GARDEN,
    "Lawn and garden fertilisers (7:1:3, 2:3:2, 3:1:5, LAN, superphosphate), slow-release and organic feeds, bonemeal, garden lime and weed-and-feed — from 2 to 50 kg.",
    ["Feeding lawns through the season", "Vegetable and flower beds", "Preparing soil before planting"],
    "Fertilisers are registered under the Fertilizers Act (Act 36 of 1947): follow the label rates, water in after spreading, and store bags dry, sealed and away from children and animals.",
)
for name, desc, sizes in (
    ("Lawn Fertiliser 7:1:3 (28)", "high-nitrogen lawn feed for spring and summer growth", ("5 kg", "10 kg", "25 kg", "50 kg")),
    ("Fertiliser 2:3:2 (22)", "general fertiliser for planting and flower beds", ("2 kg", "5 kg", "10 kg", "50 kg")),
    ("Fertiliser 3:1:5 (26)", "for flowering, fruiting and lawns in autumn", ("2 kg", "5 kg", "10 kg", "50 kg")),
    ("Fertiliser 5:1:5 (17)", "balanced feed for shrubs, roses and fruit trees", ("5 kg", "50 kg")),
    ("LAN Fertiliser (28)", "limestone ammonium nitrate — fast greening for lawns", ("2 kg", "5 kg", "10 kg", "50 kg")),
    ("Superphosphate (10.5)", "phosphate for root growth at planting", ("2 kg", "5 kg", "50 kg")),
    ("Slow-Release Lawn Fertiliser", "coated slow-release feed — one application lasts for months", ("5 kg", "10 kg", "25 kg")),
    ("Organic Pelleted Chicken Manure", "pelleted organic fertiliser", ("5 kg", "25 kg")),
    ("Bonemeal", "organic phosphate for planting bulbs, shrubs and trees", ("2 kg", "5 kg")),
    ("Weed & Feed Lawn Fertiliser", "lawn fertiliser with broadleaf weed control", ("5 kg", "10 kg")),
    ("Garden Lime (Dolomitic)", "raises soil pH and adds calcium and magnesium", ("5 kg", "25 kg")),
    ("Agricultural Gypsum", "conditions heavy clay and saline soils", ("25 kg",)),
    ("Epsom Salts (Magnesium Sulphate)", "magnesium supplement for yellowing leaves", ("1 kg", "5 kg")),
    ("Iron Chelate", "corrects iron deficiency in lawns and plants", ("1 kg",)),
    ("Liquid Seaweed Plant Tonic", "liquid plant tonic and root stimulant", ("1 L", "5 L")),
    ("Liquid Lawn Fertiliser", "liquid feed applied with a hose-end sprayer", ("1 L", "5 L")),
):
    for size in sizes:
        P(code("AA-GDN-FERT", name, size), f"{name} {size}", FERT, "Registered under Act 36 of 1947", f"{name}: {desc}. {size}.", EACH)

IRR = category(
    "irrigation-hoses", "Irrigation, Sprinklers & Hoses", "CAT-66", GARDEN,
    "LDPE irrigation pipe and insert fittings, drip line and drippers, pop-up sprays and rotors, impact and garden sprinklers, controllers, solenoid valves, filters, garden hose and fittings.",
    ["Automatic garden irrigation", "Vegetable gardens, tunnels and orchards", "Watering lawns and beds"],
    "Design the system by zone so each valve's flow stays within your water supply — we confirm pipe sizes and zones on the quote. Flush pipes before fitting emitters and nozzles.",
)
for size in (15, 20, 25, 32):
    for length in (25, 50, 100):
        P(code("AA-GDN-LDPE", size, length), f"LDPE Irrigation Pipe {size} mm × {length} m", IRR, "LDPE irrigation pipe, Class 3",
          f"Low-density polyethylene irrigation pipe, {size} mm, {length} m roll — main and lateral lines for sprinklers and drip.", (("ROLL", f"Roll ({length} m)"),))
for fitting in ("Elbow", "Tee", "Straight Coupler", "End Stop", "Male Adaptor", "Female Adaptor"):
    for size in (15, 20, 25):
        P(code("AA-GDN-FIT", fitting, size), f"Irrigation {fitting} {size} mm", IRR, "LDPE insert or compression irrigation fitting",
          f"{fitting} for {size} mm LDPE irrigation pipe.", (("EACH", "Each"), ("PACK", "Pack (10)")))
for name, desc, unit_label in (
    ("Drip Line 16 mm, Emitters at 30 cm, 100 m", "In-line drip tube for beds and vegetable rows.", "Roll (100 m)"),
    ("Drip Line 16 mm, Emitters at 50 cm, 100 m", "In-line drip tube for shrubs and orchards.", "Roll (100 m)"),
    ("Blank Drip Tube 16 mm, 100 m", "Blank tube for drip feeder lines.", "Roll (100 m)"),
    ("Spaghetti Micro-Tube 4 mm, 50 m", "Micro tube from lateral to emitter.", "Roll (50 m)"),
):
    P(code("AA-GDN-DRIP", name), name, IRR, "Drip irrigation tube", desc, (("ROLL", unit_label),))
for flow in (2, 4, 8):
    P(code("AA-GDN-DRIPPER", flow), f"Pressure-Compensating Dripper {flow} L/h (pack of 50)", IRR, "Drip emitter", f"Button dripper delivering {flow} L/h.", (("PACK", "Pack (50)"),))
for name, desc in (
    ("Micro-Sprayer on Stake (pack of 10)", "Micro-sprayer for beds and pots."),
    ("Drip Fittings Kit 16 mm", "Joiners, tees, elbows and end caps for 16 mm drip line."),
    ("Drip Irrigation Starter Kit (Vegetable Garden)", "Drip kit for a vegetable garden of about 10 m²."),
    ("Drip Irrigation Kit (Pots & Planters)", "Drip kit for up to 20 pots and planters."),
    ("Pop-Up Spray Head 4 in (100 mm)", "Pop-up spray body for lawns — fit the nozzle for the pattern."),
    ("Pop-Up Spray Head 6 in (150 mm)", "Taller pop-up for beds and longer grass."),
    ("Pop-Up Spray Head 12 in (300 mm)", "High pop-up for shrub beds."),
    ("Spray Nozzle, Adjustable Arc", "Adjustable 0–360° spray nozzle."),
    ("Spray Nozzle, Quarter Circle (90°)", "Fixed 90° nozzle for corners."),
    ("Spray Nozzle, Half Circle (180°)", "Fixed 180° nozzle for edges."),
    ("Spray Nozzle, Full Circle (360°)", "Fixed 360° nozzle for open lawn."),
    ("Gear-Driven Rotor Sprinkler", "Rotor for large lawns, 8–15 m throw."),
    ("Impact Sprinkler ½ in", "Brass or plastic impact sprinkler on a riser or spike."),
    ("Impact Sprinkler ¾ in", "Larger impact sprinkler for fields and paddocks."),
    ("Oscillating Garden Sprinkler", "Hose-fed oscillating sprinkler for rectangles."),
    ("Spike Garden Sprinkler (Rotating)", "Hose-fed rotating sprinkler on a spike."),
    ("Swing Joint Riser ½ in", "Flexible riser between pipe and sprinkler."),
    ("Saddle Clamp", "Tapping saddle for branching off LDPE or HDPE pipe."),
):
    P(code("AA-GDN-IRR", name), name, IRR, "Garden irrigation component", desc, (("PACK", "Pack (10)"),) if "pack of 10" in name else EACH)
for stations in (4, 6, 8, 12):
    P(code("AA-GDN-CTRL", stations), f"Irrigation Controller {stations}-Station (Indoor/Outdoor)", IRR, "24 V AC irrigation controller",
      f"Programmable irrigation controller for {stations} valve zones, with rain-sensor input.", EACH)
for name in ("Wi-Fi Irrigation Controller 8-Station", "Battery Tap Timer (Single Outlet)", "Battery Tap Timer (Dual Outlet)", "Rain Sensor"):
    P(code("AA-GDN-CTRL", name), name, IRR, "Irrigation control", f"{name} for automatic watering.", EACH)
for size in ("20 mm (¾ in)", "25 mm (1 in)"):
    P(code("AA-GDN-SOLENOID", size), f"Irrigation Solenoid Valve {size}, 24 V AC", IRR, "24 V AC irrigation solenoid valve", f"{size} solenoid zone valve with flow control.", EACH)
for name in ("Valve Box, Round 150 mm", "Valve Box, Rectangular (Jumbo)", "Irrigation Cable 2-Core (per metre)", "Irrigation Cable 7-Core (per metre)", "Waterproof Wire Connectors (pack of 10)"):
    units = LM if "per metre" in name else ((("PACK", "Pack (10)"),) if "pack" in name else EACH)
    P(code("AA-GDN-IRRAUX", name), name, IRR, "Irrigation component", f"{name} for irrigation installations.", units)
for size in ("¾ in", "1 in", "1½ in"):
    P(code("AA-GDN-FILTER", size), f"Irrigation Disc Filter {size}", IRR, "120-mesh disc filter", f"Disc filter, {size}, to protect drippers and sprinklers.", EACH)
for dia in (12, 20):
    for length in (15, 20, 30):
        P(code("AA-GDN-HOSE", dia, length), f"Garden Hose {dia} mm × {length} m with Fittings", IRR, "Reinforced PVC garden hose",
          f"Reinforced garden hose, {dia} mm, {length} m, with tap connector and nozzle.", EACH)
for name in ("Hose Connector (pack of 2)", "Tap Adaptor ½ in / ¾ in", "Hose Spray Gun (Multi-Pattern)", "Hose Reel Cart (up to 60 m)", "Wall-Mounted Hose Reel", "Soaker Hose 15 m"):
    P(code("AA-GDN-HOSEFIT", name), name, IRR, "Garden hose accessory", f"{name}.", EACH)

STRUCT = category(
    "garden-structures-edging", "Planters, Edging & Artificial Grass", "CAT-67", GARDEN,
    "Fibre-cement, concrete and plastic planters, raised beds, plastic, steel and timber edging, artificial grass from 20 to 40 mm pile, trellis panels and garden arches.",
    ["Courtyards, balconies and entrances", "Vegetable and herb gardens", "Low-water lawns and play areas"],
    "Artificial grass goes down on a compacted, levelled and drained base (crusher dust or G5 with a weed barrier). Planters need drainage holes and a free-draining layer.",
)
for shape, sizes in (("Round Fibre-Cement Planter", (400, 600, 800, 1000)), ("Square Fibre-Cement Planter", (400, 600, 800)), ("Round Concrete Planter", (450, 600, 900)), ("Plastic Pot (Black)", (200, 300, 400, 500))):
    for size in sizes:
        P(code("AA-GDN-PLANTER", shape, size), f"{shape} {size} mm", STRUCT, "Garden planter", f"{shape}, {size} mm, with a drainage hole.", EACH)
for name in ("Timber Raised Bed Kit 1.2 × 1.2 m", "Timber Raised Bed Kit 2.4 × 1.2 m", "Galvanised Steel Raised Bed 1.2 × 0.6 m", "Galvanised Steel Raised Bed 2.4 × 0.9 m", "Plastic Compost Bin 220 L"):
    P(code("AA-GDN-BED", name), name, STRUCT, "Garden bed kit", f"{name}, supplied flat for assembly.", EACH)
for name, units in (("Plastic Lawn Edging 100 mm × 10 m", (("ROLL", "Roll (10 m)"),)), ("Plastic Lawn Edging 150 mm × 10 m", (("ROLL", "Roll (10 m)"),)),
                    ("Galvanised Steel Garden Edging 100 mm × 1.2 m", EACH), ("Galvanised Steel Garden Edging 150 mm × 1.2 m", EACH),
                    ("Timber Log-Roll Edging 150 mm × 1.8 m", EACH), ("Timber Log-Roll Edging 300 mm × 1.8 m", EACH), ("Edging Pegs (pack of 10)", (("PACK", "Pack (10)"),))):
    P(code("AA-GDN-EDGE", name), name, STRUCT, "Garden edging", f"{name} for lawn and bed edges.", units)
for pile in (20, 25, 30, 35, 40):
    P(code("AA-GDN-ARTGRASS", pile), f"Artificial Grass {pile} mm Pile", STRUCT, "UV-stabilised polyethylene artificial turf",
      f"Artificial grass, {pile} mm pile, in 2 m or 4 m wide rolls cut to length — sold per m².", M2)
for name in ("Artificial Grass Joining Tape 15 m", "Artificial Grass Adhesive 5 kg", "Artificial Grass Infill Silica Sand 25 kg", "Artificial Grass U-Pins (pack of 50)"):
    P(code("AA-GDN-ARTACC", name), name, STRUCT, "Artificial grass installation", f"{name} for installing artificial grass.", (("PACK", "Pack (50)"),) if "pack" in name else EACH)
for name in ("Pine Trellis Panel 1.8 × 0.9 m", "Pine Trellis Panel 1.8 × 1.2 m", "Pine Trellis Panel 1.8 × 1.8 m", "Steel Garden Arch", "Steel Garden Obelisk 1.8 m", "Bamboo Garden Stakes 1.8 m (pack of 10)"):
    P(code("AA-GDN-TRELLIS", name), name, STRUCT, "Garden structure", f"{name} for climbers and screening.", (("PACK", "Pack (10)"),) if "pack" in name else EACH)

GTOOLS = category(
    "garden-tools-power", "Garden Tools & Power Garden Equipment", "CAT-68", GARDEN,
    "Forks, rakes, hoes, secateurs, loppers and shears, watering cans and sprayers, and electric and petrol lawnmowers, brushcutters, trimmers, hedge trimmers, chainsaws and blowers.",
    ["Home and estate garden maintenance", "Landscaping contractors", "Clearing and bush cutting"],
    "Wear eye and hearing protection with power garden equipment, keep blades sharp and guarded, and mix two-stroke fuel at the ratio on the machine.",
)
for name in ("Digging Fork", "Garden Fork (Border)", "Garden Rake 12-Tooth", "Garden Rake 16-Tooth", "Leaf Rake (Steel)", "Leaf Rake (Plastic)", "Lawn Rake (Spring-Tine)", "Draw Hoe", "Dutch Hoe",
             "Garden Hoe (Pick-Type)", "Hand Trowel", "Hand Fork", "Hand Cultivator", "Edging Spade (Half-Moon)", "Bypass Secateurs", "Anvil Secateurs", "Bypass Loppers", "Pruning Saw",
             "Hedge Shears", "Grass Shears", "Long-Handled Edging Shears", "Pole Tree Pruner", "Bulb Planter", "Watering Can 5 L", "Watering Can 10 L", "Pressure Sprayer 1.5 L",
             "Pressure Sprayer 5 L", "Pressure Sprayer 8 L", "Knapsack Sprayer 16 L", "Garden Cart (Tipping)"):
    P(code("AA-GDN-TOOL", name), name, GTOOLS, "Garden hand tool", f"{name} for garden work; make confirmed on the quote.", EACH)
for name, desc in (
    ("Electric Lawnmower 1,200 W", "electric rotary mower for small lawns"),
    ("Electric Lawnmower 1,600 W", "electric rotary mower for medium lawns"),
    ("Electric Lawnmower 1,800 W (Steel Deck)", "heavy-duty electric mower"),
    ("Petrol Lawnmower 46 cm, 4-Stroke", "petrol rotary mower for medium lawns"),
    ("Petrol Lawnmower 51 cm, 4-Stroke Self-Propelled", "self-propelled petrol mower for large lawns"),
    ("Cordless Lawnmower 36 V Kit", "battery mower with battery and charger"),
    ("Electric Grass Trimmer 500 W", "electric line trimmer for edges"),
    ("Petrol Brushcutter 33 cc", "brushcutter for grass and light bush"),
    ("Petrol Brushcutter 43 cc", "brushcutter for thick grass and bush"),
    ("Petrol Brushcutter 52 cc", "heavy-duty brushcutter for clearing"),
    ("Electric Hedge Trimmer 600 W", "electric hedge trimmer"),
    ("Petrol Hedge Trimmer", "petrol hedge trimmer for large hedges"),
    ("Petrol Chainsaw 16 in", "chainsaw for pruning and firewood"),
    ("Petrol Chainsaw 18 in", "chainsaw for felling and cross-cutting"),
    ("Petrol Chainsaw 20 in", "larger chainsaw for heavy cutting"),
    ("Electric Chainsaw 2,000 W", "electric chainsaw for pruning"),
    ("Electric Leaf Blower & Vacuum", "blower-vacuum for leaves"),
    ("Petrol Leaf Blower (Backpack)", "backpack blower for large areas"),
    ("Garden Shredder 2,500 W", "electric shredder for prunings"),
    ("Petrol Tiller / Cultivator", "rotary tiller for beds and vegetable gardens"),
    ("Trimmer Line 2.4 mm × 15 m", "replacement nylon line"),
    ("Two-Stroke Oil 500 ml", "two-stroke oil for petrol garden machines"),
    ("Chainsaw Bar & Chain Oil 1 L", "bar and chain lubricant"),
):
    P(code("AA-GDN-POWER", name), name, GTOOLS, "Power garden equipment", f"{name}: {desc}. Make and model confirmed on the quote.", EACH)

# =============================================================================================================
# Outdoor Living (CAT-69..72)
# =============================================================================================================
OUTDOOR = "outdoor-living"
BRAAI = category(
    "braais-fireplaces", "Braais, Fireplaces & Flues", "CAT-69", OUTDOOR,
    "Built-in and freestanding braais, gas braais, braai grids and grates, closed-combustion fireplaces, flue pipe, bends and cowls, firebricks, fireclay and heat-resistant mortar.",
    ["Patios, lapas and entertainment areas", "Indoor fireplaces and heating", "Building braai and fireplace chambers"],
    "Fireplaces and flues must be installed to SANS 10400-V (space heating) by a competent installer, with the flue clear of thatch and timber by the distances required. Build braai and fireplace linings with firebricks and fireclay, never ordinary mortar.",
)
for width in (900, 1050, 1200, 1500):
    for material in ("Mild Steel", "Stainless Steel"):
        P(code("AA-OUT-BRAAI-BI", width, material), f"Built-In Braai Unit {width} mm, {material}", BRAAI, "Built-in braai unit",
          f"{material} built-in braai, {width} mm wide, with grid supports and ash pan — built into a brick braai with a chimney.", EACH)
for name in ("Drum Braai (Half Drum) with Stand", "Kettle Braai 47 cm", "Kettle Braai 57 cm", "Portable Braai (Fold-Up)", "Gas Braai 2-Burner", "Gas Braai 3-Burner", "Gas Braai 4-Burner with Side Burner", "Gas Braai 6-Burner", "Spit Braai (Motorised)", "Potjie Pot No. 3 (Three-Legged)", "Skottel Braai (Gas)"):
    P(code("AA-OUT-BRAAI", name), name, BRAAI, "Braai", f"{name}; make confirmed on the quote.", EACH)
for size in ("300 × 400 mm", "400 × 500 mm", "450 × 600 mm", "500 × 700 mm"):
    P(code("AA-OUT-GRID", size), f"Hinged Braai Grid {size}", BRAAI, "Steel or stainless braai grid", f"Hinged braai grid, {size}.", EACH)
for name in ("Fire Grate (Cast Iron)", "Braai Wood Basket (Fire Basket)", "Braai Tool Set"):
    P(code("AA-OUT-ACC", name), name, BRAAI, "Braai accessory", f"{name}.", EACH)
for size, kw in (("Small", "8 kW"), ("Medium", "12 kW"), ("Large", "16 kW")):
    P(code("AA-OUT-FIRE-CC", size), f"Closed-Combustion Fireplace, {size} ({kw})", BRAAI, "Closed-combustion wood-burning fireplace",
      f"Freestanding closed-combustion fireplace, about {kw}, with glass door — flue kit quoted separately.", EACH)
P("AA-OUT-FIRE-INSERT", "Built-In Fireplace Insert (Closed Combustion)", BRAAI, "Closed-combustion insert", "Insert for an existing masonry fireplace opening, sized on the quote.", EACH)
for dia in (150, 180, 200):
    for part, desc in (("Flue Pipe 1 m", "Steel flue pipe length"), ("Flue Bend 45°", "45° flue bend"), ("Flue Bend 90°", "90° flue bend"), ("Flue Cowl", "Rain cowl for the flue top"), ("Roof Flashing for Flue", "Roof flashing for the flue penetration")):
        P(code("AA-OUT-FLUE", dia, part), f"{part}, {dia} mm", BRAAI, "Steel flue component", f"{desc}, {dia} mm diameter.", EACH)
for name, desc, units in (
    ("Firebrick 230 × 114 × 76 mm", "Full refractory firebrick for braai and fireplace linings.", EACH),
    ("Firebrick Split 230 × 114 × 38 mm", "Split firebrick for thinner linings.", EACH),
    ("Fireclay 25 kg", "Refractory fireclay for laying firebricks.", EACH),
    ("Heat-Resistant Mortar 10 kg", "Ready-mixed heat-resistant mortar.", EACH),
    ("High-Temperature Paint (Black) 500 ml", "Heat-resistant paint for braais and flues.", EACH),
):
    P(code("AA-OUT-REFR", name), name, BRAAI, "Refractory material", desc, units)

SHADE = category(
    "shade-patio-cover", "Shade Sails, Carports & Patio Cover", "CAT-70", OUTDOOR,
    "Shade sails, shade-net carport kits, twin-wall polycarbonate sheets and profiles in clear, bronze and opal, aluminium patio roof kits and sail hardware.",
    ["Carports and parking", "Patios, pool areas and play areas", "Schools, clinics and business parking"],
    "Shade structures over 20 m² and carports need to comply with the National Building Regulations — your municipality may need plans. Tension sails at the corners with stainless hardware and allow for wind load.",
)
for shape, sizes in (("Triangle", ("3 m", "3.6 m", "5 m")), ("Square", ("3 m", "3.6 m", "5 m")), ("Rectangle", ("3 × 4 m", "4 × 6 m"))):
    for size in sizes:
        P(code("AA-OUT-SAIL", shape, size), f"Shade Sail {shape} {size}", SHADE, "UV-stabilised HDPE shade sail, about 90% shade",
          f"Shade sail, {shape.lower()} {size}, with reinforced corner rings — colour confirmed on the quote.", EACH)
for kind in ("Single", "Double", "Triple", "Quad"):
    P(code("AA-OUT-CARPORT-SN", kind), f"Shade-Net Carport Kit, {kind}", SHADE, "Steel frame with UV-stabilised shade net",
      f"{kind} shade-net carport: galvanised steel posts and frame with shade net — installation quoted on request.", EACH)
for thickness in (6, 10, 16):
    for length in (3.0, 6.0):
        for colour in ("Clear", "Bronze", "Opal"):
            P(code("AA-OUT-POLY", thickness, fmt(length), colour), f"Twin-Wall Polycarbonate Sheet {thickness} mm × 2.1 m × {fmt(length)} m, {colour}", SHADE,
              "UV-protected multiwall polycarbonate sheet",
              f"Twin-wall polycarbonate, {thickness} mm, 2.1 × {fmt(length)} m, {colour.lower()} — for patio and walkway roofing, cut to width on order.", (("SHEET", "Sheet"),))
for name in ("Polycarbonate H-Connector Profile 6 m", "Polycarbonate U-Profile (End Cap) 6 m", "Polycarbonate Anti-Dust Tape 33 m", "Polycarbonate Fixing Screws with Washers (pack of 50)"):
    P(code("AA-OUT-POLYACC", name), name, SHADE, "Polycarbonate accessory", f"{name}.", (("PACK", "Pack (50)"),) if "pack" in name else EACH)
for size in ("3 × 3 m", "4 × 3 m", "6 × 3 m"):
    P(code("AA-OUT-PATIO", size), f"Aluminium Patio Roof Kit {size}", SHADE, "Aluminium patio roof kit with polycarbonate", f"Aluminium-framed patio cover, {size}, with polycarbonate roofing.", EACH)
for name in ("Shade Sail Turnbuckle 8 mm (Stainless)", "Shade Sail D-Shackle 8 mm (Stainless)", "Shade Sail Pad Eye (Stainless)", "Shade Sail Post 3 m (Galvanised)", "Shade Sail Post 4 m (Galvanised)"):
    P(code("AA-OUT-SAILHW", name), name, SHADE, "Shade sail hardware", f"{name} for tensioning shade sails.", EACH)

POOL = category(
    "pools-water-features", "Pools, Pool Care & Water Features", "CAT-71", OUTDOOR,
    "Pool pumps and sand filters, filter media, marbelite and pebble finishes, waterline tiles and coping, chlorine, acid and pool chemicals, cleaners, covers and salt chlorinators, pond pumps and liners.",
    ["New pools and refurbishments", "Pool maintenance", "Ponds and water features"],
    "Pool chemicals are hazardous: store them dry, cool and apart (never mix chlorine and acid), add chemicals to water and not water to chemicals, and keep them away from children. Pool pumps must be wired by a registered electrician.",
)
for kw in ("0.55", "0.75", "1.1", "1.5"):
    P(code("AA-OUT-POOLPUMP", kw), f"Pool Pump {kw} kW", POOL, "Self-priming pool pump", f"Self-priming pool pump, {kw} kW — sized to the pool's volume and filter on the quote.", EACH)
for size in (400, 500, 600, 700):
    P(code("AA-OUT-FILTER", size), f"Pool Sand Filter {size} mm with Multiport Valve", POOL, "Pool sand filter", f"Sand filter, {size} mm tank, with multiport valve.", EACH)
for name in ("Pool Filter Sand 40 kg", "Pool Filter Glass Media 20 kg", "Pool Filter Zeolite 25 kg"):
    P(code("AA-OUT-MEDIA", name), name, POOL, "Pool filter media", f"{name} for sand filters.", EACH)
for colour in ("White", "Blue", "Grey", "Black"):
    P(code("AA-OUT-MARB", colour), f"Marbelite Pool Plaster 40 kg, {colour}", POOL, "Marble-aggregate pool plaster", f"Marbelite pool plaster in {colour.lower()}, 40 kg bag — about 1.2–1.5 m² per bag.", EACH)
for colour in ("Natural", "Blue", "Black"):
    P(code("AA-OUT-PEBBLE", colour), f"Pebble Pool Finish 25 kg, {colour}", POOL, "Exposed-pebble pool finish", f"Pebble pool finish in {colour.lower()}, 25 kg bag.", EACH)
for name in ("Pool Waterline Tile 150 × 150 mm, Blue (per m²)", "Pool Waterline Tile 150 × 150 mm, Black (per m²)", "Glass Mosaic Pool Tile Sheet 300 × 300 mm (per m²)", "Pool Tile Adhesive (Flexible) 20 kg", "Pool Tile Grout (Epoxy) 5 kg"):
    P(code("AA-OUT-POOLTILE", name), name, POOL, "Pool tile and installation", f"{name}.", M2 if "per m²" in name else EACH)
for name in ("Bullnose Pool Coping 500 × 300 mm (Concrete)", "Bullnose Pool Coping Corner (Concrete)", "Sandstone Pool Coping 600 × 300 mm", "Pool Coping Straight 500 × 250 mm (Grey)"):
    P(code("AA-OUT-COPING", name), name, POOL, "Pool coping", f"{name} for finishing the pool edge.", EACH)
for name, sizes in (("Stabilised Pool Chlorine Granules", ("2 kg", "5 kg", "10 kg", "25 kg")), ("Pool Chlorine Tablets", ("1 kg", "5 kg")),
                    ("pH Plus (Soda Ash)", ("2 kg", "5 kg")), ("pH Minus (Dry Acid)", ("2 kg", "5 kg")), ("Pool Acid (Hydrochloric)", ("5 L", "25 L")),
                    ("Pool Algaecide", ("1 L", "5 L")), ("Pool Clarifier", ("1 L", "5 L")), ("Pool Floc", ("1 L", "5 L")), ("Chlorine Stabiliser", ("2 kg",)), ("Pool Salt", ("40 kg",))):
    for size in sizes:
        P(code("AA-OUT-CHEM", name, size), f"{name} {size}", POOL, "Pool chemical", f"{name}, {size}. Follow the label for dosing.", EACH)
for name in ("Pool Test Kit (Chlorine & pH)", "Pool Test Strips (pack of 50)", "Automatic Pool Cleaner (Suction)", "Robotic Pool Cleaner", "Pool Leaf Rake", "Pool Wall Brush",
             "Pool Telescopic Pole 6 m", "Pool Vacuum Head", "Pool Vacuum Hose 12 m", "Solar Pool Bubble Cover (per m²)", "Pool Safety Net (per m²)", "Salt Chlorinator (pools to 40,000 L)",
             "Salt Chlorinator (pools to 80,000 L)", "LED Pool Light", "Pool Pump Basket", "Floating Chlorinator"):
    P(code("AA-OUT-POOLACC", name), name, POOL, "Pool equipment", f"{name}.", M2 if "per m²" in name else ((("PACK", "Pack (50)"),) if "pack of" in name else EACH))
for flow in (1000, 2500, 5000, 10000):
    P(code("AA-OUT-PONDPUMP", flow), f"Pond & Fountain Pump {flow:,} L/h", POOL, "Submersible pond pump", f"Submersible pump for ponds and water features, {flow:,} L/h.", EACH)
for name in ("Pond Liner 0.5 mm PVC (per m²)", "Pond Liner 1.0 mm EPDM (per m²)", "Pond Filter (Pressurised)", "Pond Underlay Felt (per m²)"):
    P(code("AA-OUT-POND", name), name, POOL, "Pond construction", f"{name}.", M2 if "per m²" in name else EACH)

OFIN = category(
    "outdoor-finishes-lighting", "Outdoor Finishes & Garden Lighting", "CAT-72", OUTDOOR,
    "Paving and stone sealers, decking oils and exterior timber finishes, anti-slip coatings, wall, bollard and spike lights, solar garden lights and outdoor LED strips.",
    ["Decks, paving and patios", "Garden and pathway lighting", "Pool areas and entrances"],
    "Seal paving and oil decks on a dry day, on clean surfaces, as the maker's instructions say. Outdoor mains lighting must be IP-rated for exterior use and installed by a registered electrician.",
)
for name, sizes in (("Paving Sealer (Water-Based)", ("5 L", "20 L")), ("Paving Sealer (Solvent-Based, Wet Look)", ("5 L", "20 L")), ("Stone & Slate Sealer", ("5 L",)),
                    ("Anti-Slip Floor Coating", ("5 L",)), ("Paving Cleaner & Efflorescence Remover", ("5 L",)), ("Pool-Surround Sealer (Non-Slip)", ("5 L",))):
    for size in sizes:
        P(code("AA-OUT-SEAL", name, size), f"{name} {size}", OFIN, "Exterior surface sealer", f"{name}, {size}.", EACH)
for colour in ("Clear", "Teak", "Mahogany", "Imbuia"):
    for size in ("1 L", "5 L", "20 L"):
        P(code("AA-OUT-DECKOIL", colour, size), f"Decking Oil {size}, {colour}", OFIN, "Exterior timber oil", f"Penetrating decking oil, {colour.lower()}, {size}.", EACH)
for name in ("Exterior Timber Sealer 5 L", "Exterior Varnish (Marine) 5 L", "Deck Cleaner & Brightener 5 L"):
    P(code("AA-OUT-TIMBERFIN", name), name, OFIN, "Exterior timber finish", f"{name}.", EACH)
for name in ("Outdoor Wall Lantern (IP44)", "Up/Down Outdoor Wall Light (IP54)", "Bulkhead Light (IP65)", "Bollard Light 600 mm (IP65)", "Bollard Light 900 mm (IP65)",
             "LED Spike Light (IP65)", "LED In-Ground Uplighter (IP67)", "Solar Garden Path Light (pack of 4)", "Solar Security Light with Sensor", "Solar Bollard Light",
             "Outdoor LED Strip IP65, 5 m Kit", "Festoon Light String 10 m (IP44)", "Step & Stair Light (IP65)", "Outdoor Weatherproof Plug (Garden Spike)"):
    P(code("AA-OUT-LIGHT", name), name, OFIN, "Exterior light fitting, IP-rated", f"{name}; finish and colour temperature confirmed on the quote.", (("PACK", "Pack (4)"),) if "pack of 4" in name else EACH)
