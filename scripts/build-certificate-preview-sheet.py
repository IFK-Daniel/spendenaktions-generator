#!/usr/bin/env python3
"""Rasterisiert die von render-certificate-previews.mjs erzeugten Urkunden-PDFs
nach PNG und baut zwei beschriftete Vergleichsgrafiken:

  comparison_full.png   - 8 Vorlagen (Zeilen) x 4 Testnamen (Spalten), ganze
                          Seiten verkleinert.
  comparison_bands.png  - dieselbe Matrix, aber nur der hellgrüne Namensbalken
                          + die statische Rollenzeile ("... der Stiftung"), damit
                          Namensposition, Rollenformulierung, richtige Vorlage
                          und evtl. abgeschnittener Text auf einen Blick prüfbar
                          sind.

Aufruf:  python3 scripts/build-certificate-preview-sheet.py
"""
import json
import pathlib

import fitz  # PyMuPDF
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "artifacts" / "certificate-preview"

TEMPLATES = [
    ("representative-male", "Repräsentant (m)"),
    ("representative-female", "Repräsentant (w)"),
    ("ambassador-male", "Botschafter (m)"),
    ("ambassador-female", "Botschafterin (w)"),
    ("advisory-board", "Beirat"),
    ("curatorium", "Kuratorium"),
    ("expert-council", "Fachrat"),
    ("economic-council", "Wirtschaftsrat"),
]
NAMES = [
    ("kim-yu", "Kim Yu"),
    ("daniel-feigenbutz", "Daniel Feigenbutz"),
    ("alexandra-mazur", "Alexandra Mazur"),
    ("maximilian-bartholomaeus-schweighofer", "Maximilian B.-Schweighofer"),
]

# Namensbalken 382–463 pt von oben, Rollenzeile bis ~575 pt — mit Rand.
BAND_TOP_PT, BAND_BOT_PT = 300.0, 610.0
PAGE_W_PT = 842.25

LABEL_COL_W = 150
LABEL_ROW_H = 26
GAP = 10
BG = (255, 255, 255)


def pil_from_pdf(pdf_path: pathlib.Path, dpi: int, clip=None) -> Image.Image:
    doc = fitz.open(pdf_path)
    page = doc[0]
    pix = page.get_pixmap(dpi=dpi, clip=clip)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    doc.close()
    return img


def labelled_grid(cells, row_labels, col_labels, out_path):
    cw = max(c.width for c in cells)
    ch = max(c.height for c in cells)
    cols, rows = len(col_labels), len(row_labels)
    W = LABEL_COL_W + cols * (cw + GAP) + GAP
    H = LABEL_ROW_H + rows * (ch + GAP) + GAP
    canvas = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(canvas)

    for j, cl in enumerate(col_labels):
        x = LABEL_COL_W + j * (cw + GAP)
        draw.text((x + 4, 8), cl, fill=(0, 0, 0))
    for i, rl in enumerate(row_labels):
        y = LABEL_ROW_H + i * (ch + GAP)
        draw.text((6, y + ch // 2 - 6), rl, fill=(0, 0, 0))

    for idx, cell in enumerate(cells):
        i, j = divmod(idx, cols)
        x = LABEL_COL_W + j * (cw + GAP)
        y = LABEL_ROW_H + i * (ch + GAP)
        canvas.paste(cell, (x, y))
        draw.rectangle([x, y, x + cell.width - 1, y + cell.height - 1], outline=(210, 210, 210))

    canvas.save(out_path)


def main():
    index = json.loads((OUT / "index.json").read_text())

    full_cells, band_cells = [], []
    n = 0
    for slug, _ in TEMPLATES:
        for nslug, _ in NAMES:
            pdf = OUT / f"{slug}__{nslug}.pdf"
            if not pdf.exists():
                raise SystemExit(f"missing {pdf}")
            pil_from_pdf(pdf, 110).save(OUT / f"{slug}__{nslug}.png")
            n += 1
            full_cells.append(pil_from_pdf(pdf, 34))
            band_cells.append(
                pil_from_pdf(pdf, 132, clip=fitz.Rect(0, BAND_TOP_PT, PAGE_W_PT, BAND_BOT_PT))
            )

    row_labels = [t[1] for t in TEMPLATES]
    col_labels = [nm[1] for nm in NAMES]
    labelled_grid(full_cells, row_labels, col_labels, OUT / "comparison_full.png")
    labelled_grid(band_cells, row_labels, col_labels, OUT / "comparison_bands.png")

    warned = [e for e in index if e.get("warnings")]
    print(f"{n} Seiten-PNGs + comparison_full.png + comparison_bands.png -> {OUT}")
    if warned:
        print("WARNINGS (Text geschrumpft/übergelaufen):")
        for e in warned:
            print(f"  {e['filename']}: {[w['reason'] for w in e['warnings']]}")
    else:
        print("Keine renderFlyer-Warnungen — kein Text abgeschnitten oder bis zur Mindestgröße geschrumpft.")


if __name__ == "__main__":
    main()
