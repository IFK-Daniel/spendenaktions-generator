/**
 * Entscheidet, ob das Foto-Link-Eingabefeld als "erledigt" gilt
 * (dezente grüne Hervorhebung im Formular, siehe `.field-complete` in
 * `src/intern/style.css`).
 *
 * Wie bei der IFK-ID (siehe `core/id/isIfkIdComplete.js`) bedeutet die
 * Markierung hier "vollständig und gültig" statt "unverändert aus dem
 * Screenshot" — ein Foto-Link gilt als erledigt, sobald er erfolgreich
 * abgerufen/validiert wurde (siehe `core/photo/fetchRepresentativePhoto.js`),
 * unabhängig davon, ob zusätzlich ein manueller Fotoausschnitt gewählt
 * wurde (kein Erfordernis dafür). Ändert sich der Link, muss er erneut
 * geprüft werden, bevor er wieder als erledigt gilt.
 *
 * @param {object} params
 * @param {*} params.lastPhoto Das zuletzt erfolgreich geladene Foto
 *   (z. B. `lastPhoto` in `src/intern/generator.js`) — `null`/`undefined`,
 *   solange keine erfolgreiche Prüfung vorliegt.
 * @param {string|null} params.lastPhotoUrl Der Foto-Link, zu dem
 *   `lastPhoto` gehört.
 * @param {string} params.currentValue Der aktuell im Feld stehende
 *   (bereits getrimmte) Foto-Link.
 * @returns {boolean} `true` nur, wenn ein Foto erfolgreich geladen
 *   wurde UND dieses Ergebnis zum aktuell im Feld stehenden Link
 *   gehört — leere, (noch) nicht geprüfte oder seither geänderte
 *   Werte liefern `false`.
 */
export function isPhotoLinkValidated({ lastPhoto, lastPhotoUrl, currentValue }) {
  return lastPhoto != null && lastPhotoUrl === currentValue;
}
