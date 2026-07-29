/**
 * Generische, normalisierte Beschreibung eines manuellen Bildausschnitts
 * ("Foto-Crop") — unabhängig von Bildschirm-/Editorgröße und unabhängig
 * von der konkreten Zielfläche (Kreis, Rechteck, beliebige Maße).
 *
 * `zoom` ist ein Multiplikator *auf* den automatischen "cover"-Zoomfaktor
 * (siehe `centerCrop.js`) — bei `zoom: 1` deckt das Bild die Zielfläche
 * exakt (keine leeren Bereiche, kein zusätzlicher Ausschnitt), identisch
 * zum bisherigen automatischen Center-Crop.
 *
 * `offsetX`/`offsetY` sind auf den Bereich `[-1, 1]` normalisiert und
 * beschreiben den Anteil des bei diesem Zoom verfügbaren Verschiebe-
 * spielraums ("Slack" — wie viel das skalierte Bild über die Zielfläche
 * hinaussteht). Da der Spielraum aus `zoom` hergeleitet wird, kann eine
 * Verschiebung innerhalb `[-1, 1]` per Konstruktion nie einen leeren
 * Bereich in der Zielfläche erzeugen — unabhängig vom Seitenverhältnis
 * des Quellbilds.
 */
export const DEFAULT_PHOTO_CROP = Object.freeze({ zoom: 1, offsetX: 0, offsetY: 0 });

export const PHOTO_CROP_MIN_ZOOM = 1;
export const PHOTO_CROP_MAX_ZOOM = 3;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalisiert und begrenzt einen (möglicherweise unvollständigen oder
 * ungültigen) Foto-Crop auf gültige Werte — Grundlage sowohl für den
 * Editor (Regler-/Drag-Eingaben) als auch für den PDF-Renderer (bewusst
 * dieselbe Funktion, damit beide nie unterschiedlich interpretieren).
 *
 * @param {{zoom?: number, offsetX?: number, offsetY?: number}} [photoCrop]
 * @returns {{zoom: number, offsetX: number, offsetY: number}}
 */
export function clampPhotoCrop(photoCrop) {
  const zoom = Number.isFinite(photoCrop?.zoom) ? photoCrop.zoom : DEFAULT_PHOTO_CROP.zoom;
  const offsetX = Number.isFinite(photoCrop?.offsetX) ? photoCrop.offsetX : DEFAULT_PHOTO_CROP.offsetX;
  const offsetY = Number.isFinite(photoCrop?.offsetY) ? photoCrop.offsetY : DEFAULT_PHOTO_CROP.offsetY;

  return {
    zoom: clamp(zoom, PHOTO_CROP_MIN_ZOOM, PHOTO_CROP_MAX_ZOOM),
    offsetX: clamp(offsetX, -1, 1),
    offsetY: clamp(offsetY, -1, 1),
  };
}

/**
 * Berechnet Skalierung und Position eines Bilds innerhalb einer
 * Zielfläche unter Berücksichtigung eines optionalen manuellen
 * Foto-Crops — liefert dieselbe Ergebnisform wie `centerCrop()`
 * (Drop-in-Ersatz), damit bestehende Aufrufer (`placeImage.js`)
 * unverändert bleiben, wenn kein Crop übergeben wird.
 *
 * Reine Mathematik, keine DOM-/Canvas-/PDF-Abhängigkeit — dieselbe
 * Funktion wird sowohl von der Editor-Live-Vorschau (Canvas/CSS-Pixel)
 * als auch vom PDF-Renderer (PDF-Punkte) verwendet, damit beide
 * garantiert denselben Ausschnitt berechnen.
 *
 * @param {object} params
 * @param {number} params.sourceWidth
 * @param {number} params.sourceHeight
 * @param {number} params.targetWidth
 * @param {number} params.targetHeight
 * @param {{zoom?: number, offsetX?: number, offsetY?: number}} [params.photoCrop]
 *   Fehlt dieser Parameter (oder ist er `undefined`), ist das Ergebnis
 *   identisch zum bisherigen automatischen Center-Crop.
 * @returns {{scale: number, drawWidth: number, drawHeight: number, offsetX: number, offsetY: number}}
 * @throws {Error} Bei nicht-positiven Maßen.
 */
export function computePhotoCropLayout({ sourceWidth, sourceHeight, targetWidth, targetHeight, photoCrop } = {}) {
  for (const [name, value] of Object.entries({ sourceWidth, sourceHeight, targetWidth, targetHeight })) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error(`computePhotoCropLayout: '${name}' muss eine positive Zahl sein.`);
    }
  }

  const { zoom, offsetX, offsetY } = clampPhotoCrop(photoCrop);

  const baseScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const scale = baseScale * zoom;
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  // Spielraum, um den das skalierte Bild über die Zielfläche je Achse
  // hinaussteht — bei zoom=1 ist mindestens eine Achse exakt 0 (analog
  // centerCrop), bei zoom>1 wächst der Spielraum auf beiden Achsen.
  const slackX = drawWidth - targetWidth;
  const slackY = drawHeight - targetHeight;

  const resultOffsetX = (targetWidth - drawWidth) / 2 - (slackX / 2) * offsetX;
  const resultOffsetY = (targetHeight - drawHeight) / 2 - (slackY / 2) * offsetY;

  return { scale, drawWidth, drawHeight, offsetX: resultOffsetX, offsetY: resultOffsetY };
}
