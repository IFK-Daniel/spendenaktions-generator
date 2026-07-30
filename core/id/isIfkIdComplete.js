import { validateIfkId } from "./validateIfkId.js";

/**
 * Entscheidet, ob das IFK-ID-Eingabefeld als "erledigt" gilt (dezente
 * grüne Hervorhebung im Formular, siehe `.field-complete` in
 * `src/intern/style.css`).
 *
 * Bewusst unabhängig von der Herkunft des Werts (importiert aus dem
 * Screenshot, über "Neu generieren" erzeugt, oder manuell eingetippt)
 * — hier bedeutet die Markierung "dieses Feld ist vollständig und
 * gültig", nicht "dieser Wert stammt unverändert aus dem Screenshot"
 * (siehe `core/screenshot/isFieldAutoRecognized.js` für die davon zu
 * unterscheidende Herkunfts-Logik der übrigen Formularfelder).
 *
 * @param {string} value Der aktuelle Inhalt des IFK-ID-Felds.
 * @returns {boolean} `true` nur für eine formal gültige, nicht-leere
 *   IFK-ID (siehe `validateIfkId`) — leere und ungültige Werte liefern
 *   beide `false`.
 */
export function isIfkIdComplete(value) {
  if (typeof value !== "string") return false;
  return validateIfkId(value.trim()).valid;
}
