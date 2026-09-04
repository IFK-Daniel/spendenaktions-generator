#!/usr/bin/env python3
"""Schritt 1/2 der Druckerei-Beschnitt-Erzeugung: extrahiert je Master vier
kleine Kanten-Streifenbilder (oben/unten/links/rechts) per Edge-Clamp
(Randpixel nach außen wiederholt) und speichert sie als PNG unter
`artifacts/flyer-bleed-strips/`. Schritt 2 (`scripts/build-flyer-print-
bleed-backgrounds.mjs`, Node/pdf-lib) komponiert daraus zusammen mit dem
unveränderten Original-Vektor-Inhalt die finalen 150×212mm-Hintergründe —
siehe dort für die Details/Begründung des zweistufigen Verfahrens
(PyMuPDF kann PDFs rastern, pdf-lib nicht; pdf-lib entspricht exakt dem
zur Laufzeit verwendeten Einbettungsmechanismus in `core/pdf/renderFlyer.js`
und vermeidet Geometrie-Unsicherheiten von PyMuPDFs `show_pdf_page`).

Aufruf: python3 scripts/extract-flyer-bleed-strips.py
"""

import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
    import numpy as np
    from PIL import Image
except ImportError as exc:
    sys.exit(f"Benötigt PyMuPDF, numpy, Pillow ({exc})")

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "artifacts" / "flyer-bleed-strips"
MM_TO_PT = 72 / 25.4
BLEED_MM = 1.0
RASTER_DPI = 300
EDGE_INSET_PX = 3  # siehe Kommentar unten: Anti-Aliasing an der Seitenkante meiden

SOURCES = [
    ("templates/flyer-representative-female-du-front/background.pdf", "female-du"),
    ("templates/flyer-representative-female-sie-front/background.pdf", "female-sie"),
    ("templates/flyer-representative-male-du-front/background.pdf", "male-du"),
    ("templates/flyer-representative-male-sie-front/background.pdf", "male-sie"),
    ("templates/flyer-shared-back/background.pdf", "shared-back"),
]


def extract(src_path: Path, name: str) -> None:
    doc = fitz.open(src_path)
    page = doc[0]
    w_mm, h_mm = page.rect.width / MM_TO_PT, page.rect.height / MM_TO_PT
    if abs(w_mm - 148) > 0.05 or abs(h_mm - 210) > 0.05:
        sys.exit(f"{src_path}: erwartet 148x210mm, gefunden {w_mm:.2f}x{h_mm:.2f}mm")

    pix = page.get_pixmap(dpi=RASTER_DPI, alpha=False)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    bleed_px = round(BLEED_MM / 25.4 * RASTER_DPI)

    # Farbe NICHT von der allerletzten Pixelzeile/-spalte übernehmen: der
    # Rasterizer glättet (Anti-Aliasing) exakt an der Seitenkante gegen
    # "außerhalb der Seite" — die letzte Zeile/Spalte ist dadurch ein
    # aufgehellter Fehlfarbton, keine echte Artwork-Farbe (geprüft: letzte
    # Zeile z. B. [224,239,205] statt des tatsächlichen Grüntons
    # [139,193,64] wenige Pixel weiter innen).
    top_row = arr[EDGE_INSET_PX : EDGE_INSET_PX + 1, :, :]
    bottom_row = arr[-EDGE_INSET_PX - 1 : -EDGE_INSET_PX, :, :]
    left_col = arr[:, EDGE_INSET_PX : EDGE_INSET_PX + 1, :]
    right_col = arr[:, -EDGE_INSET_PX - 1 : -EDGE_INSET_PX, :]

    # Links/rechts über die volle künftige Höhe (deckt damit auch die vier
    # Ecken ab), oben/unten nur über die Trim-Breite (zwischen den beiden
    # Seitenstreifen) — siehe `build-flyer-print-bleed-backgrounds.mjs`.
    left_strip = np.pad(left_col, ((bleed_px, bleed_px), (0, 0), (0, 0)), mode="edge")
    left_strip = np.repeat(left_strip, bleed_px, axis=1)
    right_strip = np.pad(right_col, ((bleed_px, bleed_px), (0, 0), (0, 0)), mode="edge")
    right_strip = np.repeat(right_strip, bleed_px, axis=1)
    top_strip = np.repeat(top_row, bleed_px, axis=0)
    bottom_strip = np.repeat(bottom_row, bleed_px, axis=0)

    out_dir = OUT_DIR / name
    out_dir.mkdir(parents=True, exist_ok=True)
    for label, data in [("top", top_strip), ("bottom", bottom_strip), ("left", left_strip), ("right", right_strip)]:
        Image.fromarray(data).save(out_dir / f"{label}.png")
    print(f"{name}: Streifen gespeichert unter {out_dir}")


def main() -> None:
    for src_rel, name in SOURCES:
        extract(ROOT / src_rel, name)


if __name__ == "__main__":
    main()
