import { ALL_KNOWN_LABELS } from "./ocrLabels.js";

// Beschriftungen weiterer, bewusst nicht extrahierter Felder desselben
// humbee-Vorgangstyps — zusätzlich gegen Label-Echo abgesichert, damit
// eine falsch zugeordnete OCR-Zeile aus einem Nachbarfeld nie als Wert
// eines der zehn benötigten Felder landet.
const IGNORED_FIELD_LABELS = ["land", "geburtstag", "nutzername", "erstpasswort", "aufgaben", "dokumente"];

const KNOWN_LABELS = [...ALL_KNOWN_LABELS, ...IGNORED_FIELD_LABELS];

/**
 * Erkennt, ob ein per OCR erkannter Wert tatsächlich nur eine
 * Feldbeschriftung selbst ist (z. B. die Zeilenzuordnung hat
 * "Mail-Adresse" statt eines echten Werts erfasst). Solche Werte
 * dürfen nie ins Formular übernommen werden.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isLabelEcho(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase().replace(/:$/, "").trim();
  if (!normalized) return false;
  return KNOWN_LABELS.includes(normalized);
}
