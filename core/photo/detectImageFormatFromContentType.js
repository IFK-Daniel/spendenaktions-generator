const FORMAT_LABELS_BY_SUBTYPE = Object.freeze({
  jpeg: "JPEG",
  jpg: "JPEG",
  png: "PNG",
  webp: "WebP",
  gif: "GIF",
  svg: "SVG",
  "svg+xml": "SVG",
  bmp: "BMP",
  tiff: "TIFF",
});

/**
 * Leitet eine lesbare Formatbezeichnung (z. B. "JPEG", "PNG", "WebP")
 * aus einem Bild-Content-Type ab. Reine Funktion, keine
 * Seiteneffekte.
 *
 * @param {string} contentType z. B. `"image/jpeg"`.
 * @returns {string} Formatbezeichnung, oder `"Unbekannt"` bei
 *   fehlendem/nicht erkennbarem Content-Type.
 */
export function detectImageFormatFromContentType(contentType) {
  if (typeof contentType !== "string") {
    return "Unbekannt";
  }

  const match = contentType.toLowerCase().match(/^image\/([a-z0-9.+-]+)/);
  if (!match) {
    return "Unbekannt";
  }

  return FORMAT_LABELS_BY_SUBTYPE[match[1]] || match[1].toUpperCase();
}
