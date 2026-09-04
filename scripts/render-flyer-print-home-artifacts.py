#!/usr/bin/env python3
"""Erzeugt die PNG-Vergleichsartefakte für Druckerei (mit Beschnitt) vs.
Home (DIN-A4-quer-Imposition) aus den PDFs von
`scripts/render-flyer-print-home-artifacts.mjs`.

Ausgabe unter `artifacts/flyer-preview/`:
  - print-du-front-with-bleed.png / print-du-back-with-bleed.png
  - home-du-front-a4.png / home-du-back-a4.png
  - print-vs-home-comparison.png

Aufruf: python3 scripts/render-flyer-print-home-artifacts.py
"""

import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
    from PIL import Image
except ImportError as exc:
    sys.exit(f"Benötigt PyMuPDF und Pillow ({exc})")

OUT = Path(__file__).resolve().parent.parent / "artifacts" / "flyer-preview"
DPI = 200


def render_page(pdf_path: Path, page_index: int, out_path: Path) -> Path:
    doc = fitz.open(pdf_path)
    pix = doc[page_index].get_pixmap(dpi=DPI)
    pix.save(out_path)
    print("->", out_path.name, f"{pix.width}x{pix.height}")
    return out_path


def main() -> None:
    print_src = OUT / "representative-female-du-druckerei-bleed.pdf"
    home_src = OUT / "representative-female-du-home-a4.pdf"
    if not print_src.exists() or not home_src.exists():
        sys.exit("fehlende PDFs — bitte zuerst render-flyer-print-home-artifacts.mjs ausführen")

    print_front = render_page(print_src, 0, OUT / "print-du-front-with-bleed.png")
    print_back = render_page(print_src, 1, OUT / "print-du-back-with-bleed.png")
    home_front = render_page(home_src, 0, OUT / "home-du-front-a4.png")
    home_back = render_page(home_src, 1, OUT / "home-du-back-a4.png")

    # Vergleichsbild: Druckerei (Front+Back übereinander) neben Home
    # (Front+Back übereinander) — Größenunterschied (150x212mm hoch vs.
    # 297x210mm quer) macht den Unterschied sofort sichtbar.
    tiles_print = [Image.open(print_front), Image.open(print_back)]
    tiles_home = [Image.open(home_front), Image.open(home_back)]

    gap = 30
    col_print_w = max(t.width for t in tiles_print)
    col_home_w = max(t.width for t in tiles_home)
    col_print_h = sum(t.height for t in tiles_print) + gap
    col_home_h = sum(t.height for t in tiles_home) + gap
    total_h = max(col_print_h, col_home_h) + 2 * gap
    total_w = col_print_w + col_home_w + 3 * gap

    canvas = Image.new("RGB", (total_w, total_h), "white")
    y = gap
    for t in tiles_print:
        canvas.paste(t, (gap, y))
        y += t.height + gap
    y = gap
    for t in tiles_home:
        canvas.paste(t, (2 * gap + col_print_w, y))
        y += t.height + gap

    comparison_path = OUT / "print-vs-home-comparison.png"
    canvas.save(comparison_path)
    print("->", comparison_path.name, f"{canvas.width}x{canvas.height}")


if __name__ == "__main__":
    main()
