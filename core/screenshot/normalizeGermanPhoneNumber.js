const GERMAN_COUNTRY_CODE_PREFIX = /^(\+49|0049)[\s]*/;

/**
 * Wandelt eine deutsche Telefonnummer mit internationaler Vorwahl
 * (`+49…`/`0049…`) in die im Inland übliche Schreibweise mit
 * führender `0` um. Reine Präfixerkennung — nur die beiden bekannten
 * deutschen Landesvorwahl-Schreibweisen werden erkannt, jede andere
 * Vorwahl (z. B. `+43` Österreich, `+41` Schweiz) bleibt unverändert,
 * da das Muster dort gar nicht erst zutrifft.
 *
 * Beispiele:
 * - "+49 1523 3795099" → "01523 3795099"
 * - "0049 2103 986670" → "02103 986670"
 * - "+43 664 1234567" → unverändert (keine deutsche Vorwahl)
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeGermanPhoneNumber(value) {
  if (typeof value !== "string") return value;

  const match = value.match(GERMAN_COUNTRY_CODE_PREFIX);
  if (!match) return value;

  const rest = value.slice(match[0].length).trim();
  if (!rest) return value;

  return `0${rest}`;
}
