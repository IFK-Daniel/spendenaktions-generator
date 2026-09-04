#!/usr/bin/env python3
"""Erzeugt die PNG-Vergleichsartefakte für die Repräsentanten-Flyer.

Setzt voraus, dass `node scripts/render-flyer-test-matrix.mjs` bereits
gelaufen ist (liefert die `representative-*-druckerei.pdf` unter
`artifacts/flyer-preview/`).

Ausgabe unter `artifacts/flyer-preview/`:
  - female-du-front.png, female-sie-front.png,
    male-du-front.png, male-sie-front.png   (jeweils Seite 1)
  - shared-back.png                          (Seite 2, für alle gleich)
  - representative-front-comparison.png      (2x2-Grid der vier Vorderseiten)

Aufruf: python3 scripts/render-flyer-preview-artifacts.py
"""

import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF (fitz) wird benötigt: pip install pymupdf")

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow wird benötigt: pip install pillow")

OUT = Path(__file__).resolve().parent.parent / "artifacts" / "flyer-preview"
DPI = 200

COMBOS = [("female", "du"), ("female", "sie"), ("male", "du"), ("male", "sie")]


def render_page(pdf_path: Path, page_index: int, out_path: Path) -> Path:
    doc = fitz.open(pdf_path)
    pix = doc[page_index].get_pixmap(dpi=DPI)
    pix.save(out_path)
    print("->", out_path.name, f"{pix.width}x{pix.height}")
    return out_path


def main() -> None:
    front_pngs = []
    for gender, salutation in COMBOS:
        src = OUT / f"representative-{gender}-{salutation}-druckerei.pdf"
        if not src.exists():
            sys.exit(f"fehlt: {src} — bitte zuerst render-flyer-test-matrix.mjs ausführen")
        front_pngs.append(render_page(src, 0, OUT / f"{gender}-{salutation}-front.png"))

    # gemeinsame Rückseite (Seite 2 ist in allen Varianten identisch)
    render_page(OUT / "representative-female-du-druckerei.pdf", 1, OUT / "shared-back.png")

    # 2x2-Grid der vier Vorderseiten (female/du, female/sie, male/du, male/sie)
    tiles = [Image.open(p) for p in front_pngs]
    cw = max(t.width for t in tiles)
    ch = max(t.height for t in tiles)
    gap = 24
    grid = Image.new("RGB", (2 * cw + 3 * gap, 2 * ch + 3 * gap), "white")
    for i, tile in enumerate(tiles):
        r, c = divmod(i, 2)
        grid.paste(tile, (gap + c * (cw + gap), gap + r * (ch + gap)))
    grid_path = OUT / "representative-front-comparison.png"
    grid.save(grid_path)
    print("->", grid_path.name, f"{grid.width}x{grid.height}")


if __name__ == "__main__":
    main()
