// Empirisch aus einem echten humbee-Test-Screenshot abgeleitet: korrekt
// gelesene Zeichen liegen dort durchgehend bei 94–99 % Zeichen-
// Konfidenz, ein tatsächlich falsch gelesenes Zeichen lag sichtbar
// darunter (87 %). Reiner Zahlenvergleich mit Tesseract-eigenen
// Konfidenzwerten — keine Zeichen-Verwechslungstabelle, kein Raten,
// welches Zeichen korrekt wäre.
export const CHARACTER_CONFIDENCE_THRESHOLD = 90;

/**
 * Ordnet jedem Zeichen eines OCR-Werts zu, ob es mit ausreichender
 * Konfidenz gelesen wurde. Erwartet, dass `symbols` exakt die
 * Nicht-Leerzeichen-Zeichen von `text` in derselben Reihenfolge
 * abdeckt (so, wie `core/screenshot/extractRawFieldsFromOcrLines.js`
 * sie aus den beitragenden Wörtern zusammensetzt) — Leerzeichen
 * werden übersprungen und immer als sicher behandelt.
 *
 * @param {string} text
 * @param {{ text: string, confidence: number }[] | undefined} symbols
 * @returns {{ char: string, uncertain: boolean }[] | undefined}
 *   `undefined`, wenn keine (oder nicht ausreichend) zeichengenauen
 *   Daten vorliegen — dann bleibt die bisherige, grobkörnige
 *   Wort-/Zeilen-Konfidenzbewertung die einzige Grundlage.
 */
export function annotateLowConfidenceCharacters(text, symbols) {
  if (typeof text !== "string" || !text) return undefined;
  if (!Array.isArray(symbols) || symbols.length === 0) return undefined;

  const nonSpaceCharCount = text.replace(/\s/g, "").length;
  if (nonSpaceCharCount !== symbols.length) {
    // Zeichen und Symbole passen nicht zusammen (z. B. weil der Wert
    // nachträglich verändert wurde) — keine verlässliche Zuordnung
    // möglich.
    return undefined;
  }

  const chars = [];
  let symbolIndex = 0;

  for (const char of text) {
    if (/\s/.test(char)) {
      chars.push({ char, uncertain: false });
      continue;
    }
    const symbol = symbols[symbolIndex];
    symbolIndex += 1;
    chars.push({ char, uncertain: symbol.confidence < CHARACTER_CONFIDENCE_THRESHOLD });
  }

  return chars;
}
