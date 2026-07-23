/**
 * Feste Feldbeschriftungen des einen humbee-Vorgangstyps, den dieses
 * Projekt unterstützt. Die Zuordnung erfolgt bewusst regelbasiert über
 * exakte (case-insensitive) Label-Erkennung statt über generative
 * Interpretation — mehrere Schreibvarianten pro Feld werden toleriert,
 * um kleine OCR-/Layout-Abweichungen abzufangen.
 */
export const OCR_FIELD_LABELS = Object.freeze({
  firstName: ["Vorname"],
  lastName: ["Nachname"],
  gender: ["Geschlecht"],
  phone: ["Telefon mobil", "Telefonnummer", "Telefon"],
  federalState: ["Bundesland"],
  region: ["Region"],
  ifkEmail: ["IFK-Mailadresse", "IFK Mailadresse"],
  regularEmail: ["Mail-Adresse", "Mailadresse", "E-Mail-Adresse"],
  ifkId: ["IFK-ID", "IFK ID"],
  paypalUrl: ["Paypal-URL", "PayPal-URL", "Paypal URL", "PayPal URL"],
});

/**
 * Alle bekannten Label-Varianten aller Felder, normalisiert (klein
 * geschrieben, ohne abschließenden Doppelpunkt) — genutzt, um zu
 * erkennen, ob eine Zeile selbst eine Feldbeschriftung ist (z. B. um
 * sie nicht versehentlich als Wert eines vorherigen Felds zu
 * verwenden).
 */
export const ALL_KNOWN_LABELS = Object.freeze(
  Object.values(OCR_FIELD_LABELS)
    .flat()
    .map((label) => label.trim().toLowerCase())
);
