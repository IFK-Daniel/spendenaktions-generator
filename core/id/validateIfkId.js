import { IFK_ID_PREFIX, IFK_ID_ALPHABET, IFK_ID_LENGTH } from "./generateIfkId.js";

const SUFFIX_PATTERN = new RegExp(`^[${IFK_ID_ALPHABET}]+$`);

/**
 * Prüft, ob eine gegebene IFK-ID formal gültig ist, und liefert eine
 * normalisierte (großgeschriebene) Fassung zurück.
 *
 * Geprüft werden ausschließlich syntaktische Eigenschaften — keine
 * Netzwerk-/Datenbankzugriffe, kein Abgleich gegen tatsächlich
 * vergebene IDs (dafür ist die künftige `reserveIfkId.js` zuständig):
 *   - Datentyp (muss ein String sein)
 *   - keine Leerzeichen (an beliebiger Stelle)
 *   - exakt sechs Zeichen (Präfix + drei Suffix-Zeichen)
 *   - Präfix "IFK" (Groß-/Kleinschreibung wird vor der Prüfung
 *     normalisiert, siehe unten)
 *   - Suffix ausschließlich aus `IFK_ID_ALPHABET` (siehe
 *     `generateIfkId.js`) — schließt insbesondere "I", "O", "0", "1"
 *     aus
 *
 * Kleinbuchstaben gelten als gültig, sofern sie nach Normalisierung
 * (Großschreibung) alle übrigen Regeln erfüllen — z. B. ist "ifk7qx"
 * gültig und wird zu "IFK7QX" normalisiert. Leerzeichen führen dagegen
 * immer zur Ungültigkeit, auch nach Normalisierung.
 *
 * @param {*} id Der zu prüfende Wert.
 * @returns {{ valid: boolean, normalized: string, reason: string }}
 *   `normalized` ist die großgeschriebene Fassung von `id`, sofern `id`
 *   ein String war (sonst ein leerer String). `reason` beschreibt bei
 *   `valid: false` den ersten gefundenen Grund; bei `valid: true` ist
 *   `reason` immer `"valid"`.
 */
export function validateIfkId(id) {
  if (typeof id !== "string") {
    return { valid: false, normalized: "", reason: "invalid-type" };
  }

  if (id.length === 0) {
    return { valid: false, normalized: "", reason: "empty" };
  }

  if (/\s/.test(id)) {
    return { valid: false, normalized: "", reason: "contains-whitespace" };
  }

  const normalized = id.toUpperCase();

  if (normalized.length !== IFK_ID_LENGTH) {
    return { valid: false, normalized, reason: "invalid-length" };
  }

  if (!normalized.startsWith(IFK_ID_PREFIX)) {
    return { valid: false, normalized, reason: "invalid-prefix" };
  }

  const suffix = normalized.slice(IFK_ID_PREFIX.length);
  if (!SUFFIX_PATTERN.test(suffix)) {
    return { valid: false, normalized, reason: "invalid-characters" };
  }

  return { valid: true, normalized, reason: "valid" };
}
