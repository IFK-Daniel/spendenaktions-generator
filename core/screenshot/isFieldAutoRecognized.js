/**
 * Entscheidet, ob ein aus dem Screenshot übernommenes Formularfeld als
 * "automatisch erkannt" gilt (dezente grüne Hervorhebung im Formular,
 * siehe `.field-imported` in `src/intern/style.css`) oder neutral
 * bleiben soll. Reine Entscheidungslogik, getrennt von der
 * DOM-Verdrahtung (`src/intern/generator.js`), damit sie ohne Browser
 * testbar ist — einheitlich für JEDES Feld, keine feldspezifische
 * Sonderlogik.
 *
 * Wichtige Unterscheidung: "geprüft" (der Nutzer hat den Wert über die
 * Korrektur-Tabelle bestätigt — ggf. auch unverändert, weil die OCR
 * bei einem einzelnen Zeichen unsicher war) ist NICHT dasselbe wie
 * "geändert" (der Nutzer hat tatsächlich einen anderen Wert
 * eingetragen). Ein unverändert bestätigter KI-Vorschlag stammt
 * weiterhin aus dem Screenshot und gilt daher ebenfalls als
 * "automatisch erkannt" — nur eine tatsächliche Änderung des Werts
 * macht ein Feld zu "manually_modified" (neutral). Lange Werte wie
 * E-Mail-Adressen oder PayPal-Links benötigen wegen ihrer Länge
 * deutlich häufiger eine Bestätigung über die Korrektur-Tabelle als
 * kurze Felder (Vorname, Telefonnummer, …) — ohne diese Unterscheidung
 * blieben sie dadurch systematisch öfter unmarkiert.
 *
 * @param {object} params
 * @param {string} params.status Erkennungsstatus des Felds
 *   (`"recognized"`, `"needs_review"`, `"not_recognized"`,
 *   `"confirmed_empty"`, …) — bei synthetischen Feldern ohne eigenen
 *   Status (z. B. `emailForForm`) vom Aufrufer vorab abgeleitet.
 * @param {boolean} params.wasManuallyModified `true`, wenn der Nutzer
 *   den Wert über die Korrektur-Tabelle tatsächlich geändert hat.
 * @param {boolean} params.wasManuallyReviewed `true`, wenn der Nutzer
 *   den Wert über die Korrektur-Tabelle bestätigt hat (unabhängig
 *   davon, ob er ihn dabei geändert hat).
 * @returns {boolean}
 */
export function isFieldAutoRecognized({ status, wasManuallyModified, wasManuallyReviewed }) {
  if (wasManuallyModified) return false;
  if (status === "recognized") return true;
  return !!wasManuallyReviewed;
}
