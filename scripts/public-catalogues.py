"""
Copies the pricing service's catalogues into the storefront with internal
pricing research removed (services/pricing/public_copy.py, PRICING_POLICY.md).

    python3 scripts/public-catalogues.py

Run it whenever a catalogue in services/pricing/data changes.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "services" / "pricing"))

from public_copy import DERIVED, PAIRS, render  # noqa: E402


def main():
    for src, dest in PAIRS.items():
        data = json.loads((ROOT / "services/pricing/data" / src).read_text(encoding="utf-8"))
        out = ROOT / "apps/web/src/data" / dest
        out.write_text(render(src, data), encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)}")
    for dest, (src, build) in DERIVED.items():
        data = json.loads((ROOT / "services/pricing/data" / src).read_text(encoding="utf-8"))
        out = ROOT / "apps/web/src/data" / dest
        out.write_text(json.dumps(build(data), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
