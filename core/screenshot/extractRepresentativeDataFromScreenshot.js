import { buildExtractionFields } from "./buildExtractionFields.js";
import { extractRawFieldsFromOcrLines } from "./extractRawFieldsFromOcrLines.js";
import { classifyExtractionException } from "./classifyExtractionException.js";

const DEFAULT_TIMEOUT_MS = 30000;
export const ALLOWED_SCREENSHOT_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      const err = new Error("OCR timed out");
      err.name = "AbortError";
      reject(err);
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutHandle);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      });
  });
}

/**
 * Orchestriert die clientseitige Auswertung eines humbee-Screenshots:
 * führt (injizierbar, für Tests ohne echten OCR-Lauf) eine
 * Texterkennung durch und validiert jedes Feld über dieselben
 * Core-Funktionen wie bei manueller Formulareingabe. Kennt weder DOM
 * noch eine konkrete OCR-Bibliothek — `runOcr` kapselt den
 * eigentlichen Tesseract.js-Aufruf (siehe
 * `core/screenshot/runScreenshotOcr.js`). Der Bildinhalt verlässt an
 * dieser Stelle nie den Browser; es findet keine Netzwerkübertragung
 * an einen Server oder externen Dienst statt.
 *
 * @param {object} params
 * @param {File | Blob} params.file Das ausgewählte Screenshot-Bild.
 * @param {string} params.mimeType Einer von `image/png`, `image/jpeg`,
 *   `image/webp`.
 * @param {(file: File | Blob) => Promise<{ lines: { text: string, confidence?: number }[] }>} [params.runOcr]
 *   Führt die eigentliche OCR durch. Injizierbar für Tests.
 * @param {number} [params.timeoutMs] Standard: 30000ms.
 * @returns {Promise<
 *   { ok: true, fields: object } |
 *   { ok: false, reason: "invalid_image" | "invalid_mime_type" | "timeout" | "ocr_error" }
 * >}
 */
export async function extractRepresentativeDataFromScreenshot({
  file,
  mimeType,
  runOcr,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (!file) {
    return { ok: false, reason: "invalid_image" };
  }

  if (!ALLOWED_SCREENSHOT_MIME_TYPES.has(mimeType)) {
    return { ok: false, reason: "invalid_mime_type" };
  }

  if (typeof runOcr !== "function") {
    return { ok: false, reason: "ocr_error" };
  }

  let ocrResult;
  try {
    ocrResult = await withTimeout(runOcr(file), timeoutMs);
  } catch (err) {
    return { ok: false, reason: classifyExtractionException(err) };
  }

  const rawFields = extractRawFieldsFromOcrLines(ocrResult && ocrResult.lines);
  return { ok: true, fields: buildExtractionFields(rawFields) };
}
