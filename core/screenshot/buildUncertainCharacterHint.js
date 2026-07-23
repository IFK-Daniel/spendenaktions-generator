/**
 * Baut einen kurzen, nutzerfreundlichen Hinweistext, welche(s) Zeichen
 * die OCR als unsicher eingestuft hat — reine Textbausteinerzeugung
 * aus bereits vorhandenen Konfidenzdaten (`core/screenshot/
 * annotateLowConfidenceCharacters.js`). Nennt ausschließlich, welches
 * Zeichen geprüft werden sollte — schlägt nie eine Ersetzung vor
 * (kein "U könnte J sein"), die Entscheidung bleibt beim Menschen
 * anhand des Originalausschnitts.
 *
 * @param {{ char: string, uncertain: boolean }[] | undefined} chars
 * @returns {string | null} `null`, wenn keine (unsicheren) Zeichen vorliegen.
 */
export function buildUncertainCharacterHint(chars) {
  if (!Array.isArray(chars)) return null;

  const uncertainChars = chars.filter((c) => c && c.uncertain && typeof c.char === "string" && c.char.trim());
  if (uncertainChars.length === 0) return null;

  const uniqueChars = [...new Set(uncertainChars.map((c) => c.char))];
  const quoted = uniqueChars.map((c) => `„${c}“`).join(", ");

  return uniqueChars.length === 1
    ? `Bitte insbesondere das erkannte ${quoted} prüfen.`
    : `Bitte insbesondere die erkannten Zeichen ${quoted} prüfen.`;
}
