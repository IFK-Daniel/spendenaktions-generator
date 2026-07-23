import { EXTRACTION_STATUS } from "./extractionStatus.js";
import { isLabelEcho } from "./isLabelEcho.js";

/**
 * Prüft eine vom Vision-Modell erkannte PayPal-URL.
 *
 * - leer/fehlend → `not_recognized`
 * - gültige HTTPS-URL mit "paypal" im Host → `recognized`
 * - enthält "paypal", ist aber keine gültige HTTPS-URL (z. B.
 *   abgeschnitten) → `needs_review`
 * - alles andere → `not_recognized`
 *
 * @param {*} value
 * @returns {{ value: string, status: string }}
 */
export function validateExtractedPaypalUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const trimmed = value.trim();

  if (isLabelEcho(trimmed)) {
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }

  const looksLikePaypal = /paypal/i.test(trimmed);

  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" && looksLikePaypal) {
      return { value: trimmed, status: EXTRACTION_STATUS.RECOGNIZED };
    }
    if (looksLikePaypal) {
      return { value: trimmed, status: EXTRACTION_STATUS.NEEDS_REVIEW };
    }
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  } catch {
    if (looksLikePaypal) {
      return { value: trimmed, status: EXTRACTION_STATUS.NEEDS_REVIEW };
    }
    return { value: "", status: EXTRACTION_STATUS.NOT_RECOGNIZED };
  }
}
