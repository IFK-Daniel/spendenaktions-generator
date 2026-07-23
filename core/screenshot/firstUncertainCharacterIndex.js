/**
 * Liefert den Index des ersten als unsicher markierten Zeichens
 * innerhalb einer zeichengenauen Konfidenzliste (`core/screenshot/
 * annotateLowConfidenceCharacters.js`) — dieser Index entspricht
 * direkt der Zeichenposition im zugehörigen Wert-String, da beide auf
 * dieselbe Weise (Zeichen für Zeichen, inkl. Leerzeichen) aufgebaut
 * werden. Wird genutzt, um beim Öffnen des Korrekturfelds den Cursor
 * dorthin zu positionieren, wo eine Prüfung am wahrscheinlichsten
 * nötig ist — reine Positionsermittlung, keine Vermutung über den
 * korrekten Zeichenwert.
 *
 * @param {{ char: string, uncertain: boolean }[] | undefined} chars
 * @returns {number} `-1`, wenn keine Zeichenliste vorliegt oder kein
 *   Zeichen als unsicher markiert ist.
 */
export function firstUncertainCharacterIndex(chars) {
  if (!Array.isArray(chars)) return -1;
  return chars.findIndex((c) => c && c.uncertain);
}
