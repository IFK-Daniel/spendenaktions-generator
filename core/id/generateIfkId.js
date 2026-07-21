/**
 * Format und Erzeugung von IFK-IDs.
 *
 * Format: Präfix "IFK" gefolgt von genau drei Zeichen aus einem
 * eingeschränkten Alphabet, z. B. "IFK7QX". Gesamtlänge: 6 Zeichen.
 *
 * Alphabet (`IFK_ID_ALPHABET`): Großbuchstaben und Ziffern, ohne
 * visuell leicht verwechselbare Zeichen. Ausgeschlossen sind:
 *   - "I" (Buchstabe) — leicht verwechselbar mit "1" und "l"
 *   - "O" (Buchstabe) — leicht verwechselbar mit "0"
 *   - "0" (Ziffer)    — leicht verwechselbar mit "O"
 *   - "1" (Ziffer)    — leicht verwechselbar mit "I" und "l"
 *
 * Diese Einschränkung dient der Lesbarkeit bei manueller Übertragung
 * (z. B. am Telefon, auf gedruckten Materialien) und ist unabhängig von
 * einer späteren Datenbank oder Reservierung (siehe `reserveIfkId.js`).
 * Dieses Modul prüft keine Eindeutigkeit gegen bereits vergebene IDs.
 */

export const IFK_ID_PREFIX = "IFK";
export const IFK_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const IFK_ID_SUFFIX_LENGTH = 3;
export const IFK_ID_LENGTH = IFK_ID_PREFIX.length + IFK_ID_SUFFIX_LENGTH;

/**
 * Erzeugt zufällig eine neue, formal gültige IFK-ID.
 *
 * Liefert ausschließlich Zeichen aus `IFK_ID_ALPHABET`, immer in
 * Großschreibung, ohne Leerzeichen oder Trennzeichen. Enthält keine
 * Eindeutigkeits-/Kollisionsprüfung gegen bereits vergebene IDs — dafür
 * ist die (noch nicht implementierte) Reservierung in
 * `reserveIfkId.js` zuständig.
 *
 * @returns {string} Eine neue IFK-ID, z. B. "IFK7QX".
 */
export function generateIfkId() {
  let suffix = "";
  for (let i = 0; i < IFK_ID_SUFFIX_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * IFK_ID_ALPHABET.length);
    suffix += IFK_ID_ALPHABET[index];
  }
  return `${IFK_ID_PREFIX}${suffix}`;
}
