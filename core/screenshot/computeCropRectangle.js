const DEFAULT_PADDING_RATIO = 0.4;

/**
 * Berechnet ein vergrößertes, an den Bildrand geklammertes
 * Ausschnitt-Rechteck rund um eine erkannte Wort-Bounding-Box — reine
 * Geometrie, kein Bildzugriff. Wird genutzt, um für prüfbedürftige
 * Felder einen Bildausschnitt der jeweiligen Originalzeile (mit
 * etwas Rand) statt nur des erkannten Texts anzuzeigen.
 *
 * Liefert `null`, wenn keine verlässliche Bounding-Box vorliegt (z. B.
 * fehlende Werte, keine positive Breite/Höhe) oder die Bilddimensionen
 * ungültig sind — es soll bewusst kein künstlicher Crop erzeugt
 * werden, wenn die Datengrundlage dafür nicht ausreicht.
 *
 * @param {{ x0: number, y0: number, x1: number, y1: number } | undefined} bbox
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @param {{ paddingRatio?: number }} [options]
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
export function computeCropRectangle(bbox, imageWidth, imageHeight, options = {}) {
  const { paddingRatio = DEFAULT_PADDING_RATIO } = options;

  if (!bbox || typeof bbox !== "object") return null;
  const { x0, y0, x1, y1 } = bbox;
  if (![x0, y0, x1, y1].every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  if (!(imageWidth > 0) || !(imageHeight > 0)) return null;

  const width = x1 - x0;
  const height = y1 - y0;
  if (!(width > 0) || !(height > 0)) return null;

  const paddingX = width * paddingRatio;
  const paddingY = height * paddingRatio;

  let x = x0 - paddingX;
  let y = y0 - paddingY;
  let w = width + paddingX * 2;
  let h = height + paddingY * 2;

  if (x < 0) {
    w += x;
    x = 0;
  }
  if (y < 0) {
    h += y;
    y = 0;
  }
  if (x + w > imageWidth) {
    w = imageWidth - x;
  }
  if (y + h > imageHeight) {
    h = imageHeight - y;
  }

  if (!(w > 0) || !(h > 0)) return null;

  return { x, y, width: w, height: h };
}
