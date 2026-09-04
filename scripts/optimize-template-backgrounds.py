#!/usr/bin/env python3
"""
Verlustfreie/visuell-verlustfreie Größenoptimierung statischer
Template-Hintergrund-PDFs (`templates/*/background.pdf`).

Ersetzt eingebettete, überwiegend flächige Rastergrafiken (Logos,
Farbflächen, Text-Grafiken -- KEINE Fotos) durch eine Farbpaletten-
(Indexed-)Variante mit 256 Farben statt Truecolor-RGB. Für Motive wie
die Urkunden-Hintergrundgrafik (Logo + Flächenfarben + Text, siehe
`artifacts/size-analysis/attachment-size-analysis.md`) ist das nahezu
verlustfrei, da die Grafik ohnehin nur wenige zehn/hundert unterschiedliche
Farben enthält.

Sicherheitsnetz: Nach der Optimierung wird jede betroffene Seite bei
2x-Auflösung gegen das Original gerendert und pixelweise verglichen
(`fitz`/PyMuPDF). Eine Datei wird nur ersetzt, wenn
  (a) die neue Datei tatsächlich kleiner ist, UND
  (b) der Pixel-Diff unterhalb der Schwelle bleibt (siehe MAX_MEAN_DIFF/
      MAX_MAX_DIFF) -- sonst bleibt die Originaldatei unverändert und das
      Skript meldet das Bild als "übersprungen".

Nur Bilder oberhalb MIN_IMAGE_BYTES werden überhaupt angefasst (kleine
Icons/QR-Grafiken lohnen den Aufwand nicht und sollen unverändert
bleiben, siehe Vorgabe "QR-Codes nicht anfassen").

Aufruf: python3 scripts/optimize-template-backgrounds.py [--apply]
Ohne --apply: nur Analyse/Trockenlauf (zeigt, was sich ändern würde).
"""
import sys
import io
import zlib
import argparse

import pikepdf
from pikepdf import Name, Array
import fitz
import numpy as np
from PIL import Image
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MIN_IMAGE_BYTES = 100_000
MAX_MEAN_DIFF = 0.5  # mittlere Pixelabweichung (0-255) über die gesamte Seite
MAX_MAX_DIFF = 20  # maximale Einzelpixelabweichung (0-255) je Kanal


def iter_image_xobjects(resources, path=()):
    """Liefert (name_path, image_obj) für alle Image-XObjects, auch
    innerhalb verschachtelter Form-XObjects (wie bei den Urkunden-
    Hintergründen: äußeres Form-XObject enthält das eigentliche Bild)."""
    xobjects = resources.get("/XObject")
    if xobjects is None:
        return
    for name, obj in xobjects.items():
        subtype = obj.get("/Subtype")
        if subtype == Name("/Image"):
            yield (*path, name), obj
        elif subtype == Name("/Form"):
            inner_res = obj.get("/Resources")
            if inner_res is not None:
                yield from iter_image_xobjects(inner_res, (*path, name))


def render_page_array(pdf_path, zoom=2.0):
    doc = fitz.open(pdf_path)
    pix = doc[0].get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    arr = np.array(Image.frombytes("RGB", [pix.width, pix.height], pix.samples))
    doc.close()
    return arr


