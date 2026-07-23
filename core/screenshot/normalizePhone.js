/**
 * Behutsame Telefonnummer-Normalisierung: entfernt nur führende/
 * abschließende Leerzeichen und fasst mehrfache innere Leerzeichen zu
 * einem zusammen. Keine strenge Formatprüfung, keine Umwandlung von
 * Schreibweisen (z. B. wird "0170" nicht zu "+49170" umgeschrieben) —
 * das Risiko, eine tatsächlich korrekte Nummer durch eine zu
 * aggressive Normalisierung zu verfälschen, wird bewusst vermieden.
 *
 * @param {*} value
 * @returns {string}
 */
export function normalizePhone(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}
