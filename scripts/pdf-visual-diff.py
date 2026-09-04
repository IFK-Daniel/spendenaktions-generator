#!/usr/bin/env python3
"""
Rendert eine PDF-Seite (ECHTE Glyphen-Rasterung via PyMuPDF/mupdf,
nicht nur Text-/CMap-Extraktion) und vergleicht sie pixelweise gegen
ein Referenzbild ("golden"). Existiert ein "golden"-Bild bereits: Diff
prüfen. Existiert es nicht: aus dem aktuellen Rendering erzeugen
(nur mit --create, sonst Fehler) — verhindert versehentliches
stillschweigendes Neu-Baselinen bei jedem Lauf.

Grund für diesen Weg statt Text-Extraktion (pdfjs-dist/PyMuPDF
get_text()): Der schwere `embedFont(..., { subset: true })`-Bug
(siehe core/pdf/renderFlyer.js) hat die ToUnicode-CMap NICHT verändert
— Text-Extraktion meldete weiterhin den korrekten Namen/Telefon/E-Mail,
obwohl die tatsächlich gerenderten Glyphen zerstört waren (z. B.
"Daniel Feigenbutz" sichtbar nur als "b"). Nur echtes Pixel-Rendering
deckt diese Klasse von Bug zuverlässig auf.

Aufruf:
  python3 scripts/pdf-visual-diff.py <pdf_path> <page_index> <golden_png_path> [--create] [--zoom N] [--max-mean-diff X] [--max-max-diff X]

Exit-Code 0: Diff innerhalb der Toleranz (oder --create erfolgreich).
Exit-Code 1: Diff außerhalb der Toleranz, golden fehlt (ohne --create),
             oder sonstiger Fehler. Eine Zeile JSON auf stdout in jedem Fall.
"""
import sys
import json
import argparse
from pathlib import Path

import fitz
import numpy as np
from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    parser.add_argument("page_index", type=int)
    parser.add_argument("golden_png_path")
    parser.add_argument("--create", action="store_true")
    parser.add_argument("--zoom", type=float, default=2.0)
    parser.add_argument("--max-mean-diff", type=float, default=1.0)
    parser.add_argument("--max-max-diff", type=int, default=40)
    args = parser.parse_args()

    doc = fitz.open(args.pdf_path)
    page = doc[args.page_index]
    pix = page.get_pixmap(matrix=fitz.Matrix(args.zoom, args.zoom))
    current = np.array(Image.frombytes("RGB", [pix.width, pix.height], pix.samples))

    golden_path = Path(args.golden_png_path)

    if args.create:
        golden_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(current).save(golden_path)
        print(json.dumps({"ok": True, "created": str(golden_path), "width": pix.width, "height": pix.height}))
        sys.exit(0)

    if not golden_path.exists():
        print(json.dumps({"ok": False, "error": f"golden image not found: {golden_path} (run with --create first)"}))
        sys.exit(1)

    golden = np.array(Image.open(golden_path).convert("RGB"))

    if golden.shape != current.shape:
        print(json.dumps({
            "ok": False,
            "error": "shape mismatch",
            "goldenShape": list(golden.shape),
            "currentShape": list(current.shape),
        }))
        sys.exit(1)

    diff = np.abs(golden.astype(int) - current.astype(int))
    mean_diff = float(diff.mean())
    max_diff = int(diff.max())
    ok = mean_diff <= args.max_mean_diff and max_diff <= args.max_max_diff

    result = {
        "ok": ok,
        "meanDiff": mean_diff,
        "maxDiff": max_diff,
        "maxMeanDiffThreshold": args.max_mean_diff,
        "maxMaxDiffThreshold": args.max_max_diff,
    }
    print(json.dumps(result))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
