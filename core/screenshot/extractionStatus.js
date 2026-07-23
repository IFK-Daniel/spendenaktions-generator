/**
 * Status-Werte für ein einzelnes aus einem humbee-Screenshot erkanntes
 * Feld. Gemeinsames Vokabular für Core-Validatoren, API-Antwort und UI.
 */
export const EXTRACTION_STATUS = Object.freeze({
  RECOGNIZED: "recognized",
  NOT_RECOGNIZED: "not_recognized",
  NEEDS_REVIEW: "needs_review",
});
