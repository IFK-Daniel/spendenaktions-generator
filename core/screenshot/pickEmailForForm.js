import { EXTRACTION_STATUS } from "./extractionStatus.js";

/**
 * Verbindliche E-Mail-Regel für das Formular, DOM-frei und unabhängig
 * vom KI-Prompt abgesichert (siehe Anforderung: diese Priorisierung
 * darf sich nicht allein auf das Modellverhalten verlassen).
 *
 * 1. Ist eine gültige IFK-Mailadresse vorhanden → diese verwenden.
 * 2. Nur wenn sie fehlt/ungültig ist → normale Mail-Adresse als
 *    Fallback verwenden (sofern gültig).
 * 3. Sind beide leer oder ungültig → leerer Wert, `source: null`.
 *
 * @param {{ value: string, status: string }} ifkEmail
 * @param {{ value: string, status: string }} regularEmail
 * @returns {{ value: string, source: "ifkEmail" | "regularEmail" | null }}
 */
export function pickEmailForForm(ifkEmail, regularEmail) {
  if (ifkEmail && ifkEmail.status === EXTRACTION_STATUS.RECOGNIZED && ifkEmail.value) {
    return { value: ifkEmail.value, source: "ifkEmail" };
  }

  if (regularEmail && regularEmail.status === EXTRACTION_STATUS.RECOGNIZED && regularEmail.value) {
    return { value: regularEmail.value, source: "regularEmail" };
  }

  return { value: "", source: null };
}
