/**
 * Ordnet eine beim Screenshot-Import geworfene Ausnahme (z. B. vom
 * OCR-Lauf oder vom Timeout) einer Fehlerkategorie zu. Reine,
 * browserfreie Zuordnungslogik — analog zu
 * `core/photo/classifyPhotoFetchException.js`.
 *
 * @param {unknown} err
 * @returns {"timeout" | "ocr_error"}
 */
export function classifyExtractionException(err) {
  if (err && typeof err === "object" && err.name === "AbortError") {
    return "timeout";
  }
  return "ocr_error";
}
