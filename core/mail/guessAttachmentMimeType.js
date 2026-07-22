const MIME_TYPES_BY_EXTENSION = Object.freeze({
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
  zip: "application/zip",
});

/**
 * Leitet einen groben MIME-Typ aus der Dateiendung ab — ausschließlich
 * zur (datensparsamen) Protokollierung von Anhangs-**Typen** ohne
 * Dateinamen. Generisch über eine Endungs-Tabelle, keine hartcodierte
 * Vier-QR-Dateien-Logik: künftige Dateitypen (z. B. `.pdf` für
 * Flyer) werden automatisch erkannt, sobald sie in der Tabelle
 * ergänzt werden.
 *
 * @param {string} filename
 * @returns {string} z. B. `"image/png"`, `"application/pdf"` oder
 *   `"application/octet-stream"` bei unbekannter/fehlender Endung.
 */
export function guessAttachmentMimeType(filename) {
  if (typeof filename !== "string") {
    return "application/octet-stream";
  }

  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  const extension = match ? match[1].toLowerCase() : "";

  return MIME_TYPES_BY_EXTENSION[extension] || "application/octet-stream";
}
