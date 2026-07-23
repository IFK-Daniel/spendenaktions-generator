/**
 * Status-Werte für ein einzelnes aus einem humbee-Screenshot erkanntes
 * Feld. Gemeinsames Vokabular für Core-Validatoren, API-Antwort und UI.
 */
export const EXTRACTION_STATUS = Object.freeze({
  RECOGNIZED: "recognized",
  NOT_RECOGNIZED: "not_recognized",
  NEEDS_REVIEW: "needs_review",
  // Die Feldzeile wurde im Screenshot eindeutig gefunden, der
  // dahinterstehende Wert ist aber nachweislich leer — kein
  // Erkennungsfehler, sondern ein bestätigt leeres Feld (aktuell nur
  // für die IFK-ID relevant, siehe `core/screenshot/
  // buildExtractionFields.js`).
  CONFIRMED_EMPTY: "confirmed_empty",
});
