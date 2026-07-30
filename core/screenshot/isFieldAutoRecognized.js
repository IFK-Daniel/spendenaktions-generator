/**
 * Entscheidet, ob ein aus dem Screenshot übernommenes Formularfeld als
 * "automatisch erkannt" gilt (dezente grüne Hervorhebung im Formular,
 * siehe `.field-complete` in `src/intern/style.css`) oder neutral
 * bleiben soll. Reine Entscheidungslogik, getrennt von der
 * DOM-Verdrahtung (`src/intern/generator.js`), damit sie ohne Browser
 * testbar ist — einheitlich für JEDES Feld, keine feldspezifische
 * Sonderlogik.
 *
 * Sowohl ein unverändert bestätigter KI-Vorschlag als auch eine über die
 * Korrektur-Tabelle vorgenommene Berichtigung eines unsicheren Zeichens
 * (z. B. bei langen Werten wie E-Mail-Adressen oder PayPal-Links) zählen
 * als Teil des Screenshot-Import-Workflows und gelten daher als
 * "automatisch erkannt". Die Markierung wird NICHT durch das Korrigieren
 * in dieser Tabelle entfernt — erst eine nachträgliche direkte
 * Bearbeitung des bereits ins Formular übernommenen Felds (separater
 * Mechanismus in `src/intern/generator.js`, siehe `setFieldImportedState`)
 * hebt sie wieder auf.
 *
 * @param {object} params
 * @param {string} params.status Erkennungsstatus des Felds
 *   (`"recognized"`, `"needs_review"`, `"not_recognized"`,
 *   `"confirmed_empty"`, …) — bei synthetischen Feldern ohne eigenen
 *   Status (z. B. `emailForForm`) vom Aufrufer vorab abgeleitet.
 * @param {boolean} params.wasManuallyReviewed `true`, wenn der Nutzer
 *   den Wert über die Korrektur-Tabelle bestätigt hat (unabhängig
 *   davon, ob er ihn dabei geändert hat).
 * @returns {boolean}
 */
export function isFieldAutoRecognized({ status, wasManuallyReviewed }) {
  if (status === "recognized") return true;
  return !!wasManuallyReviewed;
}