def optimize_pdf(path: Path, apply: bool):
    original_size = path.stat().st_size
    pdf = pikepdf.open(str(path))
    page = pdf.pages[0]
    resources = page.get("/Resources")
    if resources is None:
        return None

    changed_any = False
    report = []
    for name_path, img_obj in list(iter_image_xobjects(resources)):
        try:
            raw_len = len(img_obj.read_raw_bytes())
        except Exception:
            continue
        if raw_len < MIN_IMAGE_BYTES:
            continue
        colorspace = img_obj.get("/ColorSpace")
        if colorspace is None:
            continue
        # Bereits indiziert? Dann nichts zu tun.
        if isinstance(colorspace, Array) and str(colorspace[0]) == "/Indexed":
            continue

        try:
            pdfimg = pikepdf.PdfImage(img_obj)
            pil_img = pdfimg.as_pil_image().convert("RGB")
        except Exception as exc:
            report.append((name_path, f"übersprungen (Dekodierfehler: {exc})"))
            continue

        pal_img = pil_img.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE)
        palette_bytes = bytes(pal_img.getpalette()[: 256 * 3])
        raw_indices = pal_img.tobytes()
        compressed = zlib.compress(raw_indices, level=9)

        if len(compressed) >= raw_len:
            report.append((name_path, f"übersprungen (keine Ersparnis: {raw_len} -> {len(compressed)})"))
            continue

        palette_obj = pdf.make_stream(palette_bytes)
        new_colorspace = Array([Name("/Indexed"), Name("/DeviceRGB"), 255, palette_obj])

        img_obj.write(compressed, filter=Name("/FlateDecode"))
        img_obj.ColorSpace = new_colorspace
        img_obj.BitsPerComponent = 8
        if "/DecodeParms" in img_obj:
            del img_obj["/DecodeParms"]

        report.append((name_path, f"{raw_len} -> {len(compressed)} Byte ({(1 - len(compressed) / raw_len) * 100:.1f}% kleiner)"))
        changed_any = True

    if not changed_any:
        return {"path": path, "changed": False, "report": report}

    tmp_path = path.with_suffix(".pdf.optimized")
    pdf.save(str(tmp_path))
    pdf.close()

    new_size = tmp_path.stat().st_size
    if new_size >= original_size:
        tmp_path.unlink()
        return {"path": path, "changed": False, "report": report + [("(gesamt)", f"übersprungen: Datei nicht kleiner ({original_size} -> {new_size})")]}

    # Visuelle Verifikation
    arr_before = render_page_array(str(path))
    arr_after = render_page_array(str(tmp_path))
    if arr_before.shape != arr_after.shape:
        tmp_path.unlink()
        return {"path": path, "changed": False, "report": report + [("(gesamt)", "übersprungen: Seitengröße geändert (unerwartet)")]}

    diff = np.abs(arr_before.astype(int) - arr_after.astype(int))
    mean_diff = float(diff.mean())
    max_diff = int(diff.max())

    verification = f"mean_diff={mean_diff:.4f}, max_diff={max_diff} (Schwellen: mean<{MAX_MEAN_DIFF}, max<{MAX_MAX_DIFF})"

    if mean_diff >= MAX_MEAN_DIFF or max_diff >= MAX_MAX_DIFF:
        tmp_path.unlink()
        return {"path": path, "changed": False, "report": report + [("(gesamt)", f"übersprungen: visuelle Abweichung zu groß ({verification})")]}

    result = {
        "path": path,
        "changed": True,
        "original_size": original_size,
        "new_size": new_size,
        "verification": verification,
        "report": report,
    }

    if apply:
        tmp_path.replace(path)
    else:
        tmp_path.unlink()

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Änderungen tatsächlich schreiben (sonst Trockenlauf)")
    parser.add_argument("--pattern", default="templates/*/background.pdf")
    args = parser.parse_args()

    paths = sorted(REPO_ROOT.glob(args.pattern))
    total_before = 0
    total_after = 0
    any_changed = False

    for path in paths:
        rel = path.relative_to(REPO_ROOT)
        result = optimize_pdf(path, apply=args.apply)
        if result is None:
            continue
        if not result["changed"]:
            for name_path, msg in result["report"]:
                if "übersprungen" in msg or "Fehler" in msg:
                    print(f"  {rel} [{name_path}]: {msg}")
            continue
        any_changed = True
        total_before += result["original_size"]
        total_after += result["new_size"]
        print(f"{rel}: {result['original_size']} -> {result['new_size']} Byte "
              f"({(1 - result['new_size'] / result['original_size']) * 100:.1f}% kleiner) — {result['verification']}")
        for name_path, msg in result["report"]:
            print(f"    {name_path}: {msg}")

    if any_changed:
        print(f"\nGesamt (nur geänderte Dateien): {total_before} -> {total_after} Byte "
              f"({(1 - total_after / total_before) * 100:.1f}% kleiner)")
    else:
        print("\nKeine Datei wurde geändert.")

    if not args.apply:
        print("\n(Trockenlauf — nichts wurde geschrieben. Mit --apply erneut aufrufen, um zu übernehmen.)")


if __name__ == "__main__":
    main()
